def test_unauthenticated_requests_rejected(unauth_client):
    assert unauth_client.get("/api/dashboard/summary").status_code == 401
    assert unauth_client.get("/api/incidents").status_code == 401
    assert unauth_client.get("/api/resources").status_code == 401
    assert unauth_client.post("/api/simulation/run", json={}).status_code == 401


def test_bootstrap_registration_login_and_rbac_enforcement(unauth_client, make_auth_headers):
    # First registered user when users table is empty becomes Administrator
    reg1 = unauth_client.post(
        "/api/auth/register",
        json={
            "username": "first_admin",
            "email": "first_admin@cris.local",
            "full_name": "First Admin",
            "password": "StrongPassword123!",
            "role": "Viewer",
        },
    )
    assert reg1.status_code == 201
    assert reg1.json()["role"] == "Administrator"

    # Subsequent public registration attempting elevated role must be rejected (403)
    reg_elevated = unauth_client.post(
        "/api/auth/register",
        json={
            "username": "attacker",
            "email": "attacker@cris.local",
            "full_name": "Unauthorized Escalation",
            "password": "StrongPassword123!",
            "role": "Administrator",
        },
    )
    assert reg_elevated.status_code == 403

    # Subsequent public registration as Viewer succeeds
    reg2 = unauth_client.post(
        "/api/auth/register",
        json={
            "username": "public_viewer",
            "email": "viewer2@cris.local",
            "full_name": "Public Viewer",
            "password": "StrongPassword123!",
        },
    )
    assert reg2.status_code == 201
    assert reg2.json()["role"] == "Viewer"

    # Login returns JWT and user profile
    login_res = unauth_client.post(
        "/api/auth/login",
        json={"username": "public_viewer", "password": "StrongPassword123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    viewer_headers = {"Authorization": f"Bearer {token}"}

    me_res = unauth_client.get("/api/auth/me", headers=viewer_headers)
    assert me_res.status_code == 200
    assert me_res.json()["username"] == "public_viewer"

    # Viewer can read dashboard but cannot mutate incidents, resources, or weights
    assert unauth_client.get("/api/dashboard/summary", headers=viewer_headers).status_code == 200
    assert (
        unauth_client.post(
            "/api/incidents",
            headers=viewer_headers,
            json={
                "incident_type": "Fire",
                "description": "Viewer create test",
                "location": "Bengaluru",
                "latitude": 12.97,
                "longitude": 77.59,
                "severity": 50,
                "impact": 50,
                "urgency": 50,
                "vulnerability": 50,
                "accessibility": 50,
                "people_affected": 10,
            },
        ).status_code
        == 403
    )

    # Resource Manager can add resources, but cannot tune priority weights
    rm_headers = make_auth_headers("rm_user", "Resource Manager")
    rm_res = unauth_client.post(
        "/api/resources",
        headers=rm_headers,
        json={
            "resource_type": "Fire and Rescue Unit",
            "name": "Test Fire Unit",
            "latitude": 12.97,
            "longitude": 77.59,
            "capacity": 20,
            "current_location": "Central Depot",
        },
    )
    assert rm_res.status_code == 201
    assert (
        unauth_client.put(
            "/api/priority/weights",
            headers=rm_headers,
            json={
                "severity_weight": 0.2,
                "impact_weight": 0.2,
                "urgency_weight": 0.2,
                "vulnerability_weight": 0.2,
                "accessibility_weight": 0.2,
            },
        ).status_code
        == 403
    )

