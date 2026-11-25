from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.incident import IncidentResponse


class MetricCards(BaseModel):
    active_incidents: int
    critical_incidents: int
    high_incidents: int
    moderate_incidents: int
    low_incidents: int
    total_resources: int
    available_resources: int
    available_ambulances: int
    available_rescue_teams: int
    available_medical_units: int
    deployed_resources: int
    pending_resource_requests: int
    average_priority_score: float
    total_people_affected: int


class RecentAlert(BaseModel):
    id: int
    timestamp: str
    alert_type: str = "INCIDENT_ALERT"
    severity: str = "HIGH"
    incident_code: Optional[str] = None
    title: str
    message: Optional[str] = None
    priority_level: str
    priority_score: float
    location: str
    status: str


class RecommendedActionItem(BaseModel):
    incident_id: int
    incident_code: str
    incident_title: str
    priority_level: str
    priority_score: float
    recommended_resource_id: Optional[int] = None
    recommended_resource_code: Optional[str] = None
    recommended_resource_name: Optional[str] = None
    recommended_resource_type: Optional[str] = None
    distance_km: Optional[float] = None
    suitability_score: Optional[float] = None
    rationale: str


class ResourceTypeCount(BaseModel):
    resource_type: str
    available: int
    total: int
    deployed: int
    unavailable: int = 0


class DashboardSummaryResponse(BaseModel):
    metrics: MetricCards
    prioritized_incidents: List[IncidentResponse]
    resource_summary: List[ResourceTypeCount]
    recent_alerts: List[RecentAlert]
    recommended_actions: List[RecommendedActionItem] = []
    incidents_by_type: List[Dict[str, Any]] = []
    incidents_by_priority: List[Dict[str, Any]] = []
    resource_utilization: List[Dict[str, Any]] = []
    disclaimer: str = "SIMULATED / DEMONSTRATION DATA • DECISION SUPPORT ONLY"


class MapIncidentMarker(BaseModel):
    id: int
    incident_code: str
    title: str
    incident_type: str
    location: str
    latitude: float
    longitude: float
    priority_score: float
    priority_level: str
    severity: float
    people_affected: int
    injuries: int = 0
    casualties: int = 0
    status: str


class MapResourceMarker(BaseModel):
    id: int
    resource_code: str
    resource_type: str
    name: str
    latitude: float
    longitude: float
    capacity: int
    availability_status: str
    current_location: str
    assigned_incident_id: Optional[int] = None
    assigned_incident_code: Optional[str] = None


class DashboardMapResponse(BaseModel):
    incidents: List[MapIncidentMarker]
    resources: List[MapResourceMarker]
    center_lat: float = 12.9716
    center_lon: float = 77.5946
    bounding_box_label: str = "Bengaluru Metropolitan Region (Simulated Coordinates)"
