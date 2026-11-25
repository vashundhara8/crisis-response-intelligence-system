import csv
import io
from datetime import datetime
from typing import Dict, Any, Optional
import pandas as pd
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.resource import Resource
from app.models.allocation import ResourceAllocation
from app.schemas.resource import VALID_RESOURCE_TYPES


class AnalyticsService:
    """
    Dedicated Analytics Service for Emergency Operations Decision Support.
    Computes distributions, utilization, allocation statistics, resolution statistics,
    and resource shortage indicators directly from stored database records.
    """

    @staticmethod
    def _filter_incidents(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        incident_type: Optional[str] = None,
    ):
        query = db.query(Incident)
        if incident_type:
            query = query.filter(Incident.incident_type.ilike(f"%{incident_type}%"))
        if start_date:
            try:
                dt_start = datetime.fromisoformat(start_date)
                query = query.filter(Incident.created_at >= dt_start)
            except ValueError:
                pass
        if end_date:
            try:
                dt_end = datetime.fromisoformat(end_date)
                if len(end_date) == 10:
                    dt_end = dt_end.replace(hour=23, minute=59, second=59)
                query = query.filter(Incident.created_at <= dt_end)
            except ValueError:
                pass
        return query.all()

    @staticmethod
    def get_overview_analytics(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        incident_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        incidents = AnalyticsService._filter_incidents(db, start_date, end_date, incident_type)
        resources = db.query(Resource).all()
        incident_ids = {i.id for i in incidents}

        alloc_query = db.query(ResourceAllocation)
        allocations = [a for a in alloc_query.all() if (not incident_type and not start_date and not end_date) or a.incident_id in incident_ids]

        incidents_data = [
            {
                "id": i.id,
                "incident_type": i.incident_type,
                "priority_level": "MODERATE" if i.priority_level == "MEDIUM" else i.priority_level,
                "priority_score": i.priority_score,
                "severity": i.severity,
                "impact": i.impact,
                "urgency": i.urgency,
                "vulnerability": i.vulnerability,
                "accessibility": i.accessibility,
                "people_affected": i.people_affected,
                "injuries": i.injuries or 0,
                "casualties": i.casualties or 0,
                "status": i.status,
            }
            for i in incidents
        ]

        resources_data = [
            {
                "id": r.id,
                "resource_type": r.resource_type,
                "capacity": r.capacity,
                "availability_status": r.availability_status,
            }
            for r in resources
        ]

        df_inc = (
            pd.DataFrame(incidents_data)
            if incidents_data
            else pd.DataFrame(columns=["priority_level", "incident_type", "status", "priority_score", "people_affected", "injuries", "casualties"])
        )

        # 1. Incidents by Priority
        priority_counts = {"CRITICAL": 0, "HIGH": 0, "MODERATE": 0, "LOW": 0}
        if not df_inc.empty and "priority_level" in df_inc:
            for lvl, count in df_inc["priority_level"].value_counts().items():
                key = "MODERATE" if str(lvl) == "MEDIUM" else str(lvl)
                if key in priority_counts:
                    priority_counts[key] = int(count)

        incidents_by_priority = [
            {
                "priority": k,
                "count": v,
                "color": (
                    "#DC3545" if k == "CRITICAL"
                    else "#F59E0B" if k == "HIGH"
                    else "#3B82F6" if k == "MODERATE"
                    else "#64748b"
                ),
            }
            for k, v in priority_counts.items()
        ]

        # 2. Incidents by Type
        incidents_by_type = []
        if not df_inc.empty and "incident_type" in df_inc:
            type_counts = df_inc["incident_type"].value_counts()
            incidents_by_type = [{"type": k, "count": int(v)} for k, v in type_counts.items()]

        # 3. Incidents by Status
        status_breakdown = []
        if not df_inc.empty and "status" in df_inc:
            status_counts = df_inc["status"].value_counts()
            status_breakdown = [{"status": k, "count": int(v)} for k, v in status_counts.items()]

        # 4. Resource Utilization & Shortage Indicators
        df_res = (
            pd.DataFrame(resources_data)
            if resources_data
            else pd.DataFrame(columns=["resource_type", "availability_status", "capacity"])
        )
        resource_utilization = []
        shortage_indicators = []
        for rtype in VALID_RESOURCE_TYPES:
            subset = df_res[df_res["resource_type"] == rtype] if not df_res.empty else pd.DataFrame()
            total = int(len(subset))
            deployed = int(len(subset[subset["availability_status"].isin(["DEPLOYED", "ASSIGNED"])])) if total else 0
            available = int(len(subset[subset["availability_status"] == "AVAILABLE"])) if total else 0
            unavailable = int(len(subset[subset["availability_status"].isin(["UNAVAILABLE", "UNDER_MAINTENANCE"])])) if total else 0
            utilization_pct = round((deployed / total * 100.0), 1) if total > 0 else 0.0
            resource_utilization.append({
                "resource_type": rtype,
                "total": total,
                "available": available,
                "deployed": deployed,
                "unavailable": unavailable,
                "utilization_rate": utilization_pct,
            })
            if total > 0 and available == 0:
                shortage_indicators.append({
                    "resource_type": rtype,
                    "status": "CRITICAL_SHORTAGE",
                    "available": available,
                    "total": total,
                    "message": f"0 of {total} {rtype} units currently available.",
                })
            elif total > 0 and available <= 1:
                shortage_indicators.append({
                    "resource_type": rtype,
                    "status": "LOW_RESERVE",
                    "available": available,
                    "total": total,
                    "message": f"Low reserve: only {available} of {total} {rtype} units available.",
                })

        # 5. Allocation & Resolution Statistics
        active_allocs = len([a for a in allocations if a.status == "ACTIVE"])
        released_allocs = len([a for a in allocations if a.status in ["RELEASED", "COMPLETED"]])
        rejected_allocs = len([a for a in allocations if a.decision_status == "REJECTED"])
        override_allocs = len([a for a in allocations if a.is_override])
        avg_distance = round(sum(a.distance_km for a in allocations) / len(allocations), 2) if allocations else 0.0

        resolved_count = len([i for i in incidents if i.status in ["RESOLVED", "CLOSED"]])
        active_count = len([i for i in incidents if i.status not in ["RESOLVED", "CLOSED"]])
        resolution_rate = round((resolved_count / len(incidents) * 100.0), 1) if incidents else 0.0

        avg_priority = round(float(df_inc["priority_score"].mean()), 2) if not df_inc.empty else 0.0
        total_people = int(df_inc["people_affected"].sum()) if not df_inc.empty else 0
        total_injuries = int(df_inc["injuries"].sum()) if not df_inc.empty else 0
        total_casualties = int(df_inc["casualties"].sum()) if not df_inc.empty else 0

        return {
            "incidents_by_priority": incidents_by_priority,
            "incidents_by_type": incidents_by_type,
            "incidents_by_status": status_breakdown,
            "resource_utilization": resource_utilization,
            "shortage_indicators": shortage_indicators,
            "allocation_stats": {
                "total_records": len(allocations),
                "active_allocations": active_allocs,
                "released_allocations": released_allocs,
                "rejected_recommendations": rejected_allocs,
                "manual_overrides": override_allocs,
                "average_dispatch_distance_km": avg_distance,
            },
            "resolution_stats": {
                "total_incidents": len(incidents),
                "active_incidents": active_count,
                "resolved_or_closed": resolved_count,
                "resolution_rate_pct": resolution_rate,
            },
            "total_incidents": len(incidents),
            "total_resources": len(resources),
            "total_allocations": len(allocations),
            "average_priority_score": avg_priority,
            "total_people_affected": total_people,
            "total_injuries": total_injuries,
            "total_casualties": total_casualties,
            "disclaimer": "ACADEMIC DECISION SUPPORT ONLY • COMPUTED FROM STORED DATABASE RECORDS",
        }

    @staticmethod
    def export_incidents_csv(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        incident_type: Optional[str] = None,
    ) -> str:
        incidents = AnalyticsService._filter_incidents(db, start_date, end_date, incident_type)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Incident Code",
            "Title",
            "Incident Type",
            "Location",
            "Latitude",
            "Longitude",
            "Status",
            "Priority Score",
            "Priority Level",
            "Severity",
            "Impact",
            "Urgency",
            "Vulnerability",
            "Accessibility",
            "People Affected",
            "Injuries",
            "Casualties",
            "Created At",
            "Last Recalculated At",
        ])
        for inc in incidents:
            writer.writerow([
                inc.incident_code,
                inc.title,
                inc.incident_type,
                inc.location,
                inc.latitude,
                inc.longitude,
                inc.status,
                inc.priority_score,
                inc.priority_level,
                inc.severity,
                inc.impact,
                inc.urgency,
                inc.vulnerability,
                inc.accessibility,
                inc.people_affected,
                inc.injuries,
                inc.casualties,
                inc.created_at.isoformat() if inc.created_at else "",
                inc.last_recalculated_at.isoformat() if inc.last_recalculated_at else "",
            ])
        return output.getvalue()


analytics_service = AnalyticsService()
