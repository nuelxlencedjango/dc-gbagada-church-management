from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class MVP(Base):
    __tablename__ = "mvps"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    occupation = Column(String(200), nullable=True)
    prayer_point = Column(Text, nullable=True)
    visit_date = Column(Date, nullable=False)
    status = Column(String(20), default="new")  # new, followed_up, converted
    notes = Column(Text, nullable=True)

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = relationship("User", foreign_keys=[assigned_to_id])

    converted_member_id = Column(Integer, ForeignKey("members.id"), nullable=True)
    converted_member = relationship("Member", foreign_keys=[converted_member_id])
    converted_at = Column(DateTime(timezone=True), nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id])

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())