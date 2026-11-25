import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.security import ALL_ROLES, ROLE_ADMIN, ROLE_COORDINATOR, require_roles
from app.database.session import get_db
from app.models.incident import Incident
from app.models.allocation import IncidentStatusHistory
from app.models.user import User
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
    IncidentFactorBreakdown,
    normalize_incident_status,
)
from app.engines.priority_engine import priority_engine
from app.services.validation import data_processor
from app.services.audit_service import log_audit_event
from app.services.alert_service import sync_system_alerts
from app.core.logging import logger

router = APIRouter(prefix="/incidents", tags=["Incidents"])


def enrich_incident_response(incident: Incident, db: Session) -> IncidentResponse:
    custom_weights = priority_engine.get_active_weights_dict(db)
    calc = priority_engine.calculate(
        severity=incident.severity,
        impact=incident.impact,
        urgency=incident.urgency,
        vulnerability=incident.vulnerability,
        accessibility=incident.accessibility,
        custom_weights=custom_weights,
    )

    factor_breakdowns = [
        IncidentFactorBreakdown(
            factor_name=b["factor"],
            raw_value=b["value"],
            weight_percentage=b["weight_pct"],
            weighted_score=b["contribution"],
        )
        for b in calc["breakdown"]
    ]

    resp = IncidentResponse.model_validate(incident)
    resp.factor_contributions = factor_breakdowns
    resp.priority_explanation = calc["explanation"]
    return resp


@router.get("", response_model=List[IncidentResponse])
def get_incidents(
    priority: Optional[str] = Query(None, description="Filter by CRITICAL, HIGH, MODERATE, LOW"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    incident_type: Optional[str] = Query(None, description="Filter by incident type"),
    search: Optional[str] = Query(None, description="Search title, description, location, or code"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    query = db.query(Incident)

    if priority:
        p_norm = "MODERATE" if priority.upper() == "MEDIUM" else priority.upper()
        query = query.filter(Incident.priority_level == p_norm)
    if status_filter:
        query = query.filter(Incident.status == normalize_incident_status(status_filter))
    if incident_type:
        query = query.filter(Incident.incident_type.ilike(f"%{incident_type}%"))
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Incident.title.ilike(search_fmt))
            | (Incident.description.ilike(search_fmt))
            | (Incident.location.ilike(search_fmt))
            | (Incident.incident_code.ilike(search_fmt))
            | (Incident.incident_type.ilike(search_fmt))
        )

    incidents = query.order_by(desc(Incident.priority_score), desc(Incident.created_at)).all()
    return [enrich_incident_response(inc, db) for inc in incidents]


@router.get("/prioritized", response_model=List[IncidentResponse])
def get_prioritized_incidents(
    limit: int = Query(20, ge=1, le=100),
    active_only: bool = Query(True, description="Filter only unresolved incidents"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    query = db.query(Incident)
    if active_only:
        query = query.filter(Incident.status.notin_(["RESOLVED", "CLOSED"]))

    incidents = query.order_by(desc(Incident.priority_score)).limit(limit).all()
    return [enrich_incident_response(inc, db) for inc in incidents]


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_by_id(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident with ID {incident_id} not found")
    return enrich_incident_response(incident, db)


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_COORDINATOR])),
):
    raw_dict = payload.model_dump()
    cleaned = data_processor.validate_and_normalize_incident_data(raw_dict)

    if not cleaned.get("incident_code"):
        cleaned["incident_code"] = f"INC-BLR-{str(uuid.uuid4())[:6].upper()}"

    existing = db.query(Incident).filter(Incident.incident_code == cleaned["incident_code"]).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incident code {cleaned['incident_code']} already exists",
        )

    new_incident = Incident(
        incident_code=cleaned["incident_code"],
        title=cleaned["title"],
        incident_type=cleaned["incident_type"],
        description=cleaned["description"],
        location=cleaned["location"],
        latitude=cleaned["latitude"],
        longitude=cleaned["longitude"],
        severity=cleaned["severity"],
        impact=cleaned["impact"],
        urgency=cleaned["urgency"],
        vulnerability=cleaned["vulnerability"],
        accessibility=cleaned["accessibility"],
        people_affected=cleaned["people_affected"],
        injuries=cleaned["injuries"],
        casualties=cleaned["casualties"],
        status=normalize_incident_status(cleaned.get("status", "REPORTED")),
    )
    db.add(new_incident)
    db.flush()

    priority_engine.apply_to_incident(db, new_incident, record_snapshot=True)

    history = IncidentStatusHistory(
        incident_id=new_incident.id,
        previous_status=None,
        new_status=new_incident.status,
        changed_by=current_user.username,
        notes="Initial incident creation and automated priority scoring",
    )
    db.add(history)
    log_audit_event(
        db,
        action="INCIDENT_CREATED",
        entity_type="INCIDENT",
        entity_id=str(new_incident.id),
        user=current_user,
        details=f"Created incident {new_incident.incident_code} ({new_incident.title}) score={new_incident.priority_score}",
    )
    db.commit()
    db.refresh(new_incident)
    sync_system_alerts(db)

    logger.info(
        f"Ingested incident {new_incident.incident_code} by {current_user.username} - "
        f"Score: {new_incident.priority_score} ({new_incident.priority_level})"
    )
    return enrich_incident_response(new_incident, db)


@router.put("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_COORDINATOR])),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident with ID {incident_id} not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] is not None:
        new_status = normalize_incident_status(update_data["status"])
        if new_status != incident.status:
            old_status = incident.status
            history = IncidentStatusHistory(
                incident_id=incident.id,
                previous_status=old_status,
                new_status=new_status,
                changed_by=current_user.username,
                notes=f"Status transitioned from {old_status} to {new_status}",
            )
            db.add(history)
            incident.status = new_status

    for key, val in update_data.items():
        if key != "status":
            setattr(incident, key, val)

    # Recalculate priority using active DB weights
    priority_engine.apply_to_incident(db, incident, record_snapshot=True)

    log_audit_event(
        db,
        action="INCIDENT_UPDATED",
        entity_type="INCIDENT",
        entity_id=str(incident.id),
        user=current_user,
        details=f"Updated incident {incident.incident_code}; fields={list(update_data.keys())}; score={incident.priority_score}",
    )
    db.commit()
    db.refresh(incident)
    sync_system_alerts(db)
    return enrich_incident_response(incident, db)


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_COORDINATOR])),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident with ID {incident_id} not found")
    code = incident.incident_code
    db.delete(incident)
    log_audit_event(
        db,
        action="INCIDENT_DELETED",
        entity_type="INCIDENT",
        entity_id=str(incident_id),
        user=current_user,
        details=f"Deleted incident {code}",
    )
    db.commit()
    sync_system_alerts(db)
    return None
