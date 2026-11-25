# REST API Documentation

Base URL: `http://localhost:8000/api`
Interactive Swagger UI: `http://localhost:8000/docs`

All `/api/*` endpoints (except `/api/health`, `/api/auth/login`, `/api/auth/register`, and `/api/auth/bootstrap-status`) require a Bearer JWT token (`Authorization: Bearer <token>`).

---

## 1. System & Health

- `GET /api/health` — Returns system operational status and database connection status.

## 2. Authentication & RBAC

- `GET /api/auth/bootstrap-status` — Checks whether an initial Administrator account exists.
- `POST /api/auth/register` — Registers a user (first user bootstraps Administrator; public self-registration is restricted to Viewer; Administrators may provision any role).
- `POST /api/auth/login` — Authenticates credentials and returns a JWT access token and user profile.
- `GET /api/auth/me` — Returns the currently authenticated user.
- `GET /api/auth/users` — Lists all users (`Administrator` only).
- `PUT /api/auth/users/{id}/role` — Updates a user's role (`Administrator` only).
- `PUT /api/auth/users/{id}/status` — Activates or deactivates a user (`Administrator` only).

## 3. Incidents

- `GET /api/incidents` — Filter by `priority` (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`), `status`, `incident_type`, `search`.
- `GET /api/incidents/prioritized` — Unresolved incidents ordered by `priority_score DESC`.
- `GET /api/incidents/{id}` — Incident details with factor breakdown and explanation.
- `POST /api/incidents` — Creates incident with `title`, `injuries`, `casualties`, computes priority using active DB weights (`Administrator`, `Emergency Coordinator`).
- `PUT /api/incidents/{id}` — Updates fields/status, recalculates priority, records `PriorityScore` & status history (`Administrator`, `Emergency Coordinator`).
- `DELETE /api/incidents/{id}` — Deletes incident (`Administrator`, `Emergency Coordinator`).

## 4. Emergency Resources

- `GET /api/resources` — Filter by `resource_type`, `status`, `search`.
- `GET /api/resources/available` — Available unassigned units.
- `GET /api/resources/deployed` — Assigned/deployed units.
- `GET /api/resources/{id}` & `GET /api/resources/{id}/detail` — Resource metadata + allocation history.
- `POST /api/resources` / `PUT /api/resources/{id}` — Create/edit resources (`Administrator`, `Resource Manager`, `Emergency Coordinator`).
- `DELETE /api/resources/{id}` — Delete resource (`Administrator`, `Resource Manager`).

## 5. Resource Allocation

- `GET /api/allocation/recommend/{incident_id}` — Ranked candidate resources with Haversine distance, accessibility penalty, compatibility, capacity check, and rationale.
- `POST /api/allocation` — Executes `ACCEPT`, `REJECT`, or `OVERRIDE` decision (`Administrator`, `Emergency Coordinator`).
- `POST /api/allocation/{allocation_id}/release` — Releases a deployed resource back to `AVAILABLE` (`Administrator`, `Emergency Coordinator`, `Resource Manager`).
- `GET /api/allocation/history` — Lists historical allocation decisions.

## 6. Priority Engine & What-If Simulation

- `POST /api/priority/calculate` — Calculates score, tier, breakdown, and explanation using active weights.
- `GET /api/priority/weights` & `PUT /api/priority/weights` — Views/updates weights (`Administrator` for `PUT`) and recalculates all incidents.
- `POST /api/simulation/run` — Isolated in-memory resource shortage & priority simulation (`Administrator`, `Emergency Coordinator`, `Resource Manager`).

## 7. Dashboard, Analytics, Alerts & Audit Logs

- `GET /api/dashboard/summary` — Live KPI metrics, priority queue, recommended actions, alerts, and chart datasets.
- `GET /api/dashboard/map` — Incident and resource map markers.
- `POST /api/dashboard/reset-demo` — Resets simulated demonstration dataset (`Administrator` only).
- `GET /api/analytics/overview` — Filtered analytics (`start_date`, `end_date`, `incident_type`), allocation stats, resolution stats, shortage indicators.
- `GET /api/analytics/export-csv` — Downloads CSV report of incidents.
- `GET /api/alerts` & `POST /api/alerts/{id}/resolve` — Lists and acknowledges operational alerts.
- `GET /api/audit-logs` — Filterable audit log (`Administrator`, `Emergency Coordinator`).
