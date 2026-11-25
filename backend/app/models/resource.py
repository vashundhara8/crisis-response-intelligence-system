from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    resource_code = Column(String(50), unique=True, index=True, nullable=False)
    # Types: Ambulance, Rescue Team, Medical Unit, Fire and Rescue Unit, Emergency Supply Unit, Shelter
    resource_type = Column(String(80), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=False, default=1)

    # Status: AVAILABLE, ASSIGNED, DEPLOYED, UNAVAILABLE, UNDER_MAINTENANCE
    availability_status = Column(String(50), nullable=False, default="AVAILABLE", index=True)
    current_location = Column(String(255), nullable=False)
    assigned_incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    allocations = relationship("ResourceAllocation", back_populates="resource", cascade="all, delete-orphan")
    assigned_incident = relationship("Incident", back_populates="assigned_resources")
