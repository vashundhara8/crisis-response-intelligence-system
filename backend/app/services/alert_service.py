from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.incident import Incident
from app.models.resource import Resource
from app.models.allocation import ResourceAllocation


def _upsert_alert(
    db: Session,
    alert_type: str,
    severity: str,
    title: str,
    message: str,
    incident_id: int = None,
    resource_id: int = None,
):
    query = db.query(Alert).filter(
        Alert.alert_type == alert_type,
        Alert.is_resolved == False,
    )
    if incident_id is not None:
        query = query.filter(Alert.incident_id == incident_id)
    else:
        query = query.filter(Alert.incident_id.is_(None))
    if resource_id is not None:
        query = query.filter(Alert.resource_id == resource_id)
    else:
        query = query.filter(Alert.resource_id.is_(None))

    existing = query.first()
    if existing:
        existing.severity = severity
        existing.title = title
        existing.message = message
        return

    db.add(
        Alert(
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            incident_id=incident_id,
            resource_id=resource_id,
            is_resolved=False,
        )
    )


def sync_system_alerts(db: Session) -> None:
    """
    Evaluate live database state to maintain operational alerts for:
    - Critical incidents & unassigned critical incidents
    - Resource shortages by fleet type
    - Unavailable / under-maintenance resources
    - Pending allocation approvals
    """
    now = datetime.now(timezone.utc)
    active_incidents = db.query(Incident).filter(Incident.status.notin_(["RESOLVED", "CLOSED"])).all()
    resources = db.query(Resource).all()
    active_alloc_inc_ids = {
        a.incident_id
        for a in db.query(ResourceAllocation).filter(ResourceAllocation.status == "ACTIVE").all()
    }

    active_critical_ids = set()
    unassigned_critical_ids = set()
    pending_alloc_ids = set()

    for inc in active_incidents:
        has_alloc = inc.id in active_alloc_inc_ids or inc.status == "RESOURCES_ASSIGNED"
        if inc.priority_level == "CRITICAL":
            active_critical_ids.add(inc.id)
            _upsert_alert(
                db,
                alert_type="CRITICAL_INCIDENT",
                severity="CRITICAL",
                title=f"Critical Incident: {inc.incident_code} ({inc.priority_score}/100)",
                message=f"{inc.title or inc.incident_type} at {inc.location} affects {inc.people_affected} people.",
                incident_id=inc.id,
            )
            if not has_alloc:
                unassigned_critical_ids.add(inc.id)
                _upsert_alert(
                    db,
                    alert_type="UNASSIGNED_CRITICAL",
                    severity="CRITICAL",
                    title=f"Unassigned Critical Incident: {inc.incident_code}",
                    message=f"{inc.title or inc.incident_type} at {inc.location} has no assigned emergency resource.",
                    incident_id=inc.id,
                )

        if not has_alloc and inc.status in ["REPORTED", "UNDER_ASSESSMENT", "ACTIVE"]:
            pending_alloc_ids.add(inc.id)
            _upsert_alert(
                db,
                alert_type="PENDING_ALLOCATION",
                severity="HIGH" if inc.priority_level in ["CRITICAL", "HIGH"] else "MODERATE",
                title=f"Pending Resource Approval: {inc.incident_code}",
                message=f"{inc.incident_type} at {inc.location} is awaiting coordinator allocation decision.",
                incident_id=inc.id,
            )

    # Unavailable or maintenance resources
    unavailable_res_ids = set()
    for res in resources:
        if res.availability_status in ["UNAVAILABLE", "UNDER_MAINTENANCE"]:
            unavailable_res_ids.add(res.id)
            _upsert_alert(
                db,
                alert_type="UNAVAILABLE_RESOURCE",
                severity="MODERATE",
                title=f"Unit {res.availability_status.replace('_', ' ').title()}: {res.resource_code}",
                message=f"{res.name} ({res.resource_type}) at {res.current_location} is offline.",
                resource_id=res.id,
            )

    # Resource shortage check per type
    fleet_types = ["Ambulance", "Rescue Team", "Medical Unit", "Fire and Rescue Unit", "Emergency Supply Unit", "Shelter"]
    shortage_titles = set()
    for ftype in fleet_types:
        subset = [r for r in resources if r.resource_type == ftype]
        avail = [r for r in subset if r.availability_status == "AVAILABLE" and r.assigned_incident_id is None]
        if subset and len(avail) == 0:
            title = f"Resource Shortage: {ftype}"
            shortage_titles.add(title)
            _upsert_alert(
                db,
                alert_type="RESOURCE_SHORTAGE",
                severity="HIGH",
                title=title,
                message=f"All {len(subset)} {ftype} units are currently deployed, assigned, or unavailable.",
            )

    # Auto-resolve stale alerts that no longer apply
    open_alerts = db.query(Alert).filter(Alert.is_resolved == False).all()
    for alert in open_alerts:
        resolve = False
        if alert.alert_type == "CRITICAL_INCIDENT" and alert.incident_id not in active_critical_ids:
            resolve = True
        elif alert.alert_type == "UNASSIGNED_CRITICAL" and alert.incident_id not in unassigned_critical_ids:
            resolve = True
        elif alert.alert_type == "PENDING_ALLOCATION" and alert.incident_id not in pending_alloc_ids:
            resolve = True
        elif alert.alert_type == "UNAVAILABLE_RESOURCE" and alert.resource_id not in unavailable_res_ids:
            resolve = True
        elif alert.alert_type == "RESOURCE_SHORTAGE" and alert.title not in shortage_titles:
            resolve = True

        if resolve:
            alert.is_resolved = True
            alert.resolved_at = now

    db.commit()

