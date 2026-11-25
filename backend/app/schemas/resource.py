from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

VALID_RESOURCE_TYPES = [
    "Ambulance",
    "Rescue Team",
    "Medical Unit",
    "Fire and Rescue Unit",
    "Emergency Supply Unit",
    "Shelter",
]

RESOURCE_TYPE_ALIASES = {
    "ambulances": "Ambulance",
    "ambulance": "Ambulance",
    "rescue teams": "Rescue Team",
    "rescue team": "Rescue Team",
    "medical units": "Medical Unit",
    "medical unit": "Medical Unit",
    "fire and rescue units": "Fire and Rescue Unit",
    "fire and rescue unit": "Fire and Rescue Unit",
    "fire & rescue unit": "Fire and Rescue Unit",
    "fire & rescue units": "Fire and Rescue Unit",
    "emergency supply units": "Emergency Supply Unit",
    "emergency supply unit": "Emergency Supply Unit",
    "shelters": "Shelter",
    "shelter": "Shelter",
}

VALID_RESOURCE_STATUSES = [
    "AVAILABLE",
    "ASSIGNED",
    "DEPLOYED",
    "UNAVAILABLE",
    "UNDER_MAINTENANCE",
]

RESOURCE_STATUS_ALIASES = {
    "MAINTENANCE": "UNDER_MAINTENANCE",
    "UNDER MAINTENANCE": "UNDER_MAINTENANCE",
    "EN_ROUTE": "DEPLOYED",
    "ON_SCENE": "DEPLOYED",
}


def normalize_resource_type(v: str) -> str:
    cleaned = v.strip().lower()
    if cleaned in RESOURCE_TYPE_ALIASES:
        return RESOURCE_TYPE_ALIASES[cleaned]
    for vt in VALID_RESOURCE_TYPES:
        if vt.lower() == cleaned:
            return vt
    raise ValueError(f"Resource type must be one of: {', '.join(VALID_RESOURCE_TYPES)}")


def normalize_resource_status(v: Optional[str]) -> str:
    if not v:
        return "AVAILABLE"
    key = v.strip().upper().replace(" ", "_")
    key = RESOURCE_STATUS_ALIASES.get(key, key)
    if key not in VALID_RESOURCE_STATUSES:
        raise ValueError(f"Availability status must be one of: {', '.join(VALID_RESOURCE_STATUSES)}")
    return key


class ResourceBase(BaseModel):
    resource_code: Optional[str] = None
    resource_type: str = Field(..., description="Ambulance, Rescue Team, Medical Unit, Fire and Rescue Unit, Emergency Supply Unit, Shelter")
    name: str = Field(..., min_length=2, max_length=255)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    capacity: int = Field(..., ge=1, description="Resource patient/rescue capacity")
    availability_status: Optional[str] = Field(default="AVAILABLE")
    current_location: str = Field(..., min_length=2, max_length=255)

    @field_validator("resource_type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        return normalize_resource_type(v)

    @field_validator("availability_status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> str:
        return normalize_resource_status(v)


class ResourceCreate(ResourceBase):
    pass


class ResourceUpdate(BaseModel):
    resource_type: Optional[str] = None
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    capacity: Optional[int] = Field(None, ge=1)
    availability_status: Optional[str] = None
    current_location: Optional[str] = Field(None, min_length=2, max_length=255)

    @field_validator("resource_type")
    @classmethod
    def validate_opt_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return normalize_resource_type(v)

    @field_validator("availability_status")
    @classmethod
    def validate_opt_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return normalize_resource_status(v)


class ResourceResponse(ResourceBase):
    id: int
    resource_code: str
    availability_status: str
    assigned_incident_id: Optional[int] = None
    assigned_incident_code: Optional[str] = None
    assigned_incident_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
