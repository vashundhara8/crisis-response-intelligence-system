from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


VALID_ROLES = ["Administrator", "Emergency Coordinator", "Resource Manager", "Viewer"]


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=80, pattern=r"^[a-zA-Z0-9_.-]+$")
    email: str = Field(..., min_length=5, max_length=180)
    full_name: str = Field(..., min_length=2, max_length=150)
    password: str = Field(..., min_length=8, max_length=128)
    role: Optional[str] = Field(default="Viewer")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address format")
        return v.strip().lower()

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> str:
        if not v:
            return "Viewer"
        for r in VALID_ROLES:
            if r.lower() == v.strip().lower():
                return r
        raise ValueError(f"Role must be one of: {', '.join(VALID_ROLES)}")


class UserLogin(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse


class UserRoleUpdate(BaseModel):
    role: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        for r in VALID_ROLES:
            if r.lower() == v.strip().lower():
                return r
        raise ValueError(f"Role must be one of: {', '.join(VALID_ROLES)}")


class UserStatusUpdate(BaseModel):
    is_active: bool

