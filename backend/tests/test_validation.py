import pytest
from app.services.validation import data_processor

def test_validation_factor_normalization():
    raw_data = {
        "incident_code": "INC-TEST",
        "incident_type": "Fire",
        "description": "Test fire incident",
        "location": "Bengaluru",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "severity": 150.0,  # exceeds 100
        "impact": -20.0,    # below 0
        "urgency": 90.0,
        "vulnerability": 75.0,
        "accessibility": 50.0,
        "people_affected": -5
    }
    cleaned = data_processor.validate_and_normalize_incident_data(raw_data)
    assert cleaned["severity"] == 100.0
    assert cleaned["impact"] == 0.0
    assert cleaned["people_affected"] == 0
    assert cleaned["is_in_target_region"] is True

def test_validation_invalid_coordinates():
    raw_data = {
        "incident_code": "INC-TEST-INVALID",
        "incident_type": "Flood",
        "description": "Test flood",
        "location": "Nowhere",
        "latitude": 95.0,  # Invalid latitude > 90
        "longitude": 77.5946,
        "severity": 50.0,
        "impact": 50.0,
        "urgency": 50.0,
        "vulnerability": 50.0,
        "accessibility": 50.0,
        "people_affected": 10
    }
    with pytest.raises(ValueError, match="Invalid latitude"):
        data_processor.validate_and_normalize_incident_data(raw_data)

def test_haversine_distance_calculation():
    # Hebbal (13.0358, 77.5970) to Yelahanka (13.1007, 77.5963) is approx 7.2 km
    dist = data_processor.calculate_distance_km(13.0358, 77.5970, 13.1007, 77.5963)
    assert 6.0 <= dist <= 8.5
