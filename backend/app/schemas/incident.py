from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict

VALID_INCIDENT_STATUSES = [
    "REPORTED",
    "UNDER_ASSESSMENT",
    "ACTIVE",
    "RESOURCES_ASSIGNED",
    "RESOLVED",
    "CLOSED",
]

LEGACY_STATUS_MAP = {
    "AWAITING_RESCUE": "ACTIVE",
    "IN_PROGRESS": "ACTIVE",
    "RESOURCE_ALLOCATED": "RESOURCES_ASSIGNED",
    "UNDER ASSESSMENT": "UNDER_ASSESSMENT",
    "RESOURCES ASSIGNED": "RESOURCES_ASSIGNED",
}


def normalize_incident_status(v: Optional[str]) -> str:
    if not v:
        return "REPORTED"
    key = v.strip().upper().replace("-", "_")
    key = LEGACY_STATUS_MAP.get(key, key.replace(" ", "_"))
    key = LEGACY_STATUS_MAP.get(key, key)
    if key not in VALID_INCIDENT_STATUSES:
        raise ValueError(f"Status must be one of: {', '.join(VALID_INCIDENT_STATUSES)}")
    return key


class IncidentBase(BaseModel):
    incident_code: Optional[str] = None
    title: Optional[str] = Field(default=None, max_length=255, description="Concise operational incident title")
    incident_type: str = Field(..., min_length=2, max_length=100, description="Type of incident, e.g. Building Collapse, Fire, Flood")
    description: str = Field(..., min_length=5, description="Operational incident description")
    location: str = Field(..., min_length=2, max_length=255, description="Geographical name / neighborhood")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")

    # Factors (0 - 100)
    severity: float = Field(..., ge=0.0, le=100.0, description="Severity rating 0-100")
    impact: float = Field(..., ge=0.0, le=100.0, description="Impact rating 0-100")
    urgency: float = Field(..., ge=0.0, le=100.0, description="Urgency rating 0-100")
    vulnerability: float = Field(..., ge=0.0, le=100.0, description="Vulnerability rating 0-100")
    accessibility: float = Field(..., ge=0.0, le=100.0, description="Accessibility rating 0-100")

    people_affected: int = Field(..., ge=0, description="Estimated number of affected individuals")
    injuries: int = Field(default=0, ge=0, description="Reported injuries")
    casualties: int = Field(default=0, ge=0, description="Reported casualties")
    status: Optional[str] = Field(default="REPORTED", description="Status of the incident")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> str:
        return normalize_incident_status(v)


class IncidentCreate(IncidentBase):
    pass


class IncidentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    incident_type: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, min_length=5)
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    severity: Optional[float] = Field(None, ge=0.0, le=100.0)
    impact: Optional[float] = Field(None, ge=0.0, le=100.0)
    urgency: Optional[float] = Field(None, ge=0.0, le=100.0)
    vulnerability: Optional[float] = Field(None, ge=0.0, le=100.0)
    accessibility: Optional[float] = Field(None, ge=0.0, le=100.0)
    people_affected: Optional[int] = Field(None, ge=0)
    injuries: Optional[int] = Field(None, ge=0)
    casualties: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_optional_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return normalize_incident_status(v)


class IncidentFactorBreakdown(BaseModel):
    factor_name: str
    raw_value: float
    weight_percentage: float
    weighted_score: float


class IncidentResponse(IncidentBase):
    id: int
    incident_code: str
    title: str
    priority_score: float
    priority_level: str
    last_recalculated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    factor_contributions: Optional[List[IncidentFactorBreakdown]] = None
    priority_explanation: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
