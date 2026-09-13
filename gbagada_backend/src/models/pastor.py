from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class Pastor(Base):
    __tablename__ = "pastors"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    user = relationship("User", backref="pastor_profile")
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    bio = Column(Text, nullable=True)
    profile_picture = Column(String(500), nullable=True)
    ordination_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    assigned_satellite_id = Column(Integer, ForeignKey("satellite_churches.id"), nullable=True)
    assigned_satellite = relationship("SatelliteChurch", foreign_keys=[assigned_satellite_id])
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())