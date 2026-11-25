from types import SimpleNamespace
from typing import Dict, List, Any
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.resource import Resource
from app.engines.priority_engine import priority_engine
from app.engines.allocation_engine import allocation_engine
from app.schemas.simulation import (
    SimulationRequest,
    SimulationResponse,
    SimulatedIncidentAllocation,
    ShortageWarning,
)
from app.schemas.resource import VALID_RESOURCE_TYPES


def run_what_if_simulation(db: Session, payload: SimulationRequest) -> SimulationResponse:
    """
    Execute an isolated in-memory what-if resource shortage & priority simulation.
    Never modifies database records.
    """
    incidents = db.query(Incident).filter(Incident.status.notin_(["RESOLVED", "CLOSED"])).all()
    resources = db.query(Resource).all()

    # Determine effective priority weights for simulation
    base_weights = priority_engine.get_active_weights_dict(db) or {
        "severity": priority_engine.w_sev,
        "impact": priority_engine.w_imp,
        "urgency": priority_engine.w_urg,
        "vulnerability": priority_engine.w_vul,
        "accessibility": priority_engine.w_acc,
    }
    sim_weights = {
        "severity": payload.severity_weight if payload.severity_weight is not None else base_weights["severity"],
        "impact": payload.impact_weight if payload.impact_weight is not None else base_weights["impact"],
        "urgency": payload.urgency_weight if payload.urgency_weight is not None else base_weights["urgency"],
        "vulnerability": payload.vulnerability_weight if payload.vulnerability_weight is not None else base_weights["vulnerability"],
        "accessibility": payload.accessibility_weight if payload.accessibility_weight is not None else base_weights["accessibility"],
    }
    total_w = sum(sim_weights.values())
    if total_w > 0:
        sim_weights = {k: v / total_w for k, v in sim_weights.items()}

    # Build temporary in-memory resource pool (never touching ORM objects)
    unavailable_set = set(payload.unavailable_resource_ids or [])
    pool_by_type: Dict[str, List[SimpleNamespace]] = {rt: [] for rt in VALID_RESOURCE_TYPES}

    for res in resources:
        if res.id in unavailable_set:
            continue
        if res.availability_status != "AVAILABLE" or res.assigned_incident_id is not None:
            continue
        sim_res = SimpleNamespace(
            id=res.id,
            resource_code=res.resource_code,
            resource_type=res.resource_type,
            name=res.name,
            latitude=res.latitude,
            longitude=res.longitude,
            capacity=res.capacity,
            availability_status="AVAILABLE",
            current_location=res.current_location,
            assigned_incident_id=None,
            created_at=res.created_at,
            updated_at=res.updated_at,
        )
        pool_by_type.setdefault(res.resource_type, []).append(sim_res)

    # Apply quantity caps / synthetic capacity adjustments per type
    type_target_map = {
        "Ambulance": payload.available_ambulances,
        "Rescue Team": payload.available_rescue_teams,
        "Medical Unit": payload.available_medical_units,
        "Fire and Rescue Unit": payload.available_fire_rescue_units,
        "Emergency Supply Unit": payload.available_supply_units,
        "Shelter": payload.available_shelters,
    }

    adjusted_pool: List[SimpleNamespace] = []
    simulated_fleet_counts: Dict[str, int] = {}

    for rtype in VALID_RESOURCE_TYPES:
        current_list = pool_by_type.get(rtype, [])
        target = type_target_map.get(rtype)
        if target is None:
            selected = current_list
        elif target <= len(current_list):
            selected = current_list[:target]
        else:
            # Add temporary virtual reserve units in-memory when user increases available count above DB stock
            selected = list(current_list)
            base_lat, base_lon = (12.9716, 77.5946)
            if current_list:
                base_lat, base_lon = current_list[0].latitude, current_list[0].longitude
            for idx in range(len(current_list), target):
                selected.append(
                    SimpleNamespace(
                        id=-(1000 + len(adjusted_pool) + idx),
                        resource_code=f"SIM-{rtype[:3].upper()}-{idx + 1}",
                        resource_type=rtype,
                        name=f"Simulated Reserve {rtype} #{idx + 1}",
                        latitude=base_lat,
                        longitude=base_lon,
                        capacity=20,
                        availability_status="AVAILABLE",
                        current_location="Simulated Regional Reserve",
                        assigned_incident_id=None,
                        created_at=incidents[0].created_at if incidents else None,
                        updated_at=incidents[0].updated_at if incidents else None,
                    )
                )
        simulated_fleet_counts[rtype] = len(selected)
        adjusted_pool.extend(selected)

    # Re-score active incidents in memory and sort by simulated priority
    sim_incidents = []
    for inc in incidents:
        calc = priority_engine.calculate(
            severity=inc.severity,
            impact=inc.impact,
            urgency=inc.urgency,
            vulnerability=inc.vulnerability,
            accessibility=inc.accessibility,
            custom_weights=sim_weights,
        )
        sim_incidents.append((inc, calc["priority_score"], calc["priority_level"]))

    sim_incidents.sort(key=lambda item: item[1], reverse=True)

    # Greedy priority-first assignment on the simulated pool
    used_resource_ids = set()
    simulated_allocations: List[SimulatedIncidentAllocation] = []
    unassigned_incidents: List[SimulatedIncidentAllocation] = []
    demand_by_type: Dict[str, int] = {rt: 0 for rt in VALID_RESOURCE_TYPES}

    for inc, sim_score, sim_level in sim_incidents:
        compat_types = allocation_engine.get_compatible_types(inc.incident_type)
        primary_type = compat_types[0] if compat_types else "Ambulance"
        demand_by_type[primary_type] = demand_by_type.get(primary_type, 0) + 1

        available_candidates = [r for r in adjusted_pool if r.id not in used_resource_ids]
        ranked = allocation_engine.rank_resources(inc, available_candidates)
        best = next((r for r in ranked if r.is_compatible and r.availability_status == "AVAILABLE"), None)

        if best:
            used_resource_ids.add(best.resource.id)
            item = SimulatedIncidentAllocation(
                incident_id=inc.id,
                incident_code=inc.incident_code,
                title=inc.title or f"{inc.incident_type} — {inc.location}",
                incident_type=inc.incident_type,
                location=inc.location,
                baseline_priority_score=inc.priority_score,
                simulated_priority_score=sim_score,
                simulated_priority_level=sim_level,
                assigned_resource_code=best.resource.resource_code,
                assigned_resource_name=best.resource.name,
                assigned_resource_type=best.resource_type,
                distance_km=best.distance_km,
                suitability_score=best.overall_suitability_score,
                has_compatible_resource=True,
                status_note=f"Matched {best.resource.resource_code} ({best.distance_km} km, suitability {best.overall_suitability_score})",
            )
            simulated_allocations.append(item)
        else:
            item = SimulatedIncidentAllocation(
                incident_id=inc.id,
                incident_code=inc.incident_code,
                title=inc.title or f"{inc.incident_type} — {inc.location}",
                incident_type=inc.incident_type,
                location=inc.location,
                baseline_priority_score=inc.priority_score,
                simulated_priority_score=sim_score,
                simulated_priority_level=sim_level,
                has_compatible_resource=False,
                status_note=f"SHORTAGE: No compatible { ' / '.join(compat_types[:2]) } unit remaining in simulated scenario.",
            )
            simulated_allocations.append(item)
            unassigned_incidents.append(item)

    # Shortage warnings
    shortage_warnings: List[ShortageWarning] = []
    for rtype, req_count in demand_by_type.items():
        avail_count = simulated_fleet_counts.get(rtype, 0)
        if req_count > avail_count:
            shortage = req_count - avail_count
            shortage_warnings.append(
                ShortageWarning(
                    resource_type=rtype,
                    required_count=req_count,
                    simulated_available=avail_count,
                    shortage_count=shortage,
                    severity="CRITICAL" if avail_count == 0 else "HIGH",
                    message=(
                        f"{rtype} deficit: {req_count} active incidents prioritize {rtype}, "
                        f"but only {avail_count} available in simulation (short by {shortage})."
                    ),
                )
            )
        elif avail_count == 0:
            shortage_warnings.append(
                ShortageWarning(
                    resource_type=rtype,
                    required_count=0,
                    simulated_available=0,
                    shortage_count=0,
                    severity="MODERATE",
                    message=f"Zero {rtype} units available under simulated constraints.",
                )
            )

    summary = (
        f"Evaluated {len(sim_incidents)} active incidents against {len(adjusted_pool)} simulated available units: "
        f"{len(sim_incidents) - len(unassigned_incidents)} covered, {len(unassigned_incidents)} left without compatible resources."
    )

    return SimulationResponse(
        is_simulation=True,
        database_modified=False,
        scenario_summary=summary,
        simulated_fleet_counts=simulated_fleet_counts,
        total_active_incidents=len(sim_incidents),
        covered_incidents_count=len(sim_incidents) - len(unassigned_incidents),
        unassigned_incidents_count=len(unassigned_incidents),
        simulated_allocations=simulated_allocations,
        unassigned_incidents=unassigned_incidents,
        shortage_warnings=shortage_warnings,
    )

