from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base
import enum

class AnnouncementType(str, enum.Enum):
    PUBLIC = "public"
    INTERNAL = "internal"
    WORKERS_ONLY = "workers_only"

class Announcement(Base):
    __tablename__ = "announcements"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    announcement_type = Column(Enum(AnnouncementType), default=AnnouncementType.PUBLIC)
    
    is_published = Column(Boolean, default=True)
    published_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    target_cell_id = Column(Integer, ForeignKey("cells.id"), nullable=True)
    target_cell = relationship("Cell")
    target_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    target_department = relationship("Department")

    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    target_user = relationship("User", foreign_keys=[target_user_id]) 
    
    
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_by = relationship("User", foreign_keys=[created_by_id])
    
    priority = Column(String(20), default="normal")
    image_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    
