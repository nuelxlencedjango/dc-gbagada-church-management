from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    serial_number = Column(String(100), unique=True)
    category = Column(String(100))
    purchase_date = Column(DateTime(timezone=True))
    purchase_price = Column(Numeric(15, 2))
    condition = Column(String(50))
    location = Column(String(200))
    status = Column(String(50), default="available")
    
    # 👇 FIX: Add foreign_keys to resolve ambiguity
    assigned_to_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assigned_to_department = relationship("Department", foreign_keys=[assigned_to_department_id])
    
    assigned_to_person_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to_person = relationship("User", foreign_keys=[assigned_to_person_id])
    
    last_maintenance_date = Column(DateTime(timezone=True))
    next_maintenance_date = Column(DateTime(timezone=True))
    maintenance_notes = Column(Text)
    
    pictures_urls = Column(Text)
    
    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
