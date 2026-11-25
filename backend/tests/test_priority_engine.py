from app.engines.priority_engine import EmergencyPriorityEngine


def test_demonstration_formula_calculation():
    engine = EmergencyPriorityEngine(
        weight_severity=0.30,
        weight_impact=0.25,
        weight_urgency=0.20,
        weight_vulnerability=0.15,
        weight_accessibility=0.10,
    )
    result = engine.calculate(
        severity=90.0,
        impact=85.0,
        urgency=95.0,
        vulnerability=70.0,
        accessibility=60.0,
    )
    assert result["priority_score"] == 83.75
    assert result["priority_level"] == "CRITICAL"
    assert result["severity_contribution"] == 27.0
    assert result["impact_contribution"] == 21.25
    assert result["urgency_contribution"] == 19.0
    assert result["vulnerability_contribution"] == 10.5
    assert result["accessibility_contribution"] == 6.0
    assert len(result["breakdown"]) == 5
    assert "CRITICAL" in result["explanation"]


def test_priority_tier_classifications():
    engine = EmergencyPriorityEngine()

    assert engine.classify_level(100.0) == "CRITICAL"
    assert engine.classify_level(80.0) == "CRITICAL"
    assert engine.classify_level(79.9) == "HIGH"
    assert engine.classify_level(60.0) == "HIGH"
    assert engine.classify_level(59.9) == "MODERATE"
    assert engine.classify_level(40.0) == "MODERATE"
    assert engine.classify_level(39.9) == "LOW"
    assert engine.classify_level(0.0) == "LOW"


def test_custom_weights_override():
    engine = EmergencyPriorityEngine()
    custom = {
        "severity": 0.50,
        "impact": 0.50,
        "urgency": 0.0,
        "vulnerability": 0.0,
        "accessibility": 0.0,
    }
    result = engine.calculate(
        severity=80.0,
        impact=60.0,
        urgency=100.0,
        vulnerability=100.0,
        accessibility=100.0,
        custom_weights=custom,
    )
    assert result["priority_score"] == 70.0
    assert result["priority_level"] == "HIGH"
