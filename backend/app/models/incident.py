from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from sqlalchemy.orm import relationship
from app.database.base import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False, default="")
    incident_type = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # Priority Factors (0.0 to 100.0)
    severity = Column(Float, nullable=False)
    impact = Column(Float, nullable=False)
    urgency = Column(Float, nullable=False)
    vulnerability = Column(Float, nullable=False)
    accessibility = Column(Float, nullable=False)

    # Impact casualty metrics
    people_affected = Column(Integer, nullable=False, default=0)
    injuries = Column(Integer, nullable=False, default=0)
    casualties = Column(Integer, nullable=False, default=0)

    # Status: REPORTED, UNDER_ASSESSMENT, ACTIVE, RESOURCES_ASSIGNED, RESOLVED, CLOSED
    status = Column(String(50), nullable=False, default="REPORTED", index=True)

    # Dynamic Priority Output
    priority_score = Column(Float, nullable=False, default=0.0, index=True)
    priority_level = Column(String(20), nullable=False, default="LOW", index=True)
    last_recalculated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    allocations = relationship("ResourceAllocation", back_populates="incident", cascade="all, delete-orphan")
    status_history = relationship("IncidentStatusHistory", back_populates="incident", cascade="all, delete-orphan")
    priority_scores = relationship("PriorityScore", back_populates="incident", cascade="all, delete-orphan")
    assigned_resources = relationship("Resource", back_populates="assigned_incident")
