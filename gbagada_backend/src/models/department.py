from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class Department(Base):
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    head_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    head = relationship("User", foreign_keys=[head_id], backref="headed_departments")
    assistant_head_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assistant_head = relationship("User", foreign_keys=[assistant_head_id])
    
    members = relationship("Member", back_populates="department")
    activities = relationship("DepartmentActivity", back_populates="department")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class DepartmentActivity(Base):
    __tablename__ = "department_activities"
    
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"))
    department = relationship("Department", back_populates="activities")
    
    week_start_date = Column(Date, nullable=False)
    activities_performed = Column(Text)
    challenges = Column(Text)
    achievements = Column(Text)
    prayer_requests = Column(Text)
    report = Column(Text)
    
    submitted_by_id = Column(Integer, ForeignKey("users.id"))
    submitted_by = relationship("User")
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
