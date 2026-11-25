from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    ROLE_ADMIN,
    ROLE_VIEWER,
    create_access_token,
    get_current_user,
    get_optional_current_user,
    hash_password,
    require_roles,
    verify_password,
)
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserRoleUpdate,
    UserStatusUpdate,
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.get("/bootstrap-status")
def get_bootstrap_status(db: Session = Depends(get_db)):
    """Indicates whether an Administrator account already exists (for first-time setup UI)."""
    user_count = db.query(User).count()
    admin_exists = db.query(User).filter(User.role == ROLE_ADMIN).count() > 0
    return {"has_users": user_count > 0, "has_admin": admin_exists}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegister,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Register a user account.
    - If zero users exist in the system, the first user is promoted to Administrator for initial bootstrap.
    - Otherwise, public self-registration is restricted to Viewer role.
    - Only an authenticated Administrator may assign elevated roles during registration.
    """
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    existing_count = db.query(User).count()
    if existing_count == 0:
        assigned_role = ROLE_ADMIN
    elif current_user and current_user.role == ROLE_ADMIN:
        assigned_role = payload.role or ROLE_VIEWER
    else:
        if payload.role and payload.role != ROLE_VIEWER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only an Administrator can register users with elevated operational roles.",
            )
        assigned_role = ROLE_VIEWER

    user = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=assigned_role,
        is_active=True,
    )
    db.add(user)
    db.flush()
    log_audit_event(
        db,
        action="USER_REGISTERED",
        entity_type="USER",
        entity_id=str(user.id),
        user=current_user or user,
        details=f"Registered user '{user.username}' with role '{user.role}'.",
    )
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact an Administrator.",
        )

    token = create_access_token({"sub": user.username, "role": user.role, "uid": user.id})
    log_audit_event(
        db,
        action="USER_LOGIN",
        entity_type="USER",
        entity_id=str(user.id),
        user=user,
        details=f"User '{user.username}' authenticated successfully.",
    )
    db.commit()

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN])),
):
    return db.query(User).order_by(User.id).all()


@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    old_role = user.role
    user.role = payload.role
    log_audit_event(
        db,
        action="USER_ROLE_CHANGED",
        entity_type="USER",
        entity_id=str(user.id),
        user=current_user,
        details=f"Changed role for '{user.username}' from {old_role} to {payload.role}.",
    )
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN])),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own active account")
    user.is_active = payload.is_active
    log_audit_event(
        db,
        action="USER_STATUS_CHANGED",
        entity_type="USER",
        entity_id=str(user.id),
        user=current_user,
        details=f"Set account '{user.username}' active={payload.is_active}.",
    )
    db.commit()
    db.refresh(user)
    return user

