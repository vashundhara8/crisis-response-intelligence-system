from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, Boolean, DateTime
from app.database.base import Base

class PriorityWeights(Base):
    __tablename__ = "demonstration_weights"

    id = Column(Integer, primary_key=True, index=True)
    severity_weight = Column(Float, nullable=False, default=0.30)
    impact_weight = Column(Float, nullable=False, default=0.25)
    urgency_weight = Column(Float, nullable=False, default=0.20)
    vulnerability_weight = Column(Float, nullable=False, default=0.15)
    accessibility_weight = Column(Float, nullable=False, default=0.10)
    is_active = Column(Boolean, nullable=False, default=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
