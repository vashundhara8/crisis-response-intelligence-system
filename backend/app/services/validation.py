import numpy as np
import pandas as pd
from typing import Dict, Any
from app.core.config import settings


class DataProcessingService:
    """
    Dedicated Data Ingestion & Validation Service.
    Cleans, validates, normalizes, and checks geospatial bounding criteria using Pandas and NumPy.
    """

    @staticmethod
    def validate_and_normalize_incident_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate, fill defaults, and clamp numerical factors to [0, 100]."""
        cleaned = dict(data)

        factors = ["severity", "impact", "urgency", "vulnerability", "accessibility"]
        for f in factors:
            val = cleaned.get(f)
            if val is None:
                cleaned[f] = 50.0
            else:
                cleaned[f] = float(np.clip(float(val), 0.0, 100.0))

        for count_field in ["people_affected", "injuries", "casualties"]:
            val = cleaned.get(count_field)
            cleaned[count_field] = max(0, int(val or 0))

        if not cleaned.get("title"):
            cleaned["title"] = f"{cleaned.get('incident_type', 'Incident')} — {cleaned.get('location', 'Sector')}"

        lat = float(cleaned.get("latitude", 0.0))
        lon = float(cleaned.get("longitude", 0.0))
        if not (-90.0 <= lat <= 90.0):
            raise ValueError(f"Invalid latitude: {lat}. Must be between -90 and 90.")
        if not (-180.0 <= lon <= 180.0):
            raise ValueError(f"Invalid longitude: {lon}. Must be between -180 and 180.")

        cleaned["latitude"] = lat
        cleaned["longitude"] = lon

        is_in_blr = (
            settings.BLR_MIN_LAT <= lat <= settings.BLR_MAX_LAT
            and settings.BLR_MIN_LON <= lon <= settings.BLR_MAX_LON
        )
        cleaned["is_in_target_region"] = bool(is_in_blr)

        return cleaned

    @staticmethod
    def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate Great-Circle Haversine distance between two points in kilometers."""
        R = 6371.0
        phi1 = np.radians(lat1)
        phi2 = np.radians(lat2)
        delta_phi = np.radians(lat2 - lat1)
        delta_lambda = np.radians(lon2 - lon1)

        a = np.sin(delta_phi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(delta_lambda / 2.0) ** 2
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
        distance = R * c
        return round(float(distance), 2)

    @staticmethod
    def generate_statistical_summary(incidents_data: list) -> Dict[str, Any]:
        """Generate statistical distributions of crisis metrics using Pandas."""
        if not incidents_data:
            return {
                "count": 0,
                "mean_severity": 0.0,
                "mean_impact": 0.0,
                "mean_urgency": 0.0,
                "mean_priority_score": 0.0,
                "total_people_affected": 0,
            }

        df = pd.DataFrame(incidents_data)
        return {
            "count": int(len(df)),
            "mean_severity": round(float(df["severity"].mean()), 2) if "severity" in df else 0.0,
            "mean_impact": round(float(df["impact"].mean()), 2) if "impact" in df else 0.0,
            "mean_urgency": round(float(df["urgency"].mean()), 2) if "urgency" in df else 0.0,
            "mean_priority_score": round(float(df["priority_score"].mean()), 2) if "priority_score" in df else 0.0,
            "total_people_affected": int(df["people_affected"].sum()) if "people_affected" in df else 0,
        }


data_processor = DataProcessingService()
