# CRIS System Architecture

## High-Level System Architecture

The **Crisis Response Intelligence System (CRIS)** is engineered as a multi-tier, decoupled emergency decision-support platform designed to handle crisis data ingestion, multi-factor priority calculation, spatial resource allocation, and interactive command visualization.

```
┌─────────────────────────────────────────────────────────────┐
│                    React 18 + TypeScript                    │
│      Vite • React Router • React-Leaflet • Recharts         │
│  (Dashboard, Priority Lab, Allocation Station, Map, Stats)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST API / HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend Core                     │
│         Pydantic v2 Validation • Lifespan Auto-Seeder       │
├──────────────────────────────┬──────────────────────────────┤
│  Emergency Priority Engine   │  Resource Allocation Engine  │
│  • Configurable Weights      │  • Distance Matrix           │
│  • Tier Classification       │  • Hazard-Asset Compatibility│
│  • Decision Explainability   │  • Capacity Validation       │
├──────────────────────────────┴──────────────────────────────┤
│                Data Processing & Validation                 │
│              Pandas • NumPy • Geospatial Math               │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLAlchemy 2.0 ORM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             PostgreSQL 16 + PostGIS / SQLite                │
│    Incidents • Resources • Allocations • Status History     │
└─────────────────────────────────────────────────────────────┘
```

## Core Workflow Sequence

1. **Crisis Data Ingestion**:
   Incoming emergency reports are submitted via `POST /api/incidents` with coordinates, estimated population impact, and 5 operational factors (Severity, Impact, Urgency, Vulnerability, Accessibility).
2. **Validation & Normalization**:
   Pydantic and Pandas/NumPy validate coordinate ranges, ensure factor values are clamped to `[0, 100]`, and reject non-physical inputs.
3. **Emergency Priority Engine**:
   Calculates weighted score using active demonstration weights:
   $$\text{Score} = (S \times 0.30) + (I \times 0.25) + (U \times 0.20) + (V \times 0.15) + (A \times 0.10)$$
   Assigns priority tier (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and generates explainable justification.
4. **Resource Allocation Engine**:
   When an incident is selected for dispatch, the allocation engine filters available fleet units, checks hazard compatibility, assesses capacity against affected population, calculates distance in kilometers using the Haversine formula, and ranks candidate resources.
5. **Command Execution**:
   Operator clicks "ALLOCATE RESOURCE", causing the resource status to transition to `DEPLOYED`, incident status to `RESOURCE_ALLOCATED`, and records the dispatch event with timestamp in history.
6. **Command Dashboard & Tactical Map**:
   Live KPIs, Leaflet map markers, and Recharts operational analytics update instantly.
