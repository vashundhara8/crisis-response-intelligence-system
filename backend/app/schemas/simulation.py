from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class SimulationRequest(BaseModel):
    available_ambulances: Optional[int] = Field(None, ge=0, le=100)
    available_rescue_teams: Optional[int] = Field(None, ge=0, le=100)
    available_medical_units: Optional[int] = Field(None, ge=0, le=100)
    available_fire_rescue_units: Optional[int] = Field(None, ge=0, le=100)
    available_supply_units: Optional[int] = Field(None, ge=0, le=100)
    available_shelters: Optional[int] = Field(None, ge=0, le=100)
    unavailable_resource_ids: List[int] = Field(default_factory=list)
    severity_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    impact_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    urgency_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    vulnerability_weight: Optional[float] = Field(None, ge=0.0, le=1.0)
    accessibility_weight: Optional[float] = Field(None, ge=0.0, le=1.0)


class SimulatedIncidentAllocation(BaseModel):
    incident_id: int
    incident_code: str
    title: str
    incident_type: str
    location: str
    baseline_priority_score: float
    simulated_priority_score: float
    simulated_priority_level: str
    assigned_resource_code: Optional[str] = None
    assigned_resource_name: Optional[str] = None
    assigned_resource_type: Optional[str] = None
    distance_km: Optional[float] = None
    suitability_score: Optional[float] = None
    has_compatible_resource: bool
    status_note: str


class ShortageWarning(BaseModel):
    resource_type: str
    required_count: int
    simulated_available: int
    shortage_count: int
    severity: str
    message: str


class SimulationResponse(BaseModel):
    is_simulation: bool = True
    database_modified: bool = False
    scenario_summary: str
    simulated_fleet_counts: Dict[str, int]
    total_active_incidents: int
    covered_incidents_count: int
    unassigned_incidents_count: int
    simulated_allocations: List[SimulatedIncidentAllocation]
    unassigned_incidents: List[SimulatedIncidentAllocation]
    shortage_warnings: List[ShortageWarning]
    disclaimer: str = (
        "WHAT-IF SIMULATION ONLY — Computed in-memory on temporary scenario data. "
        "Actual operational database records remain completely unmodified."
    )
