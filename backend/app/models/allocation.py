from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.base import Base


class ResourceAllocation(Base):
    __tablename__ = "resource_allocations"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    distance_km = Column(Float, nullable=False, default=0.0)
    suitability_score = Column(Float, nullable=False, default=0.0)
    recommendation_reason = Column(Text, nullable=True)
    allocation_notes = Column(Text, nullable=True)
    decision_status = Column(String(30), nullable=False, default="ACCEPTED", index=True)  # ACCEPTED, REJECTED, OVERRIDDEN, RELEASED
    is_override = Column(Boolean, nullable=False, default=False)
    decided_by = Column(String(100), nullable=True)
    allocated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    released_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), nullable=False, default="ACTIVE", index=True)  # ACTIVE, COMPLETED, CANCELLED, RELEASED, REJECTED

    # Relationships
    incident = relationship("Incident", back_populates="allocations")
    resource = relationship("Resource", back_populates="allocations")


class IncidentStatusHistory(Base):
    __tablename__ = "incident_status_history"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by = Column(String(100), default="CRIS_DECISION_SUPPORT")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    incident = relationship("Incident", back_populates="status_history")
