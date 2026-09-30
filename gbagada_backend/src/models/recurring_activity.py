from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base


class RecurringActivity(Base):
    """A recurring church activity shown on the public homepage —
    prayer meetings, communion service, counselling sessions, etc.
    Deliberately NOT tied to a specific calendar date (that's what the
    Service model is for): these repeat on a schedule described in
    plain text (e.g. 'Every Friday', 'Last Saturday of month', '1st
    Tuesday'), matching how the church actually communicates them
    (its Linktree page, church bulletin) rather than a rigid
    day-of-week/recurrence-rule engine nothing here needs yet.
    """
    __tablename__ = "recurring_activities"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(150), nullable=False)
    frequency_label = Column(String(100), nullable=False)   # e.g. "Every Friday", "1st Tuesday"
    time_label = Column(String(50), nullable=True)           # e.g. "10:00pm - 11:00pm"
    location = Column(String(200), nullable=True)             # e.g. "18 Ibrahim Onashokun St, Gbagada, Lagos"
    is_virtual = Column(Boolean, default=False, nullable=False)
    link = Column(String(500), nullable=True)                 # meeting link, if virtual
    description = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())