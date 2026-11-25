from datetime import datetime, timezone
from app.engines.allocation_engine import ResourceAllocationEngine
from app.models.incident import Incident
from app.models.resource import Resource


def test_resource_compatibility():
    engine = ResourceAllocationEngine()

    compat = engine.get_compatible_types("Building Collapse")
    assert "Rescue Team" in compat
    assert "Fire and Rescue Unit" in compat
    assert "Ambulance" in compat

    compat_fire = engine.get_compatible_types("Industrial Fire")
    assert "Fire and Rescue Unit" in compat_fire
    assert "Rescue Team" in compat_fire


def test_resource_ranking_distance_availability_and_accessibility_penalty():
    engine = ResourceAllocationEngine()
    now = datetime.now(timezone.utc)

    incident_easy = Incident(
        id=1,
        incident_code="INC-TEST-01",
        title="Collapse in Yelahanka",
        incident_type="Building Collapse",
        description="Collapse in Yelahanka",
        location="Yelahanka",
        latitude=13.1000,
        longitude=77.5900,
        severity=90.0,
        impact=85.0,
        urgency=90.0,
        vulnerability=70.0,
        accessibility=90.0,
        people_affected=50,
        injuries=5,
        casualties=0,
        status="ACTIVE",
        priority_score=85.0,
        priority_level="CRITICAL",
        created_at=now,
        updated_at=now,
    )

    incident_hard = Incident(
        id=2,
        incident_code="INC-TEST-02",
        title="Blocked Collapse in Yelahanka",
        incident_type="Building Collapse",
        description="Blocked road collapse",
        location="Yelahanka",
        latitude=13.1000,
        longitude=77.5900,
        severity=90.0,
        impact=85.0,
        urgency=90.0,
        vulnerability=70.0,
        accessibility=10.0,
        people_affected=50,
        injuries=5,
        casualties=0,
        status="ACTIVE",
        priority_score=85.0,
        priority_level="CRITICAL",
        created_at=now,
        updated_at=now,
    )

    near_available = Resource(
        id=1,
        resource_code="RES-NEAR",
        resource_type="Rescue Team",
        name="Near Rescue Team",
        latitude=13.0950,
        longitude=77.5920,
        capacity=30,
        availability_status="AVAILABLE",
        current_location="Yelahanka Post",
        assigned_incident_id=None,
        created_at=now,
        updated_at=now,
    )

    far_available = Resource(
        id=2,
        resource_code="RES-FAR",
        resource_type="Rescue Team",
        name="Far Rescue Team",
        latitude=12.9000,
        longitude=77.5500,
        capacity=30,
        availability_status="AVAILABLE",
        current_location="South Post",
        assigned_incident_id=None,
        created_at=now,
        updated_at=now,
    )

    near_deployed = Resource(
        id=3,
        resource_code="RES-DEPLOYED",
        resource_type="Rescue Team",
        name="Busy Rescue Team",
        latitude=13.1001,
        longitude=77.5901,
        capacity=30,
        availability_status="DEPLOYED",
        current_location="Busy Post",
        assigned_incident_id=99,
        created_at=now,
        updated_at=now,
    )

    ranked = engine.rank_resources(incident_easy, [far_available, near_deployed, near_available])
    assert ranked[0].resource.resource_code == "RES-NEAR"
    assert ranked[0].is_compatible is True
    assert ranked[0].availability_status == "AVAILABLE"
    assert ranked[0].distance_km < ranked[1].distance_km

    # Lower accessibility must increase penalty and reduce suitability score
    eval_easy = engine.evaluate_resource_for_incident(incident_easy, near_available)
    eval_hard = engine.evaluate_resource_for_incident(incident_hard, near_available)
    assert eval_hard.accessibility_penalty > eval_easy.accessibility_penalty
    assert eval_hard.overall_suitability_score < eval_easy.overall_suitability_score
