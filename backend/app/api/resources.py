import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import ALL_ROLES, ROLE_ADMIN, ROLE_COORDINATOR, ROLE_RESOURCE_MANAGER, require_roles
from app.database.session import get_db
from app.models.resource import Resource
from app.models.incident import Incident
from app.models.allocation import ResourceAllocation
from app.models.user import User
from app.schemas.resource import (
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
    normalize_resource_status,
)
from app.services.audit_service import log_audit_event
from app.services.alert_service import sync_system_alerts
from app.core.logging import logger

router = APIRouter(prefix="/resources", tags=["Resources"])


def enrich_resource(resource: Resource, db: Session) -> ResourceResponse:
    resp = ResourceResponse.model_validate(resource)
    if resource.assigned_incident_id:
        inc = db.query(Incident).filter(Incident.id == resource.assigned_incident_id).first()
        if inc:
            resp.assigned_incident_code = inc.incident_code
            resp.assigned_incident_title = inc.title or f"{inc.incident_type} — {inc.location}"
    return resp


@router.get("", response_model=List[ResourceResponse])
def get_resources(
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by availability status"),
    search: Optional[str] = Query(None, description="Search resource name, code or location"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    query = db.query(Resource)
    if resource_type:
        query = query.filter(Resource.resource_type.ilike(f"%{resource_type}%"))
    if status_filter:
        query = query.filter(Resource.availability_status == normalize_resource_status(status_filter))
    if search:
        s_fmt = f"%{search}%"
        query = query.filter(
            (Resource.name.ilike(s_fmt))
            | (Resource.resource_code.ilike(s_fmt))
            | (Resource.current_location.ilike(s_fmt))
            | (Resource.resource_type.ilike(s_fmt))
        )
    resources = query.order_by(Resource.resource_type, Resource.resource_code).all()
    return [enrich_resource(r, db) for r in resources]


@router.get("/available", response_model=List[ResourceResponse])
def get_available_resources(
    resource_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    query = db.query(Resource).filter(
        Resource.availability_status == "AVAILABLE",
        Resource.assigned_incident_id.is_(None),
    )
    if resource_type:
        query = query.filter(Resource.resource_type.ilike(f"%{resource_type}%"))
    return [enrich_resource(r, db) for r in query.all()]


@router.get("/deployed", response_model=List[ResourceResponse])
def get_deployed_resources(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    resources = (
        db.query(Resource)
        .filter(Resource.availability_status.in_(["ASSIGNED", "DEPLOYED"]))
        .order_by(Resource.updated_at.desc())
        .all()
    )
    return [enrich_resource(r, db) for r in resources]


@router.get("/{resource_id}", response_model=ResourceResponse)
def get_resource_by_id(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Resource with ID {resource_id} not found")
    return enrich_resource(resource, db)


@router.get("/{resource_id}/detail")
def get_resource_detail(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Resource with ID {resource_id} not found")

    allocs = (
        db.query(ResourceAllocation)
        .filter(ResourceAllocation.resource_id == resource.id)
        .order_by(ResourceAllocation.allocated_at.desc())
        .all()
    )
    history = []
    for a in allocs:
        inc = db.query(Incident).filter(Incident.id == a.incident_id).first()
        history.append({
            "id": a.id,
            "incident_id": a.incident_id,
            "incident_code": inc.incident_code if inc else f"INC-{a.incident_id}",
            "incident_title": (inc.title or inc.incident_type) if inc else "Unknown",
            "distance_km": a.distance_km,
            "suitability_score": a.suitability_score,
            "decision_status": a.decision_status,
            "status": a.status,
            "decided_by": a.decided_by,
            "allocated_at": a.allocated_at,
            "released_at": a.released_at,
            "allocation_notes": a.allocation_notes,
        })

    return {
        "resource": enrich_resource(resource, db),
        "allocation_history": history,
    }


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
def create_resource(
    payload: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_RESOURCE_MANAGER, ROLE_COORDINATOR])),
):
    data = payload.model_dump()
    if not data.get("resource_code"):
        prefix = data["resource_type"][:3].upper()
        data["resource_code"] = f"{prefix}-{str(uuid.uuid4())[:4].upper()}"

    existing = db.query(Resource).filter(Resource.resource_code == data["resource_code"]).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Resource code {data['resource_code']} already exists",
        )

    new_res = Resource(
        resource_code=data["resource_code"],
        resource_type=data["resource_type"],
        name=data["name"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        capacity=data["capacity"],
        availability_status=data.get("availability_status", "AVAILABLE"),
        current_location=data["current_location"],
    )
    db.add(new_res)
    db.flush()
    log_audit_event(
        db,
        action="RESOURCE_CREATED",
        entity_type="RESOURCE",
        entity_id=str(new_res.id),
        user=current_user,
        details=f"Registered resource {new_res.resource_code} ({new_res.resource_type}) at {new_res.current_location}",
    )
    db.commit()
    db.refresh(new_res)
    sync_system_alerts(db)
    logger.info(f"Registered resource {new_res.resource_code} ({new_res.resource_type})")
    return enrich_resource(new_res, db)


@router.put("/{resource_id}", response_model=ResourceResponse)
def update_resource(
    resource_id: int,
    payload: ResourceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_RESOURCE_MANAGER, ROLE_COORDINATOR])),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Resource with ID {resource_id} not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "availability_status" in update_data and update_data["availability_status"] == "AVAILABLE":
        resource.assigned_incident_id = None

    for key, val in update_data.items():
        setattr(resource, key, val)

    log_audit_event(
        db,
        action="RESOURCE_UPDATED",
        entity_type="RESOURCE",
        entity_id=str(resource.id),
        user=current_user,
        details=f"Updated resource {resource.resource_code}; fields={list(update_data.keys())}; status={resource.availability_status}",
    )
    db.commit()
    db.refresh(resource)
    sync_system_alerts(db)
    return enrich_resource(resource, db)


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([ROLE_ADMIN, ROLE_RESOURCE_MANAGER])),
):
    resource = db.query(Resource).filter(Resource.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Resource with ID {resource_id} not found")
    code = resource.resource_code
    db.delete(resource)
    log_audit_event(
        db,
        action="RESOURCE_DELETED",
        entity_type="RESOURCE",
        entity_id=str(resource_id),
        user=current_user,
        details=f"Deleted resource {code}",
    )
    db.commit()
    sync_system_alerts(db)
    return None
