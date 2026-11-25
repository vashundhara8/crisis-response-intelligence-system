import json
import os
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.resource import Resource
from app.models.weights import PriorityWeights
from app.models.allocation import ResourceAllocation, IncidentStatusHistory
from app.models.priority_score import PriorityScore
from app.models.alert import Alert
from app.models.user import User
from app.engines.priority_engine import priority_engine
from app.services.validation import data_processor
from app.services.alert_service import sync_system_alerts
from app.schemas.incident import normalize_incident_status
from app.schemas.resource import normalize_resource_status, normalize_resource_type
from app.core.security import hash_password
from app.core.logging import logger


def seed_database(db: Session, force_reset: bool = False):
    """
    Seed database with simulated Bengaluru incidents, resources, and optional demo users.
    """
    incident_count = db.query(Incident).count()
    resource_count = db.query(Resource).count()
    weights_count = db.query(PriorityWeights).count()

    if force_reset:
        logger.info("Force reset requested: purging operational scenario tables...")
        db.query(Alert).delete()
        db.query(PriorityScore).delete()
        db.query(ResourceAllocation).delete()
        db.query(IncidentStatusHistory).delete()
        db.query(Resource).delete()
        db.query(Incident).delete()
        db.query(PriorityWeights).delete()
        db.commit()
        incident_count = 0
        resource_count = 0
        weights_count = 0

    # 1. Seed Demonstration Weights if missing
    if weights_count == 0:
        default_weights = PriorityWeights(
            severity_weight=0.30,
            impact_weight=0.25,
            urgency_weight=0.20,
            vulnerability_weight=0.15,
            accessibility_weight=0.10,
            is_active=True,
        )
        db.add(default_weights)
        db.commit()
        logger.info("Seeded default demonstration weights.")

    # Locate simulated JSON files
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    incidents_path = base_dir / "data" / "simulated" / "incidents.json"
    resources_path = base_dir / "data" / "simulated" / "resources.json"

    # 2. Seed Incidents
    if incident_count == 0 and incidents_path.exists():
        with open(incidents_path, "r", encoding="utf-8") as f:
            incidents_data = json.load(f)

        for item in incidents_data:
            cleaned = data_processor.validate_and_normalize_incident_data(item)
            incident = Incident(
                incident_code=cleaned["incident_code"],
                title=cleaned.get("title") or f"{cleaned['incident_type']} — {cleaned['location']}",
                incident_type=cleaned["incident_type"],
                description=cleaned["description"],
                location=cleaned["location"],
                latitude=cleaned["latitude"],
                longitude=cleaned["longitude"],
                severity=cleaned["severity"],
                impact=cleaned["impact"],
                urgency=cleaned["urgency"],
                vulnerability=cleaned["vulnerability"],
                accessibility=cleaned["accessibility"],
                people_affected=cleaned["people_affected"],
                injuries=cleaned.get("injuries", 0),
                casualties=cleaned.get("casualties", 0),
                status=normalize_incident_status(cleaned.get("status", "REPORTED")),
            )
            db.add(incident)
            db.flush()
            priority_engine.apply_to_incident(db, incident, record_snapshot=True)
        db.commit()
        logger.info(f"Seeded {len(incidents_data)} simulated incidents.")

    # 3. Seed Resources
    if resource_count == 0 and resources_path.exists():
        with open(resources_path, "r", encoding="utf-8") as f:
            resources_data = json.load(f)

        for item in resources_data:
            res = Resource(
                resource_code=item["resource_code"],
                resource_type=normalize_resource_type(item["resource_type"]),
                name=item["name"],
                latitude=item["latitude"],
                longitude=item["longitude"],
                capacity=item["capacity"],
                availability_status=normalize_resource_status(item.get("availability_status", "AVAILABLE")),
                current_location=item["current_location"],
            )
            db.add(res)
        db.commit()
        logger.info(f"Seeded {len(resources_data)} simulated emergency resources.")

    # 4. Seed initial role accounts only if DEMO_SEED_PASSWORD is configured via environment
    demo_pw = os.getenv("DEMO_SEED_PASSWORD")
    if demo_pw and db.query(User).count() == 0:
        hashed = hash_password(demo_pw)
        demo_users = [
            User(
                username="admin",
                email="admin@cris.local",
                full_name="System Administrator",
                hashed_password=hashed,
                role="Administrator",
                is_active=True,
            ),
            User(
                username="coordinator",
                email="coordinator@cris.local",
                full_name="Command Operations Coordinator",
                hashed_password=hashed,
                role="Emergency Coordinator",
                is_active=True,
            ),
            User(
                username="resource_mgr",
                email="manager@cris.local",
                full_name="Fleet Resource Manager",
                hashed_password=hashed,
                role="Resource Manager",
                is_active=True,
            ),
            User(
                username="viewer",
                email="viewer@cris.local",
                full_name="Operations Analyst Viewer",
                hashed_password=hashed,
                role="Viewer",
                is_active=True,
            ),
        ]
        db.add_all(demo_users)
        db.commit()
        logger.info("Seeded environment-configured demo RBAC user accounts.")

    # 5. Synchronize operational alerts
    sync_system_alerts(db)
