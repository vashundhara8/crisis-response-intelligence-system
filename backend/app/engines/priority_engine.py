import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.priority import FactorBreakdown


class EmergencyPriorityEngine:
    """
    Dynamic Emergency Priority Engine (Academic Decision-Support Prototype).
    Evaluates multi-factor crisis conditions and assigns an explainable 0-100 priority score.
    Not a medically validated emergency triage system.
    """

    def __init__(
        self,
        weight_severity: float = settings.DEFAULT_WEIGHT_SEVERITY,
        weight_impact: float = settings.DEFAULT_WEIGHT_IMPACT,
        weight_urgency: float = settings.DEFAULT_WEIGHT_URGENCY,
        weight_vulnerability: float = settings.DEFAULT_WEIGHT_VULNERABILITY,
        weight_accessibility: float = settings.DEFAULT_WEIGHT_ACCESSIBILITY,
    ):
        self.w_sev = weight_severity
        self.w_imp = weight_impact
        self.w_urg = weight_urgency
        self.w_vul = weight_vulnerability
        self.w_acc = weight_accessibility

    def classify_level(self, score: float) -> str:
        """
        Map numerical priority score (0-100) to operational response tiers:
        80-100: CRITICAL
        60-79: HIGH
        40-59: MODERATE
        0-39: LOW
        """
        if score >= 80.0:
            return "CRITICAL"
        elif score >= 60.0:
            return "HIGH"
        elif score >= 40.0:
            return "MODERATE"
        else:
            return "LOW"

    def get_active_weights_dict(self, db: Session) -> Optional[Dict[str, float]]:
        from app.models.weights import PriorityWeights

        weights_row = db.query(PriorityWeights).filter(PriorityWeights.is_active == True).first()
        if not weights_row:
            return None
        return {
            "severity": weights_row.severity_weight,
            "impact": weights_row.impact_weight,
            "urgency": weights_row.urgency_weight,
            "vulnerability": weights_row.vulnerability_weight,
            "accessibility": weights_row.accessibility_weight,
        }

    def calculate(
        self,
        severity: float,
        impact: float,
        urgency: float,
        vulnerability: float,
        accessibility: float,
        custom_weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """Calculate weighted priority score and generate factor breakdown and explanation."""
        w_sev = custom_weights.get("severity", self.w_sev) if custom_weights else self.w_sev
        w_imp = custom_weights.get("impact", self.w_imp) if custom_weights else self.w_imp
        w_urg = custom_weights.get("urgency", self.w_urg) if custom_weights else self.w_urg
        w_vul = custom_weights.get("vulnerability", self.w_vul) if custom_weights else self.w_vul
        w_acc = custom_weights.get("accessibility", self.w_acc) if custom_weights else self.w_acc

        c_sev = round(severity * w_sev, 2)
        c_imp = round(impact * w_imp, 2)
        c_urg = round(urgency * w_urg, 2)
        c_vul = round(vulnerability * w_vul, 2)
        c_acc = round(accessibility * w_acc, 2)

        raw_score = c_sev + c_imp + c_urg + c_vul + c_acc
        priority_score = round(min(100.0, max(0.0, raw_score)), 2)
        priority_level = self.classify_level(priority_score)
        calculated_at = datetime.now(timezone.utc)

        breakdown: List[FactorBreakdown] = [
            FactorBreakdown(
                factor="Severity",
                value=severity,
                weight_pct=round(w_sev * 100, 1),
                contribution=c_sev,
                description=f"Physical hazard intensity & structural danger ({severity}/100 × {int(round(w_sev*100))}%)",
            ),
            FactorBreakdown(
                factor="Impact",
                value=impact,
                weight_pct=round(w_imp * 100, 1),
                contribution=c_imp,
                description=f"Population exposure & scale of affected area ({impact}/100 × {int(round(w_imp*100))}%)",
            ),
            FactorBreakdown(
                factor="Urgency",
                value=urgency,
                weight_pct=round(w_urg * 100, 1),
                contribution=c_urg,
                description=f"Time-sensitivity to prevent escalation ({urgency}/100 × {int(round(w_urg*100))}%)",
            ),
            FactorBreakdown(
                factor="Vulnerability",
                value=vulnerability,
                weight_pct=round(w_vul * 100, 1),
                contribution=c_vul,
                description=f"Susceptibility of vulnerable population & critical infra ({vulnerability}/100 × {int(round(w_vul*100))}%)",
            ),
            FactorBreakdown(
                factor="Accessibility",
                value=accessibility,
                weight_pct=round(w_acc * 100, 1),
                contribution=c_acc,
                description=f"Route condition & ingress difficulty factor ({accessibility}/100 × {int(round(w_acc*100))}%)",
            ),
        ]

        top_factors = sorted(breakdown, key=lambda x: x.contribution, reverse=True)
        primary = top_factors[0]
        secondary = top_factors[1]

        explanation = (
            f"Incident classified as {priority_level} (Score: {priority_score}/100). "
            f"Primary driver is {primary.factor} contributing +{primary.contribution} pts "
            f"followed by {secondary.factor} (+{secondary.contribution} pts). "
            f"Prototype decision-support ranking only; human coordinator retains dispatch authority."
        )

        formula_str = (
            f"({severity} × {w_sev:.2f}) + ({impact} × {w_imp:.2f}) + "
            f"({urgency} × {w_urg:.2f}) + ({vulnerability} × {w_vul:.2f}) + "
            f"({accessibility} × {w_acc:.2f}) = {priority_score}"
        )

        return {
            "priority_score": priority_score,
            "priority_level": priority_level,
            "severity_contribution": c_sev,
            "impact_contribution": c_imp,
            "urgency_contribution": c_urg,
            "vulnerability_contribution": c_vul,
            "accessibility_contribution": c_acc,
            "breakdown": [b.model_dump() for b in breakdown],
            "explanation": explanation,
            "formula_used": formula_str,
            "weights_applied": {
                "severity": w_sev,
                "impact": w_imp,
                "urgency": w_urg,
                "vulnerability": w_vul,
                "accessibility": w_acc,
            },
            "last_recalculated_at": calculated_at,
        }

    def apply_to_incident(self, db: Session, incident, record_snapshot: bool = True) -> Dict[str, Any]:
        """Compute priority using active DB weights, update incident fields, and store PriorityScore snapshot."""
        from app.models.priority_score import PriorityScore

        custom_weights = self.get_active_weights_dict(db)
        calc = self.calculate(
            severity=incident.severity,
            impact=incident.impact,
            urgency=incident.urgency,
            vulnerability=incident.vulnerability,
            accessibility=incident.accessibility,
            custom_weights=custom_weights,
        )
        incident.priority_score = calc["priority_score"]
        incident.priority_level = calc["priority_level"]
        incident.last_recalculated_at = calc["last_recalculated_at"]

        if record_snapshot and incident.id is not None:
            snapshot = PriorityScore(
                incident_id=incident.id,
                priority_score=calc["priority_score"],
                priority_level=calc["priority_level"],
                severity_contribution=calc["severity_contribution"],
                impact_contribution=calc["impact_contribution"],
                urgency_contribution=calc["urgency_contribution"],
                vulnerability_contribution=calc["vulnerability_contribution"],
                accessibility_contribution=calc["accessibility_contribution"],
                explanation=calc["explanation"],
                weights_snapshot=json.dumps(calc["weights_applied"]),
                calculated_at=calc["last_recalculated_at"],
            )
            db.add(snapshot)

        return calc


priority_engine = EmergencyPriorityEngine()
