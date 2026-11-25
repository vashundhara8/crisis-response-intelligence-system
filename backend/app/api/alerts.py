from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.security import ALL_ROLES, ROLE_ADMIN, ROLE_COORDINATOR, ROLE_RESOURCE_MANAGER, require_roles
from app.database.session import get_db
from app.models.alert import Alert
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.alert import AlertResponse, AuditLogResponse
from app.services.alert_service import sync_system_alerts
from app.services.audit_service import log_audit_event

router = APIRouter(tags=["Alerts & Audit Logs"])


@router.get("/alerts", response_model=List[AlertResponse])
def list_alerts(
    include_resolved: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    sync_system_alerts(db)
    query = db.query(Alert)
    if not include_resolved:
        query = query.filter(Alert.is_resolved == False)
    return query.order_by(desc(Alert.created_at)).all()


@router.post("/alerts/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_COORDINATOR, ROLE_RESOURCE_MANAGER])),
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert.is_resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    log_audit_event(
        db,
        action="ALERT_RESOLVED",
        entity_type="ALERT",
        entity_id=str(alert.id),
        user=current_user,
        details=f"Manually resolved alert '{alert.title}'.",
    )
    db.commit()
    db.refresh(alert)
    return alert


@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_COORDINATOR])),
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        query = query.filter(AuditLog.entity_type.ilike(f"%{entity_type}%"))
    return query.order_by(desc(AuditLog.created_at)).limit(limit).all()

