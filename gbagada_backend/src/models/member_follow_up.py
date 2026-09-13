from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class MemberFollowUp(Base):
    __tablename__ = "member_follow_ups"

    id = Column(Integer, primary_key=True, index=True)

    member_id = Column(Integer, ForeignKey("members.id"), nullable=False)
    member = relationship("Member")

    follow_up_date = Column(Date, nullable=False)
    method = Column(String(20), nullable=False)  # call, visitation, message, other
    reason_for_inactivity = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)  # e.g. "will return", "no answer", "moved away"

    followed_up_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    followed_up_by = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())