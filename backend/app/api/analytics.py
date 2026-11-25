from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.security import ALL_ROLES, require_roles
from app.database.session import get_db
from app.models.user import User
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
def get_analytics_overview(
    start_date: Optional[str] = Query(None, description="ISO start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO end date (YYYY-MM-DD)"),
    incident_type: Optional[str] = Query(None, description="Filter by incident type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    return analytics_service.get_overview_analytics(
        db,
        start_date=start_date,
        end_date=end_date,
        incident_type=incident_type,
    )


@router.get("/export-csv")
def export_analytics_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    incident_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(ALL_ROLES)),
):
    csv_content = analytics_service.export_incidents_csv(
        db,
        start_date=start_date,
        end_date=end_date,
        incident_type=incident_type,
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="cris_incidents_analytics.csv"'},
    )
