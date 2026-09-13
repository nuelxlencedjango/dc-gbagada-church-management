from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class Member(Base):
    __tablename__ = "members"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    
    title = Column(String(10))
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    middle_name = Column(String(100))
    date_of_birth = Column(Date)
    gender = Column(String(10))
    marital_status = Column(String(20))
    wedding_anniversary = Column(Date)
    
    phone_number = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default="Nigeria")
    
    emergency_contact_name = Column(String(200))
    emergency_contact_phone = Column(String(20))
    emergency_contact_relationship = Column(String(50))
    
    member_since = Column(Date)
    membership_status = Column(String(20), default="active")
    is_first_timer = Column(Boolean, default=False)
    first_visit_date = Column(Date)

    # MVP (newcomer) training tracking. Not an attendee list on the
    # session itself — a direct flag on the person, set when an admin
    # marks their MVP training complete.
    eligible_for_membership = Column(Boolean, default=False)
    mvp_training_completed_at = Column(DateTime(timezone=True), nullable=True)
    
    occupation = Column(String(200))
    skills = Column(Text)
    profile_picture_url = Column(String(500))
    
    # Relationships
    user = relationship("User", back_populates="member", foreign_keys=[user_id])
    
    # Department and Cell
    cell_id = Column(Integer, ForeignKey("cells.id"), nullable=True)
    cell = relationship("Cell", back_populates="members")
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department", back_populates="members")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    registered_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    registered_by = relationship("User", foreign_keys=[registered_by_id])