from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.resource import ResourceResponse
from app.schemas.incident import IncidentResponse


class ResourceRecommendationItem(BaseModel):
    incident_id: int
    incident_priority_score: float
    incident_priority_level: str
    resource: ResourceResponse
    resource_type: str
    distance_km: float
    accessibility_penalty: float
    accessibility_consideration: str
    compatibility_score: float
    is_compatible: bool
    capacity_score: float
    capacity_check: str
    availability_status: str
    overall_suitability_score: float
    explanation: str


class IncidentRecommendationResponse(BaseModel):
    incident: IncidentResponse
    recommendations: List[ResourceRecommendationItem]
    total_candidates_evaluated: int
    compatible_available_count: int
    decision_support_note: str


class AllocationRequest(BaseModel):
    incident_id: int
    resource_id: int
    action: str = Field(default="ACCEPT", description="ACCEPT, REJECT, or OVERRIDE")
    is_override: bool = False
    notes: Optional[str] = None


class AllocationResponse(BaseModel):
    allocation_id: int
    incident_id: int
    incident_code: str
    incident_status: str
    resource_id: int
    resource_code: str
    resource_status: str
    distance_km: float
    suitability_score: float
    decision_status: str
    is_override: bool
    recommendation_reason: Optional[str] = None
    decided_by: Optional[str] = None
    allocated_at: datetime
    released_at: Optional[datetime] = None
    message: str


class AllocationHistoryItem(BaseModel):
    id: int
    incident_id: int
    incident_code: str
    incident_title: str
    incident_location: str
    resource_id: int
    resource_code: str
    resource_name: str
    resource_type: str
    distance_km: float
    suitability_score: float
    decision_status: str
    status: str
    is_override: bool
    decided_by: Optional[str] = None
    recommendation_reason: Optional[str] = None
    allocation_notes: Optional[str] = None
    allocated_at: datetime
    released_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
