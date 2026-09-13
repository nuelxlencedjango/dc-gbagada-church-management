from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Time, Boolean, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class Service(Base):
    __tablename__ = "services"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    date = Column(DateTime(timezone=True), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time)
    
    overseer_id = Column(Integer, ForeignKey("users.id"))
    overseer = relationship("User", foreign_keys=[overseer_id])
    
    opening_prayer_id = Column(Integer, ForeignKey("users.id"))
    opening_prayer = relationship("User", foreign_keys=[opening_prayer_id])
    
    closing_prayer_id = Column(Integer, ForeignKey("users.id"))
    closing_prayer = relationship("User", foreign_keys=[closing_prayer_id])
    
    worship_leader_id = Column(Integer, ForeignKey("users.id"))
    worship_leader = relationship("User", foreign_keys=[worship_leader_id])
    
    speaker_id = Column(Integer, ForeignKey("users.id"))
    speaker = relationship("User", foreign_keys=[speaker_id])
    speaker_name = Column(String(200), nullable=True)
    
    additional_roles = Column(Text)
    
    theme = Column(String(200))
    notes = Column(Text)
    attendance = Column(Integer, default=0)
    
    offerings_recorded = Column(Boolean, default=False)
    offerings_total = Column(Numeric(15, 2), default=0)
    
    is_cancelled = Column(Boolean, default=False)
    cancellation_reason = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
