def test_health_endpoint(unauth_client):
    res = unauth_client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "Crisis Response Intelligence System" in data["system"]


def test_dashboard_summary_endpoint(client):
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert data["metrics"]["active_incidents"] > 0
    assert "available_ambulances" in data["metrics"]
    assert "available_rescue_teams" in data["metrics"]
    assert "available_medical_units" in data["metrics"]
    assert "pending_resource_requests" in data["metrics"]
    assert len(data["prioritized_incidents"]) > 0
    assert len(data["resource_summary"]) == 6
    assert "recommended_actions" in data


def test_dashboard_map_endpoint(client):
    res = client.get("/api/dashboard/map")
    assert res.status_code == 200
    data = res.json()
    assert len(data["incidents"]) > 0
    assert len(data["resources"]) > 0
    assert data["center_lat"] == 12.9716


def test_incidents_crud_and_priority_calculation(client):
    payload = {
        "title": "Majestic Building Collapse",
        "incident_type": "Building Collapse",
        "description": "Commercial building collapse in Majestic",
        "location": "Majestic, Bengaluru",
        "latitude": 12.9767,
        "longitude": 77.5713,
        "severity": 90.0,
        "impact": 85.0,
        "urgency": 95.0,
        "vulnerability": 70.0,
        "accessibility": 60.0,
        "people_affected": 80,
        "injuries": 15,
        "casualties": 2,
        "status": "ACTIVE",
    }
    create_res = client.post("/api/incidents", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["incident_code"].startswith("INC-BLR-")
    assert created["title"] == "Majestic Building Collapse"
    assert created["injuries"] == 15
    assert created["casualties"] == 2
    assert created["priority_score"] == 83.75
    assert created["priority_level"] == "CRITICAL"
    assert created["last_recalculated_at"] is not None
    assert len(created["factor_contributions"]) == 5

    incident_id = created["id"]

    get_res = client.get(f"/api/incidents/{incident_id}")
    assert get_res.status_code == 200
    assert get_res.json()["location"] == "Majestic, Bengaluru"

    update_res = client.put(
        f"/api/incidents/{incident_id}",
        json={"severity": 50.0, "status": "UNDER_ASSESSMENT", "injuries": 18},
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["status"] == "UNDER_ASSESSMENT"
    assert updated["severity"] == 50.0
    assert updated["injuries"] == 18
    assert updated["priority_score"] < 83.75

    del_res = client.delete(f"/api/incidents/{incident_id}")
    assert del_res.status_code == 204


def test_pydantic_validation_error(client):
    payload = {
        "incident_type": "Fire",
        "description": "Invalid payload test",
        "location": "Nowhere",
        "latitude": 120.0,
        "longitude": 77.5946,
        "severity": 50.0,
        "impact": 50.0,
        "urgency": 50.0,
        "vulnerability": 50.0,
        "accessibility": 50.0,
        "people_affected": -10,
    }
    res = client.post("/api/incidents", json=payload)
    assert res.status_code == 422
    data = res.json()
    assert "detail" in data
    assert "errors" in data


def test_allocation_recommendation_execution_and_release_workflow(client):
    inc_res = client.get("/api/incidents/prioritized")
    assert inc_res.status_code == 200
    incidents = inc_res.json()
    assert len(incidents) > 0
    target_inc = incidents[0]

    rec_res = client.get(f"/api/allocation/recommend/{target_inc['id']}")
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert len(rec_data["recommendations"]) > 0
    top_rec = next(r for r in rec_data["recommendations"] if r["is_compatible"] and r["availability_status"] == "AVAILABLE")
    assert "accessibility_consideration" in top_rec

    alloc_res = client.post(
        "/api/allocation",
        json={
            "incident_id": target_inc["id"],
            "resource_id": top_rec["resource"]["id"],
            "action": "ACCEPT",
            "notes": "Emergency unit dispatched via CRIS decision support",
        },
    )
    assert alloc_res.status_code == 200
    alloc_data = alloc_res.json()
    assert alloc_data["incident_status"] == "RESOURCES_ASSIGNED"
    assert alloc_data["resource_status"] == "DEPLOYED"

    # Duplicate assignment must fail
    dup_res = client.post(
        "/api/allocation",
        json={"incident_id": target_inc["id"], "resource_id": top_rec["resource"]["id"], "action": "ACCEPT"},
    )
    assert dup_res.status_code == 400

    # Verify resource tracks assigned incident
    res_check = client.get(f"/api/resources/{top_rec['resource']['id']}")
    assert res_check.status_code == 200
    assert res_check.json()["availability_status"] == "DEPLOYED"
    assert res_check.json()["assigned_incident_id"] == target_inc["id"]

    # Incompatible resource without override must fail
    incompatible = next((r for r in rec_data["recommendations"] if not r["is_compatible"] and r["availability_status"] == "AVAILABLE"), None)
    if incompatible:
        incompat_res = client.post(
            "/api/allocation",
            json={"incident_id": target_inc["id"], "resource_id": incompatible["resource"]["id"], "action": "ACCEPT"},
        )
        assert incompat_res.status_code == 400

    # Release allocation
    rel_res = client.post(f"/api/allocation/{alloc_data['allocation_id']}/release")
    assert rel_res.status_code == 200
    assert rel_res.json()["resource_status"] == "AVAILABLE"

    res_after = client.get(f"/api/resources/{top_rec['resource']['id']}")
    assert res_after.json()["assigned_incident_id"] is None


def test_priority_engine_weights_update_applies_to_new_and_existing_incidents(client):
    res = client.post(
        "/api/priority/calculate",
        json={"severity": 90.0, "impact": 85.0, "urgency": 95.0, "vulnerability": 70.0, "accessibility": 60.0},
    )
    assert res.status_code == 200
    assert res.json()["priority_score"] == 83.75

    # Update weights to 100% severity
    w_res = client.put(
        "/api/priority/weights",
        json={
            "severity_weight": 1.0,
            "impact_weight": 0.0,
            "urgency_weight": 0.0,
            "vulnerability_weight": 0.0,
            "accessibility_weight": 0.0,
        },
    )
    assert w_res.status_code == 200

    # New incident should use the updated DB weights (100% severity = 45.0 -> MODERATE)
    new_inc = client.post(
        "/api/incidents",
        json={
            "title": "Weight Check Incident",
            "incident_type": "Road Accident",
            "description": "Testing active DB weight application",
            "location": "MG Road, Bengaluru",
            "latitude": 12.9756,
            "longitude": 77.6066,
            "severity": 45.0,
            "impact": 90.0,
            "urgency": 90.0,
            "vulnerability": 90.0,
            "accessibility": 90.0,
            "people_affected": 5,
        },
    )
    assert new_inc.status_code == 201
    assert new_inc.json()["priority_score"] == 45.0
    assert new_inc.json()["priority_level"] == "MODERATE"


def test_analytics_overview_and_csv_export(client):
    res = client.get("/api/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert len(data["incidents_by_priority"]) == 4
    assert len(data["incidents_by_type"]) > 0
    assert len(data["resource_utilization"]) == 6
    assert "allocation_stats" in data
    assert "resolution_stats" in data

    csv_res = client.get("/api/analytics/export-csv")
    assert csv_res.status_code == 200
    assert "Incident Code,Title,Incident Type" in csv_res.text
