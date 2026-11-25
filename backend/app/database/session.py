import os
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.logging import logger
from app.database.base import Base

# Import all models so Base.metadata is fully populated
import app.models.user
import app.models.incident
import app.models.resource
import app.models.allocation
import app.models.weights
import app.models.priority_score
import app.models.alert
import app.models.audit_log

db_url = settings.DATABASE_URL

# For SQLite, ensure check_same_thread is False
connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        echo=False,
        future=True,
    )
    with engine.connect() as conn:
        logger.info(f"Database connected successfully using: {db_url.split('@')[-1] if '@' in db_url else db_url}")
except Exception as e:
    logger.warning(f"Could not connect to {db_url}: {e}. Falling back to SQLite local database.")
    fallback_url = "sqlite:///./crisis_response.db"
    engine = create_engine(fallback_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _apply_safe_sqlite_column_upgrades():
    """
    Preserve existing records on local SQLite DBs by adding new columns if tables already existed
    before Alembic migrations were introduced, and normalizing legacy status/tier labels.
    """
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    column_migrations = {
        "incidents": [
            ("title", "VARCHAR(255) NOT NULL DEFAULT ''"),
            ("injuries", "INTEGER NOT NULL DEFAULT 0"),
            ("casualties", "INTEGER NOT NULL DEFAULT 0"),
            ("last_recalculated_at", "DATETIME"),
        ],
        "resources": [
            ("assigned_incident_id", "INTEGER"),
        ],
        "resource_allocations": [
            ("suitability_score", "FLOAT NOT NULL DEFAULT 0.0"),
            ("recommendation_reason", "TEXT"),
            ("decision_status", "VARCHAR(30) NOT NULL DEFAULT 'ACCEPTED'"),
            ("is_override", "BOOLEAN NOT NULL DEFAULT 0"),
            ("decided_by", "VARCHAR(100)"),
            ("released_at", "DATETIME"),
        ],
    }

    with engine.begin() as conn:
        for table, cols in column_migrations.items():
            if table in existing_tables:
                existing_cols = {c["name"] for c in inspector.get_columns(table)}
                for col_name, col_def in cols:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}"))
                        logger.info(f"Added missing column {table}.{col_name}")

        if "incidents" in existing_tables:
            conn.execute(text("UPDATE incidents SET priority_level = 'MODERATE' WHERE priority_level = 'MEDIUM'"))
            conn.execute(text("UPDATE incidents SET status = 'ACTIVE' WHERE status IN ('AWAITING_RESCUE', 'IN_PROGRESS')"))
            conn.execute(text("UPDATE incidents SET status = 'RESOURCES_ASSIGNED' WHERE status = 'RESOURCE_ALLOCATED'"))
            conn.execute(
                text(
                    "UPDATE incidents SET title = incident_type || ' — ' || location "
                    "WHERE title IS NULL OR title = ''"
                )
            )
            conn.execute(
                text("UPDATE incidents SET last_recalculated_at = updated_at WHERE last_recalculated_at IS NULL")
            )

        if "resources" in existing_tables:
            conn.execute(text("UPDATE resources SET availability_status = 'UNDER_MAINTENANCE' WHERE availability_status = 'MAINTENANCE'"))
            conn.execute(text("UPDATE resources SET availability_status = 'DEPLOYED' WHERE availability_status IN ('EN_ROUTE', 'ON_SCENE')"))


def init_db():
    """Create tables if they don't exist and apply safe backward-compatible column upgrades."""
    Base.metadata.create_all(bind=engine)
    _apply_safe_sqlite_column_upgrades()
    logger.info("Database tables initialized.")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
