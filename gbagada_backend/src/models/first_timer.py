from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class FirstTimer(Base):
    __tablename__ = "first_timers"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone_number = Column(String(20), nullable=False)
    email = Column(String(255))
    address = Column(Text)
    how_heard = Column(String(200))
    visit_date = Column(Date, nullable=False)
    
    assigned_to_id = Column(Integer, ForeignKey("users.id"))
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])
    
    follow_up_status = Column(String(50), default="pending")
    follow_up_notes = Column(Text)
    follow_up_date = Column(DateTime(timezone=True))
    follow_up_by_id = Column(Integer, ForeignKey("users.id"))
    follow_up_by = relationship("User", foreign_keys=[follow_up_by_id])
    
    became_member = Column(Boolean, default=False)
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)
    member = relationship("Member")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())