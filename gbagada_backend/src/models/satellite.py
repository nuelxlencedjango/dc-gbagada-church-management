from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class SatelliteChurch(Base):
    __tablename__ = "satellite_churches"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, unique=True)
    address = Column(Text, nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    country = Column(String(50), default="Nigeria")
    pastor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    pastor = relationship("User", foreign_keys=[pastor_id], backref="satellite_church")
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    service_time = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    established_date = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())