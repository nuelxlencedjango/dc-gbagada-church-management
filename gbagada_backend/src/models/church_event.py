from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class ChurchEvent(Base):
    __tablename__ = "church_events"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    location = Column(String(200), nullable=True)
    satellite_id = Column(Integer, ForeignKey("satellite_churches.id"), nullable=True)
    satellite = relationship("SatelliteChurch", backref="events")
    is_published = Column(Boolean, default=True)
    image_url = Column(String(500), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())