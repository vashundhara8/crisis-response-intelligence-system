def test_simulation_does_not_modify_live_database(client):
    # Capture baseline available resource count
    before_resources = client.get("/api/resources/available").json()
    before_count = len(before_resources)
    assert before_count > 0

    # Run extreme shortage simulation: 0 ambulances, 0 rescue teams, 0 fire units
    sim_res = client.post(
        "/api/simulation/run",
        json={
            "available_ambulances": 0,
            "available_rescue_teams": 0,
            "available_medical_units": 0,
            "available_fire_rescue_units": 0,
            "available_supply_units": 0,
            "available_shelters": 0,
        },
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["is_simulation"] is True
    assert sim_data["database_modified"] is False
    assert sim_data["unassigned_incidents_count"] > 0
    assert len(sim_data["shortage_warnings"]) > 0

    # Verify live DB resources are completely unchanged
    after_resources = client.get("/api/resources/available").json()
    assert len(after_resources) == before_count


def test_alerts_and_audit_logs_endpoints(client):
    alerts_res = client.get("/api/alerts")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) > 0

    first_id = alerts[0]["id"]
    resolve_res = client.post(f"/api/alerts/{first_id}/resolve")
    assert resolve_res.status_code == 200
    assert resolve_res.json()["is_resolved"] is True

    # Audit log should have recorded ALERT_RESOLVED
    logs_res = client.get("/api/audit-logs")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert any(l["action"] == "ALERT_RESOLVED" for l in logs)

