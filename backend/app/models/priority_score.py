from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class PriorityScore(Base):
    __tablename__ = "priority_scores"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    priority_score = Column(Float, nullable=False)
    priority_level = Column(String(20), nullable=False, index=True)
    severity_contribution = Column(Float, nullable=False, default=0.0)
    impact_contribution = Column(Float, nullable=False, default=0.0)
    urgency_contribution = Column(Float, nullable=False, default=0.0)
    vulnerability_contribution = Column(Float, nullable=False, default=0.0)
    accessibility_contribution = Column(Float, nullable=False, default=0.0)
    explanation = Column(Text, nullable=False)
    weights_snapshot = Column(Text, nullable=True)
    calculated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    incident = relationship("Incident", back_populates="priority_scores")

