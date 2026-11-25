from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import ALL_ROLES, ROLE_ADMIN, ROLE_COORDINATOR, ROLE_RESOURCE_MANAGER, require_roles
from app.database.session import get_db
from app.models.incident import Incident
from app.models.resource import Resource
from app.models.allocation import ResourceAllocation, IncidentStatusHistory
from app.models.user import User
from app.schemas.allocation import (
    IncidentRecommendationResponse,
    AllocationRequest,
    AllocationResponse,
    AllocationHistoryItem,
)
from app.engines.allocation_engine import allocation_engine
from app.services.validation import data_processor
from app.services.audit_service import log_audit_event
from app.services.alert_service import sync_system_alerts
from app.api.incidents import enrich_incident_response
from app.core.logging import logger

router = APIRouter(prefix="/allocation", tags=["Resource Allocation"])


@router.get("/recommend/{incident_id}", response_model=IncidentRecommendationResponse)
def get_resource_recommendation(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident {incident_id} not found")

    resources = db.query(Resource).all()
    if not resources:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No emergency resources registered in system")

    ranked = allocation_engine.rank_resources(incident, resources)
    compatible_available = [
        r for r in ranked
        if r.is_compatible and r.availability_status == "AVAILABLE" and r.resource.assigned_incident_id is None
    ]

    enriched_incident = enrich_incident_response(incident, db)

    return IncidentRecommendationResponse(
        incident=enriched_incident,
        recommendations=ranked,
        total_candidates_evaluated=len(ranked),
        compatible_available_count=len(compatible_available),
        decision_support_note=(
            "Heuristic Multi-Criteria Decision Support Model. Recommendations evaluate Haversine proximity, "
            "ingress accessibility penalty, hazard-resource compatibility, unit capacity, and availability. "
            "Authorized human coordinators retain final accept, reject, or override authority."
        ),
    )


@router.get("/history", response_model=List[AllocationHistoryItem])
def get_allocation_history(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    allocs = (
        db.query(ResourceAllocation)
        .order_by(ResourceAllocation.allocated_at.desc())
        .limit(limit)
        .all()
    )
    items: List[AllocationHistoryItem] = []
    for a in allocs:
        inc = db.query(Incident).filter(Incident.id == a.incident_id).first()
        res = db.query(Resource).filter(Resource.id == a.resource_id).first()
        if not inc or not res:
            continue
        items.append(
            AllocationHistoryItem(
                id=a.id,
                incident_id=inc.id,
                incident_code=inc.incident_code,
                incident_title=inc.title or f"{inc.incident_type} — {inc.location}",
                incident_location=inc.location,
                resource_id=res.id,
                resource_code=res.resource_code,
                resource_name=res.name,
                resource_type=res.resource_type,
                distance_km=a.distance_km,
                suitability_score=a.suitability_score,
                decision_status=a.decision_status,
                status=a.status,
                is_override=a.is_override,
                decided_by=a.decided_by,
                recommendation_reason=a.recommendation_reason,
                allocation_notes=a.allocation_notes,
                allocated_at=a.allocated_at,
                released_at=a.released_at,
            )
        )
    return items


@router.post("", response_model=AllocationResponse, status_code=status.HTTP_200_OK)
def execute_resource_allocation(
    payload: AllocationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_COORDINATOR])),
):
    incident = db.query(Incident).filter(Incident.id == payload.incident_id).first()
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident {payload.incident_id} not found")

    resource = db.query(Resource).filter(Resource.id == payload.resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Resource {payload.resource_id} not found")

    action = (payload.action or "ACCEPT").strip().upper()
    if action not in {"ACCEPT", "REJECT", "OVERRIDE"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Action must be ACCEPT, REJECT, or OVERRIDE")

    eval_item = allocation_engine.evaluate_resource_for_incident(incident, resource)
    dist_km = eval_item.distance_km

    # Reject flow: logs coordinator rejection without dispatching resource
    if action == "REJECT":
        allocation = ResourceAllocation(
            incident_id=incident.id,
            resource_id=resource.id,
            distance_km=dist_km,
            suitability_score=eval_item.overall_suitability_score,
            recommendation_reason=eval_item.explanation,
            allocation_notes=payload.notes or f"Coordinator rejected recommendation for {resource.resource_code}",
            decision_status="REJECTED",
            is_override=False,
            decided_by=current_user.username,
            status="REJECTED",
        )
        db.add(allocation)
        log_audit_event(
            db,
            action="ALLOCATION_REJECTED",
            entity_type="ALLOCATION",
            entity_id=str(incident.id),
            user=current_user,
            details=f"Rejected {resource.resource_code} for {incident.incident_code}: {allocation.allocation_notes}",
        )
        db.commit()
        db.refresh(allocation)
        return AllocationResponse(
            allocation_id=allocation.id,
            incident_id=incident.id,
            incident_code=incident.incident_code,
            incident_status=incident.status,
            resource_id=resource.id,
            resource_code=resource.resource_code,
            resource_status=resource.availability_status,
            distance_km=dist_km,
            suitability_score=eval_item.overall_suitability_score,
            decision_status="REJECTED",
            is_override=False,
            recommendation_reason=eval_item.explanation,
            decided_by=current_user.username,
            allocated_at=allocation.allocated_at,
            message=f"Recommendation rejected for {resource.name} ({resource.resource_code}).",
        )

    # Prevent unavailable or already-assigned resource dispatch
    if resource.availability_status != "AVAILABLE" or resource.assigned_incident_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Resource {resource.resource_code} is currently '{resource.availability_status}' "
                f"and cannot be assigned. Release existing assignment first."
            ),
        )

    # Prevent duplicate active allocation for the same incident + resource
    dup_active = (
        db.query(ResourceAllocation)
        .filter(
            ResourceAllocation.incident_id == incident.id,
            ResourceAllocation.resource_id == resource.id,
            ResourceAllocation.status == "ACTIVE",
        )
        .first()
    )
    if dup_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Resource {resource.resource_code} already has an active assignment to {incident.incident_code}.",
        )

    # Validate capacity
    if resource.capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Resource {resource.resource_code} has zero operational capacity.",
        )

    is_override = payload.is_override or (action == "OVERRIDE")
    if not eval_item.is_compatible and not is_override:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Resource type '{resource.resource_type}' is not a primary compatible match for "
                f"'{incident.incident_type}'. Use manual coordinator override with justification to dispatch."
            ),
        )

    # Transition resource & incident state
    resource.availability_status = "DEPLOYED"
    resource.assigned_incident_id = incident.id

    prev_status = incident.status
    if incident.status not in ["RESOLVED", "CLOSED"]:
        incident.status = "RESOURCES_ASSIGNED"

    decision_status = "OVERRIDDEN" if is_override else "ACCEPTED"
    allocation = ResourceAllocation(
        incident_id=incident.id,
        resource_id=resource.id,
        distance_km=dist_km,
        suitability_score=eval_item.overall_suitability_score,
        recommendation_reason=eval_item.explanation,
        allocation_notes=payload.notes or f"Dispatched {resource.name} to {incident.location} ({dist_km} km)",
        decision_status=decision_status,
        is_override=is_override,
        decided_by=current_user.username,
        status="ACTIVE",
    )
    db.add(allocation)

    if prev_status != incident.status:
        db.add(
            IncidentStatusHistory(
                incident_id=incident.id,
                previous_status=prev_status,
                new_status=incident.status,
                changed_by=current_user.username,
                notes=f"Allocated {resource.name} ({resource.resource_code}) - Distance: {dist_km} km [{decision_status}]",
            )
        )

    log_audit_event(
        db,
        action="ALLOCATION_OVERRIDDEN" if is_override else "ALLOCATION_ACCEPTED",
        entity_type="ALLOCATION",
        entity_id=str(incident.id),
        user=current_user,
        details=(
            f"Assigned {resource.resource_code} to {incident.incident_code} "
            f"(dist={dist_km} km, suitability={eval_item.overall_suitability_score}, override={is_override})"
        ),
    )

    db.commit()
    db.refresh(allocation)
    sync_system_alerts(db)

    logger.info(f"Allocated resource {resource.resource_code} to incident {incident.incident_code} ({decision_status})")

    return AllocationResponse(
        allocation_id=allocation.id,
        incident_id=incident.id,
        incident_code=incident.incident_code,
        incident_status=incident.status,
        resource_id=resource.id,
        resource_code=resource.resource_code,
        resource_status=resource.availability_status,
        distance_km=dist_km,
        suitability_score=eval_item.overall_suitability_score,
        decision_status=decision_status,
        is_override=is_override,
        recommendation_reason=eval_item.explanation,
        decided_by=current_user.username,
        allocated_at=allocation.allocated_at,
        message=f"{resource.name} assigned to {incident.incident_code} ({incident.location}).",
    )


@router.post("/{allocation_id}/release", response_model=AllocationResponse)
def release_allocation(
    allocation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_COORDINATOR, ROLE_RESOURCE_MANAGER])),
):
    allocation = db.query(ResourceAllocation).filter(ResourceAllocation.id == allocation_id).first()
    if not allocation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation record not found")
    if allocation.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only ACTIVE allocations can be released")

    incident = db.query(Incident).filter(Incident.id == allocation.incident_id).first()
    resource = db.query(Resource).filter(Resource.id == allocation.resource_id).first()
    now = datetime.now(timezone.utc)

    allocation.status = "RELEASED"
    allocation.decision_status = "RELEASED"
    allocation.released_at = now

    if resource:
        resource.availability_status = "AVAILABLE"
        resource.assigned_incident_id = None

    if incident:
        remaining_active = (
            db.query(ResourceAllocation)
            .filter(
                ResourceAllocation.incident_id == incident.id,
                ResourceAllocation.id != allocation.id,
                ResourceAllocation.status == "ACTIVE",
            )
            .count()
        )
        if remaining_active == 0 and incident.status == "RESOURCES_ASSIGNED":
            prev_status = incident.status
            incident.status = "ACTIVE"
            db.add(
                IncidentStatusHistory(
                    incident_id=incident.id,
                    previous_status=prev_status,
                    new_status="ACTIVE",
                    changed_by=current_user.username,
                    notes=f"Released {resource.resource_code if resource else 'unit'}; incident returned to ACTIVE.",
                )
            )

    log_audit_event(
        db,
        action="ALLOCATION_RELEASED",
        entity_type="ALLOCATION",
        entity_id=str(allocation.id),
        user=current_user,
        details=f"Released resource {resource.resource_code if resource else allocation.resource_id} from incident {incident.incident_code if incident else allocation.incident_id}.",
    )

    db.commit()
    db.refresh(allocation)
    sync_system_alerts(db)

    return AllocationResponse(
        allocation_id=allocation.id,
        incident_id=incident.id if incident else allocation.incident_id,
        incident_code=incident.incident_code if incident else "",
        incident_status=incident.status if incident else "",
        resource_id=resource.id if resource else allocation.resource_id,
        resource_code=resource.resource_code if resource else "",
        resource_status=resource.availability_status if resource else "AVAILABLE",
        distance_km=allocation.distance_km,
        suitability_score=allocation.suitability_score,
        decision_status="RELEASED",
        is_override=allocation.is_override,
        recommendation_reason=allocation.recommendation_reason,
        decided_by=current_user.username,
        allocated_at=allocation.allocated_at,
        released_at=allocation.released_at,
        message=f"Resource {resource.resource_code if resource else ''} released and returned to AVAILABLE pool.",
    )
