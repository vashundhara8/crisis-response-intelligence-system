-- ==========================================================
-- CRISIS RESPONSE INTELLIGENCE SYSTEM (CRIS)
-- Database Initialization & Schema Definition
-- PostgreSQL + PostGIS (with SQLite-compatible Alembic migrations)
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(180) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Viewer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    incident_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    geom GEOMETRY(Point, 4326),
    severity DOUBLE PRECISION NOT NULL CHECK (severity >= 0 AND severity <= 100),
    impact DOUBLE PRECISION NOT NULL CHECK (impact >= 0 AND impact <= 100),
    urgency DOUBLE PRECISION NOT NULL CHECK (urgency >= 0 AND urgency <= 100),
    vulnerability DOUBLE PRECISION NOT NULL CHECK (vulnerability >= 0 AND vulnerability <= 100),
    accessibility DOUBLE PRECISION NOT NULL CHECK (accessibility >= 0 AND accessibility <= 100),
    people_affected INTEGER NOT NULL CHECK (people_affected >= 0),
    injuries INTEGER NOT NULL DEFAULT 0 CHECK (injuries >= 0),
    casualties INTEGER NOT NULL DEFAULT 0 CHECK (casualties >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'REPORTED',
    priority_score DOUBLE PRECISION DEFAULT 0.0,
    priority_level VARCHAR(20) DEFAULT 'LOW',
    last_recalculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Resources Table
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    resource_code VARCHAR(50) UNIQUE NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
    geom GEOMETRY(Point, 4326),
    capacity INTEGER NOT NULL CHECK (capacity >= 0),
    availability_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    current_location VARCHAR(255) NOT NULL,
    assigned_incident_id INTEGER REFERENCES incidents(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Resource Allocations Table
CREATE TABLE IF NOT EXISTS resource_allocations (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    distance_km DOUBLE PRECISION NOT NULL,
    suitability_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    recommendation_reason TEXT,
    allocation_notes TEXT,
    decision_status VARCHAR(30) NOT NULL DEFAULT 'ACCEPTED',
    is_override BOOLEAN NOT NULL DEFAULT FALSE,
    decided_by VARCHAR(100),
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
);

-- 5. Incident Status History Table
CREATE TABLE IF NOT EXISTS incident_status_history (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(100) DEFAULT 'SYSTEM',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Demonstration Weights Configuration Table
CREATE TABLE IF NOT EXISTS demonstration_weights (
    id SERIAL PRIMARY KEY,
    severity_weight DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    impact_weight DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    urgency_weight DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    vulnerability_weight DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    accessibility_weight DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Priority Scores Audit Table
CREATE TABLE IF NOT EXISTS priority_scores (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    priority_score DOUBLE PRECISION NOT NULL,
    priority_level VARCHAR(20) NOT NULL,
    severity_contribution DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    impact_contribution DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    urgency_contribution DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    vulnerability_contribution DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    accessibility_contribution DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    explanation TEXT NOT NULL,
    weights_snapshot TEXT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Operational Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(60) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
    resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(80) NOT NULL DEFAULT 'SYSTEM',
    user_role VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    details TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial & Performance Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority_score ON incidents(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_priority_level ON incidents(priority_level);
CREATE INDEX IF NOT EXISTS idx_incidents_geom ON incidents USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(availability_status);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_geom ON resources USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_allocations_incident ON resource_allocations(incident_id);
CREATE INDEX IF NOT EXISTS idx_allocations_resource ON resource_allocations(resource_id);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
