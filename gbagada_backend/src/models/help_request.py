from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class HelpRequest(Base):
    __tablename__ = "help_requests"

    id = Column(Integer, primary_key=True, index=True)

    # 'cell' or 'department' — which self-service portal this came from
    source_type = Column(String(20), nullable=False)
    source_id = Column(Integer, nullable=False)  # cell_id or department_id

    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)
    member = relationship("Member")

    description = Column(Text, nullable=False)
    status = Column(String(20), default="pending")  # pending, resolved

    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_by = relationship("User", foreign_keys=[submitted_by_id])

    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    admin_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())