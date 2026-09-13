from sqlalchemy import Column, Integer, String, DateTime,Numeric, ForeignKey, Text, Boolean, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class Cell(Base):
    __tablename__ = "cells"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    meeting_day = Column(String(20))
    meeting_time = Column(String(20))
    meeting_location = Column(String(200))
    is_active = Column(Boolean, default=True)
    
    leader_id = Column(Integer, ForeignKey("users.id"))
    leader = relationship("User", foreign_keys=[leader_id], backref="led_cells")
    assistant_leader_id = Column(Integer, ForeignKey("users.id"))
    assistant_leader = relationship("User", foreign_keys=[assistant_leader_id])
    
    members = relationship("Member", back_populates="cell")
    activities = relationship("CellActivity", back_populates="cell")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class CellActivity(Base):
    __tablename__ = "cell_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    cell_id = Column(Integer, ForeignKey("cells.id"))
    cell = relationship("Cell", back_populates="activities")
    
    week_start_date = Column(Date, nullable=False)
    attendance = Column(Integer)
    new_members_count = Column(Integer, default=0)
    prayer_points = Column(Text)
    testimonies = Column(Text)
    challenges = Column(Text)
    report = Column(Text)
    
    submitted_by_id = Column(Integer, ForeignKey("users.id"))
    submitted_by = relationship("User")
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    offering_amount = Column(Numeric(15, 2), nullable=True)
    meeting_location = Column(String(200), nullable=True)
    attendee_names = Column(Text, nullable=True)
    children_names = Column(Text, nullable=True)
