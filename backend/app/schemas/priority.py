from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class FactorBreakdown(BaseModel):
    factor: str
    value: float
    weight_pct: float
    contribution: float
    description: str


class PriorityCalculationRequest(BaseModel):
    severity: float = Field(..., ge=0.0, le=100.0)
    impact: float = Field(..., ge=0.0, le=100.0)
    urgency: float = Field(..., ge=0.0, le=100.0)
    vulnerability: float = Field(..., ge=0.0, le=100.0)
    accessibility: float = Field(..., ge=0.0, le=100.0)
    incident_type: Optional[str] = "Simulated Emergency"
    people_affected: Optional[int] = 0


class PriorityCalculationResponse(BaseModel):
    priority_score: float
    priority_level: str
    severity_contribution: float
    impact_contribution: float
    urgency_contribution: float
    vulnerability_contribution: float
    accessibility_contribution: float
    breakdown: List[FactorBreakdown]
    explanation: str
    formula_used: str
    weights_applied: Dict[str, float]
    last_recalculated_at: datetime
    disclaimer: str = (
        "DEMONSTRATION WEIGHTS • ACADEMIC DECISION SUPPORT ONLY "
        "(NOT A MEDICALLY VALIDATED EMERGENCY TRIAGE SCORE)"
    )


class PriorityWeightsSchema(BaseModel):
    severity_weight: float = Field(..., ge=0.0, le=1.0)
    impact_weight: float = Field(..., ge=0.0, le=1.0)
    urgency_weight: float = Field(..., ge=0.0, le=1.0)
    vulnerability_weight: float = Field(..., ge=0.0, le=1.0)
    accessibility_weight: float = Field(..., ge=0.0, le=1.0)


class PriorityWeightsResponse(PriorityWeightsSchema):
    id: Optional[int] = None
    is_active: bool = True
    total_weight: float
    updated_at: Optional[datetime] = None
    label: str = "Configurable Multi-Factor Demonstration Weighting Model"
