# Crisis Response Intelligence System (CRIS)

### Government-Grade Emergency Decision-Support & Resource Allocation Platform

A full-stack, database-backed **Crisis Response Intelligence System (CRIS)** built with **React, TypeScript, FastAPI, PostgreSQL/PostGIS, SQLAlchemy, Alembic, Pandas, NumPy, Recharts, and Leaflet** to support emergency coordinators when multiple simultaneous incidents occur under constrained resource availability.

---

> **ACADEMIC DECISION-SUPPORT DISCLAIMER**
>
> CRIS is an academic **decision-support prototype** (BCA semester project) using simulated Bengaluru emergency data. It is **not** a medically validated triage system and does **not** autonomously dispatch real emergency vehicles. Human emergency coordinators retain final decision-making authority.

---

## Problem Statement

When multiple simultaneous emergencies occur across a metropolitan region, emergency operations centres face severe resource constraints across ambulances, rescue squads, medical units, fire units, emergency supplies, and shelters. Manual triage and ad-hoc dispatch make it difficult to determine which incident requires attention first, which available asset is geographically and operationally compatible, and how fleet shortages affect response coverage.

## Project Objectives

1. **Prioritize Simultaneous Incidents Transparently**: Score and classify concurrent incidents (0–100 scale: `CRITICAL`, `HIGH`, `MODERATE`, `LOW`) using configurable weights across severity, population impact, urgency, vulnerability, and accessibility.
2. **Recommend Compatible Resources Explainably**: Evaluate available fleet units by Haversine proximity, ingress accessibility penalty, hazard compatibility, and capacity fit while keeping final dispatch authority with human coordinators.
3. **Simulate Resource Shortages Safely**: Allow coordinators to test fleet capacity deficits and unit outages in memory without altering live operational database records.
4. **Enforce Security & Operational Accountability**: Protect all endpoints with JWT authentication, bcrypt password hashing, Role-Based Access Control (RBAC), automated alerts, and immutable audit logs.

---

## Core Capabilities & Features

- **JWT Authentication & Role-Based Access Control (RBAC)**:
  - Roles: `Administrator`, `Emergency Coordinator`, `Resource Manager`, `Viewer`.
  - Bcrypt password hashing, JWT Bearer tokens, protected frontend routes, and backend RBAC enforcement.
- **Command Dashboard**:
  - Live database-backed metrics: Active Incidents, Critical Incidents, High-Priority Incidents, Available Ambulances, Available Rescue Teams, Available Medical Units, Deployed Resources, and Pending Resource Requests.
  - Interactive Tactical Map, Priority Queue, Recommended Dispatch Actions, Recent Alerts, and Recharts analytics.
- **Complete Incident Lifecycle Management**:
  - Create, View, Edit, Filter, Search, Sort by Priority, and Delete with confirmation.
  - Tracks `title`, `injuries`, `casualties`, `people_affected`, coordinates, 5 priority factors, and statuses (`Reported`, `Under Assessment`, `Active`, `Resources Assigned`, `Resolved`, `Closed`).
- **Intelligent Configurable Priority Engine**:
  - Weighted 0–100 scoring formula (`CRITICAL` 80–100, `HIGH` 60–79, `MODERATE` 40–59, `LOW` 0–39) with database-persisted configurable weights, factor breakdown, natural-language explanation, `PriorityScore` snapshots, and recalculation timestamps.
- **Emergency Fleet & Resource Management**:
  - Supports 6 resource categories (`Ambulance`, `Rescue Team`, `Medical Unit`, `Fire and Rescue Unit`, `Emergency Supply Unit`, `Shelter`) and 5 operational states (`Available`, `Assigned`, `Deployed`, `Unavailable`, `Under Maintenance`).
  - Full Add, Edit, Delete, Detail Dossier, Deployed view, and assigned-incident tracking.
- **Resource Allocation Engine**:
  - Ranks candidates using Haversine proximity, ingress accessibility penalty, hazard-type compatibility, capacity fit, and availability.
  - Prevents unavailable or duplicate assignments; supports coordinator **Accept**, **Reject**, **Manual Override**, and **Release / Reassign** with full allocation history.
- **What-If Resource Shortage Simulation**:
  - Isolated in-memory simulation allowing coordinators to adjust available fleet counts, simulate unit outages, view shortage warnings, and identify uncovered incidents without modifying live database records.
- **Operational Analytics, CSV Export, Alerts & Audit Logs**:
  - Date and incident-type filtered Recharts analytics, CSV export (`/api/analytics/export-csv`), automated operational alerts, and immutable audit logs.

---

## System Architecture

```
React 18 + TypeScript + Vite (Hybrid Navy Sidebar + Light Canvas UI)
   ├── Protected Routes + JWT AuthContext (Login / RBAC)
   ├── Command Dashboard, Incidents, Priority Lab, Fleet, Allocation
   ├── Tactical Map (React-Leaflet + OpenStreetMap)
   └── What-If Simulation, Analytics + CSV Export, Alerts & Audit Logs
                          │  REST API (/api/*, Bearer JWT)
                          ▼
FastAPI Backend (Python + Pydantic v2)
   ├── Auth & RBAC (bcrypt + python-jose JWT)
   ├── Priority Engine & Allocation Engine & Simulation Engine
   ├── Pandas / NumPy Validation & Analytics & CSV Service
   └── Alert Synchronization & Audit Logging Services
                          │  SQLAlchemy 2.0 + Alembic Migrations
                          ▼
PostgreSQL 16 + PostGIS (Primary) / SQLite (Local Fallback)
```

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, React Router v6, Axios, Lucide React, Recharts, Leaflet, React-Leaflet, OpenStreetMap.
- **Backend**: Python, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, Alembic, GeoAlchemy2, bcrypt, python-jose, Pandas, NumPy.
- **Database**: PostgreSQL 16 + PostGIS (primary via Docker/env) with automatic SQLite fallback for local development and Pytest.
- **Testing & DevOps**: Pytest, FastAPI TestClient, Docker, Docker Compose, Git/GitHub.

---

## Environment Setup & Installation

### 1. Configure Environment Variables
Copy `.env.example` to `.env` (never commit `.env`):
```bash
cp .env.example .env
```
Set `JWT_SECRET_KEY`, `DATABASE_URL`, and optionally `DEMO_SEED_PASSWORD` for initial local demo accounts.

### 2. Backend Setup & Alembic Migrations
```bash
cd backend
python -m pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```
- API Base URL: `http://127.0.0.1:8000/api`
- Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Frontend URL: `http://localhost:5173`
- On first launch without `DEMO_SEED_PASSWORD`, the login screen automatically offers **Bootstrap Admin** to create the first `Administrator` account.

### 4. Docker Deployment (PostgreSQL + PostGIS + Backend + Frontend)
```bash
docker compose up --build
```

---

## Testing & Verification

```bash
# Backend unit, auth/RBAC, engine, simulation, and API integration tests
python -m pytest backend/tests -v

# Frontend TypeScript check and Vite production build
cd frontend && npm run build
```

---

## API Overview

See [docs/api.md](docs/api.md) for full endpoint documentation covering `/api/auth/*`, `/api/dashboard/*`, `/api/incidents/*`, `/api/resources/*`, `/api/allocation/*`, `/api/priority/*`, `/api/simulation/run`, `/api/analytics/*`, `/api/alerts/*`, and `/api/audit-logs`.

---

## Three-Member BCA Team Responsibilities

| Member | Primary Ownership | Modules & Deliverables |
|---|---|---|
| **Member 1 — Backend Architect & Intelligence Lead** | FastAPI core, Priority Engine, Allocation Engine, Simulation Engine | `backend/app/engines/`, `backend/app/services/`, `backend/app/api/`, Pytest suite |
| **Member 2 — Database & Security Engineer** | PostgreSQL/PostGIS schema, Alembic migrations, JWT Auth & RBAC, Audit Logs | `backend/alembic/`, `database/migrations/init.sql`, `backend/app/core/security.py`, `backend/app/models/` |
| **Member 3 — Frontend UI/UX & GIS Lead** | React + TypeScript Command UI, Leaflet Map, Recharts Analytics, Docker/Docs | `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/map/`, `frontend/src/charts/`, `docs/` |

## Team Collaboration Instructions

1. **Branching & Pull Requests**: Create feature branches from `main` (e.g., `feature/priority-tuning`, `fix/map-filters`) and open pull requests before merging.
2. **Environment Safety**: Never commit `.env`, database binaries (`*.db`), or credentials. Use `.env.example` as the shared template.
3. **Database Schema Changes**: Add incremental Alembic revisions in `backend/alembic/versions/` (`render_as_batch=True` preserves SQLite compatibility alongside PostgreSQL + PostGIS).
4. **Pre-Push Verification**: Run `python -m pytest backend/tests -v` and `cd frontend && npm run build` before pushing changes.
