from typing import List, Dict
from app.models.incident import Incident
from app.models.resource import Resource
from app.services.validation import data_processor
from app.schemas.allocation import ResourceRecommendationItem
from app.schemas.resource import ResourceResponse

# Resource compatibility mapping by incident type (covering all 6 resource types)
INCIDENT_COMPATIBILITY_RULES: Dict[str, List[str]] = {
    "building collapse": ["Rescue Team", "Fire and Rescue Unit", "Ambulance", "Medical Unit", "Emergency Supply Unit"],
    "flash flood": ["Rescue Team", "Fire and Rescue Unit", "Shelter", "Ambulance", "Medical Unit", "Emergency Supply Unit"],
    "road accident": ["Ambulance", "Rescue Team", "Fire and Rescue Unit", "Medical Unit"],
    "industrial fire": ["Fire and Rescue Unit", "Rescue Team", "Medical Unit", "Ambulance", "Emergency Supply Unit"],
    "commercial fire": ["Fire and Rescue Unit", "Rescue Team", "Ambulance", "Medical Unit"],
    "medical emergency": ["Ambulance", "Medical Unit", "Emergency Supply Unit"],
    "chemical leak": ["Fire and Rescue Unit", "Medical Unit", "Rescue Team", "Ambulance", "Emergency Supply Unit"],
    "structural threat": ["Rescue Team", "Fire and Rescue Unit", "Shelter", "Emergency Supply Unit"],
    "power substation surge": ["Fire and Rescue Unit", "Rescue Team", "Medical Unit"],
    "urban waterlogging": ["Rescue Team", "Shelter", "Ambulance", "Emergency Supply Unit"],
    "landslide / tree fall": ["Rescue Team", "Fire and Rescue Unit", "Ambulance"],
}


class ResourceAllocationEngine:
    """
    Operational Decision-Support Allocation Engine.
    Evaluates prioritized incidents against fleet units using:
    - Hazard-to-resource type compatibility matching
    - Strict availability filtering
    - Haversine geospatial proximity
    - Accessibility ingress penalty adjustment
    - Capacity suitability check
    - Explainable multi-criteria ranking
    """

    def get_compatible_types(self, incident_type: str) -> List[str]:
        cleaned = incident_type.strip().lower()
        for key, types in INCIDENT_COMPATIBILITY_RULES.items():
            if key in cleaned or cleaned in key:
                return types
        return [
            "Ambulance",
            "Rescue Team",
            "Medical Unit",
            "Fire and Rescue Unit",
            "Emergency Supply Unit",
            "Shelter",
        ]

    def evaluate_resource_for_incident(
        self,
        incident: Incident,
        resource: Resource,
    ) -> ResourceRecommendationItem:
        # 1. Geospatial Haversine distance
        dist_km = data_processor.calculate_distance_km(
            incident.latitude,
            incident.longitude,
            resource.latitude,
            resource.longitude,
        )

        # 2. Compatibility check
        compatible_types = self.get_compatible_types(incident.incident_type)
        is_compatible = resource.resource_type in compatible_types
        compatibility_score = 100.0 if is_compatible else 20.0

        # 3. Availability & duplicate assignment check
        is_available = (
            resource.availability_status == "AVAILABLE"
            and resource.assigned_incident_id is None
        )

        # 4. Capacity check against affected population (and injuries)
        demand = max(1, incident.people_affected or 1)
        if resource.capacity >= demand:
            capacity_check = f"Full capacity coverage ({resource.capacity} capacity vs {incident.people_affected} affected)"
            cap_score = 100.0
        elif resource.capacity >= (demand * 0.3):
            capacity_check = f"Partial triage capacity ({resource.capacity} capacity vs {incident.people_affected} affected)"
            cap_score = 75.0
        else:
            capacity_check = f"Initial response capacity ({resource.capacity} capacity vs {incident.people_affected} affected; supplementary units advised)"
            cap_score = 50.0

        # 5. Accessibility penalty (lower accessibility increases effective transit penalty)
        access_factor = max(0.0, min(1.0, (incident.accessibility or 50.0) / 100.0))
        effective_travel_penalty = round((1.0 - access_factor) * 5.0, 2)  # 0 to 5 km effective penalty
        effective_distance = dist_km + effective_travel_penalty
        accessibility_consideration = (
            f"Site accessibility {incident.accessibility:.0f}/100 "
            f"(+{effective_travel_penalty:.2f} km ingress penalty; effective transit {effective_distance:.2f} km)"
        )

        # 6. Composite suitability score (0-100)
        # Proximity with accessibility penalty (45%), Compatibility (30%), Capacity (15%), Availability (10%)
        distance_score = max(0.0, 100.0 - (effective_distance * 4.0))

        if not is_available:
            suitability = 0.0
        else:
            suitability = (
                distance_score * 0.45
                + compatibility_score * 0.30
                + cap_score * 0.15
                + 100.0 * 0.10
            )
            if not is_compatible:
                suitability = min(suitability, 59.0)

        # 7. Explainable recommendation rationale
        if not is_available:
            assigned_note = (
                f" (assigned to incident #{resource.assigned_incident_id})"
                if resource.assigned_incident_id
                else ""
            )
            explanation = (
                f"Unavailable for dispatch: status is {resource.availability_status}{assigned_note}."
            )
        elif is_compatible:
            explanation = (
                f"Recommended for {incident.incident_code} ({incident.priority_level}, {incident.priority_score}/100): "
                f"{resource.name} [{resource.resource_type}] is {dist_km} km away, matches '{incident.incident_type}', "
                f"{capacity_check}, with {accessibility_consideration}."
            )
        else:
            explanation = (
                f"Non-primary type for '{incident.incident_type}' (requires manual coordinator override): "
                f"{resource.name} is {dist_km} km away. {capacity_check}. {accessibility_consideration}."
            )

        res_dto = ResourceResponse.model_validate(resource)
        return ResourceRecommendationItem(
            incident_id=incident.id,
            incident_priority_score=incident.priority_score,
            incident_priority_level=incident.priority_level,
            resource=res_dto,
            resource_type=resource.resource_type,
            distance_km=dist_km,
            accessibility_penalty=effective_travel_penalty,
            accessibility_consideration=accessibility_consideration,
            compatibility_score=compatibility_score,
            is_compatible=is_compatible,
            capacity_score=cap_score,
            capacity_check=capacity_check,
            availability_status=resource.availability_status,
            overall_suitability_score=round(suitability, 2),
            explanation=explanation,
        )

    def rank_resources(
        self,
        incident: Incident,
        resources: List[Resource],
    ) -> List[ResourceRecommendationItem]:
        evaluations = [
            self.evaluate_resource_for_incident(incident, res)
            for res in resources
        ]

        return sorted(
            evaluations,
            key=lambda x: (
                1 if (x.availability_status == "AVAILABLE" and x.resource.assigned_incident_id is None) else 0,
                1 if x.is_compatible else 0,
                x.overall_suitability_score,
                -x.distance_km,
            ),
            reverse=True,
        )


allocation_engine = ResourceAllocationEngine()
