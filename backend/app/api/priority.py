from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import ALL_ROLES, ROLE_ADMIN, require_roles
from app.database.session import get_db
from app.models.weights import PriorityWeights
from app.models.incident import Incident
from app.models.user import User
from app.schemas.priority import (
    PriorityCalculationRequest,
    PriorityCalculationResponse,
    PriorityWeightsSchema,
    PriorityWeightsResponse,
)
from app.engines.priority_engine import priority_engine
from app.services.audit_service import log_audit_event
from app.services.alert_service import sync_system_alerts
from app.core.config import settings

router = APIRouter(prefix="/priority", tags=["Priority Engine"])


@router.post("/calculate", response_model=PriorityCalculationResponse)
def calculate_priority_score(
    payload: PriorityCalculationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    custom_weights = priority_engine.get_active_weights_dict(db)
    res = priority_engine.calculate(
        severity=payload.severity,
        impact=payload.impact,
        urgency=payload.urgency,
        vulnerability=payload.vulnerability,
        accessibility=payload.accessibility,
        custom_weights=custom_weights,
    )

    return PriorityCalculationResponse(
        priority_score=res["priority_score"],
        priority_level=res["priority_level"],
        severity_contribution=res["severity_contribution"],
        impact_contribution=res["impact_contribution"],
        urgency_contribution=res["urgency_contribution"],
        vulnerability_contribution=res["vulnerability_contribution"],
        accessibility_contribution=res["accessibility_contribution"],
        breakdown=res["breakdown"],
        explanation=res["explanation"],
        formula_used=res["formula_used"],
        weights_applied=res["weights_applied"],
        last_recalculated_at=res["last_recalculated_at"],
    )


@router.get("/weights", response_model=PriorityWeightsResponse)
def get_demonstration_weights(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    weights_row = db.query(PriorityWeights).filter(PriorityWeights.is_active == True).first()
    if not weights_row:
        return PriorityWeightsResponse(
            severity_weight=settings.DEFAULT_WEIGHT_SEVERITY,
            impact_weight=settings.DEFAULT_WEIGHT_IMPACT,
            urgency_weight=settings.DEFAULT_WEIGHT_URGENCY,
            vulnerability_weight=settings.DEFAULT_WEIGHT_VULNERABILITY,
            accessibility_weight=settings.DEFAULT_WEIGHT_ACCESSIBILITY,
            total_weight=1.0,
            is_active=True,
        )

    total = (
        weights_row.severity_weight
        + weights_row.impact_weight
        + weights_row.urgency_weight
        + weights_row.vulnerability_weight
        + weights_row.accessibility_weight
    )

    return PriorityWeightsResponse(
        id=weights_row.id,
        severity_weight=weights_row.severity_weight,
        impact_weight=weights_row.impact_weight,
        urgency_weight=weights_row.urgency_weight,
        vulnerability_weight=weights_row.vulnerability_weight,
        accessibility_weight=weights_row.accessibility_weight,
        total_weight=round(total, 2),
        is_active=weights_row.is_active,
        updated_at=weights_row.updated_at,
    )


@router.put("/weights", response_model=PriorityWeightsResponse)
def update_demonstration_weights(
    payload: PriorityWeightsSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN])),
):
    total = (
        payload.severity_weight
        + payload.impact_weight
        + payload.urgency_weight
        + payload.vulnerability_weight
        + payload.accessibility_weight
    )
    if round(total, 2) != 1.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Demonstration weights must sum up to 1.0 (100%). Current sum: {total:.2f}",
        )

    weights_row = db.query(PriorityWeights).filter(PriorityWeights.is_active == True).first()
    if not weights_row:
        weights_row = PriorityWeights(is_active=True)
        db.add(weights_row)

    weights_row.severity_weight = payload.severity_weight
    weights_row.impact_weight = payload.impact_weight
    weights_row.urgency_weight = payload.urgency_weight
    weights_row.vulnerability_weight = payload.vulnerability_weight
    weights_row.accessibility_weight = payload.accessibility_weight
    db.commit()
    db.refresh(weights_row)

    # Recalculate priority scores and store PriorityScore snapshots for all incidents
    all_incidents = db.query(Incident).all()
    for inc in all_incidents:
        priority_engine.apply_to_incident(db, inc, record_snapshot=True)

    log_audit_event(
        db,
        action="PRIORITY_WEIGHTS_UPDATED",
        entity_type="PRIORITY_WEIGHTS",
        entity_id=str(weights_row.id),
        user=current_user,
        details=(
            f"Updated weights (S={payload.severity_weight}, I={payload.impact_weight}, "
            f"U={payload.urgency_weight}, V={payload.vulnerability_weight}, A={payload.accessibility_weight}) "
            f"and recalculated {len(all_incidents)} incidents."
        ),
    )
    db.commit()
    sync_system_alerts(db)

    return PriorityWeightsResponse(
        id=weights_row.id,
        severity_weight=weights_row.severity_weight,
        impact_weight=weights_row.impact_weight,
        urgency_weight=weights_row.urgency_weight,
        vulnerability_weight=weights_row.vulnerability_weight,
        accessibility_weight=weights_row.accessibility_weight,
        total_weight=1.0,
        is_active=weights_row.is_active,
        updated_at=weights_row.updated_at,
    )
