from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from app.models.user import User


def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    details: str,
    entity_id: Optional[str] = None,
    user: Optional[User] = None,
    username: Optional[str] = None,
    user_role: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        user_id=user.id if user else None,
        username=user.username if user else (username or "SYSTEM"),
        user_role=user.role if user else (user_role or "SYSTEM"),
        details=details,
    )
    db.add(entry)
    return entry

