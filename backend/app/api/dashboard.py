from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.security import ALL_ROLES, ROLE_ADMIN, require_roles
from app.database.session import get_db
from app.database.seed import seed_database
from app.models.incident import Incident
from app.models.resource import Resource
from app.models.alert import Alert
from app.models.user import User
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    MetricCards,
    ResourceTypeCount,
    RecentAlert,
    RecommendedActionItem,
    DashboardMapResponse,
    MapIncidentMarker,
    MapResourceMarker,
)
from app.schemas.resource import VALID_RESOURCE_TYPES
from app.engines.allocation_engine import allocation_engine
from app.services.analytics_service import analytics_service
from app.services.audit_service import log_audit_event
from app.services.alert_service import sync_system_alerts
from app.api.incidents import enrich_incident_response

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    incidents = db.query(Incident).all()
    resources = db.query(Resource).all()

    active_list = [i for i in incidents if i.status not in ["RESOLVED", "CLOSED"]]
    active_incidents = len(active_list)
    critical_incidents = len([i for i in active_list if i.priority_level == "CRITICAL"])
    high_incidents = len([i for i in active_list if i.priority_level == "HIGH"])
    moderate_incidents = len([i for i in active_list if i.priority_level in ["MODERATE", "MEDIUM"]])
    low_incidents = len([i for i in active_list if i.priority_level == "LOW"])

    total_resources = len(resources)
    avail_list = [r for r in resources if r.availability_status == "AVAILABLE" and r.assigned_incident_id is None]
    available_resources = len(avail_list)
    available_ambulances = len([r for r in avail_list if r.resource_type == "Ambulance"])
    available_rescue_teams = len([r for r in avail_list if r.resource_type == "Rescue Team"])
    available_medical_units = len([r for r in avail_list if r.resource_type == "Medical Unit"])
    deployed_resources = len([r for r in resources if r.availability_status in ["DEPLOYED", "ASSIGNED"]])
    pending_resource_requests = len([i for i in active_list if i.status in ["REPORTED", "UNDER_ASSESSMENT", "ACTIVE"]])

    scores = [i.priority_score for i in incidents]
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
    total_affected = sum(i.people_affected for i in incidents)

    metrics = MetricCards(
        active_incidents=active_incidents,
        critical_incidents=critical_incidents,
        high_incidents=high_incidents,
        moderate_incidents=moderate_incidents,
        low_incidents=low_incidents,
        total_resources=total_resources,
        available_resources=available_resources,
        available_ambulances=available_ambulances,
        available_rescue_teams=available_rescue_teams,
        available_medical_units=available_medical_units,
        deployed_resources=deployed_resources,
        pending_resource_requests=pending_resource_requests,
        average_priority_score=avg_score,
        total_people_affected=total_affected,
    )

    # Resource type breakdown for all 6 types
    resource_summary = []
    for rt in VALID_RESOURCE_TYPES:
        subset = [r for r in resources if r.resource_type.lower() == rt.lower()]
        resource_summary.append(
            ResourceTypeCount(
                resource_type=rt,
                total=len(subset),
                available=len([r for r in subset if r.availability_status == "AVAILABLE" and r.assigned_incident_id is None]),
                deployed=len([r for r in subset if r.availability_status in ["DEPLOYED", "ASSIGNED"]]),
                unavailable=len([r for r in subset if r.availability_status in ["UNAVAILABLE", "UNDER_MAINTENANCE"]]),
            )
        )

    # Top prioritized active incidents
    top_incidents = (
        db.query(Incident)
        .filter(Incident.status.notin_(["RESOLVED", "CLOSED"]))
        .order_by(desc(Incident.priority_score))
        .limit(8)
        .all()
    )
    enriched_top = [enrich_incident_response(i, db) for i in top_incidents]

    # Recommended Actions for top unassigned / active incidents
    recommended_actions = []
    for inc in top_incidents[:5]:
        ranked = allocation_engine.rank_resources(inc, resources)
        best = next(
            (r for r in ranked if r.is_compatible and r.availability_status == "AVAILABLE" and r.resource.assigned_incident_id is None),
            None,
        )
        if best:
            recommended_actions.append(
                RecommendedActionItem(
                    incident_id=inc.id,
                    incident_code=inc.incident_code,
                    incident_title=inc.title or f"{inc.incident_type} — {inc.location}",
                    priority_level=inc.priority_level,
                    priority_score=inc.priority_score,
                    recommended_resource_id=best.resource.id,
                    recommended_resource_code=best.resource.resource_code,
                    recommended_resource_name=best.resource.name,
                    recommended_resource_type=best.resource_type,
                    distance_km=best.distance_km,
                    suitability_score=best.overall_suitability_score,
                    rationale=best.explanation,
                )
            )
        else:
            recommended_actions.append(
                RecommendedActionItem(
                    incident_id=inc.id,
                    incident_code=inc.incident_code,
                    incident_title=inc.title or f"{inc.incident_type} — {inc.location}",
                    priority_level=inc.priority_level,
                    priority_score=inc.priority_score,
                    rationale="No compatible unit currently available. Review fleet release or manual coordinator override.",
                )
            )

    # Recent Alerts from Alert table (fallback to top incidents if empty)
    open_alerts = (
        db.query(Alert)
        .filter(Alert.is_resolved == False)
        .order_by(desc(Alert.created_at))
        .limit(6)
        .all()
    )
    recent_alerts = []
    for al in open_alerts:
        inc = db.query(Incident).filter(Incident.id == al.incident_id).first() if al.incident_id else None
        recent_alerts.append(
            RecentAlert(
                id=al.id,
                timestamp=al.created_at.strftime("%H:%M:%S") if al.created_at else "Now",
                alert_type=al.alert_type,
                severity=al.severity,
                incident_code=inc.incident_code if inc else None,
                title=al.title,
                message=al.message,
                priority_level=inc.priority_level if inc else al.severity,
                priority_score=inc.priority_score if inc else 0.0,
                location=inc.location if inc else "System Wide",
                status="OPEN",
            )
        )

    analytics_overview = analytics_service.get_overview_analytics(db)

    return DashboardSummaryResponse(
        metrics=metrics,
        prioritized_incidents=enriched_top,
        resource_summary=resource_summary,
        recent_alerts=recent_alerts,
        recommended_actions=recommended_actions,
        incidents_by_type=analytics_overview["incidents_by_type"],
        incidents_by_priority=analytics_overview["incidents_by_priority"],
        resource_utilization=analytics_overview["resource_utilization"],
    )


@router.get("/map", response_model=DashboardMapResponse)
def get_dashboard_map_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    incidents = db.query(Incident).all()
    resources = db.query(Resource).all()
    inc_code_by_id = {i.id: i.incident_code for i in incidents}

    inc_markers = [
        MapIncidentMarker(
            id=i.id,
            incident_code=i.incident_code,
            title=i.title or f"{i.incident_type} — {i.location}",
            incident_type=i.incident_type,
            location=i.location,
            latitude=i.latitude,
            longitude=i.longitude,
            priority_score=i.priority_score,
            priority_level="MODERATE" if i.priority_level == "MEDIUM" else i.priority_level,
            severity=i.severity,
            people_affected=i.people_affected,
            injuries=i.injuries or 0,
            casualties=i.casualties or 0,
            status=i.status,
        )
        for i in incidents
    ]

    res_markers = [
        MapResourceMarker(
            id=r.id,
            resource_code=r.resource_code,
            resource_type=r.resource_type,
            name=r.name,
            latitude=r.latitude,
            longitude=r.longitude,
            capacity=r.capacity,
            availability_status=r.availability_status,
            current_location=r.current_location,
            assigned_incident_id=r.assigned_incident_id,
            assigned_incident_code=inc_code_by_id.get(r.assigned_incident_id) if r.assigned_incident_id else None,
        )
        for r in resources
    ]

    return DashboardMapResponse(incidents=inc_markers, resources=res_markers)


@router.post("/reset-demo", status_code=status.HTTP_200_OK)
def reset_demonstration_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN])),
):
    seed_database(db, force_reset=True)
    log_audit_event(
        db,
        action="DEMO_DATA_RESET",
        entity_type="SYSTEM",
        user=current_user,
        details="Reset simulated Bengaluru emergency demonstration dataset.",
    )
    db.commit()
    sync_system_alerts(db)
    return {"message": "Demonstration database successfully reset with simulated Bengaluru emergency scenarios."}
