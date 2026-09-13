from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class TrainingSession(Base):
    __tablename__ = "trainings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)

    training_type = Column(String(20), nullable=False, default="other")

    date = Column(Date, nullable=False)
    start_time = Column(String(5), nullable=True)
    end_time = Column(String(5), nullable=True)

    location = Column(String(200), nullable=True)
    facilitator = Column(String(200), nullable=True)
    max_capacity = Column(Integer, default=50)

    status = Column(String(20), default="scheduled")  # scheduled, ongoing, completed, cancelled
    notes = Column(Text, nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", foreign_keys=[created_by_id])

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class TrainingRegistration(Base):
    __tablename__ = "training_registrations"

    id = Column(Integer, primary_key=True, index=True)
    training_id = Column(Integer, ForeignKey("trainings.id"), nullable=False)
    training = relationship("TrainingSession")

    attendee_type = Column(String(10), nullable=False)  # 'member' or 'mvp'
    attendee_id = Column(Integer, nullable=False)

    # registered = signed up; attended = confirmed present; no_show = signed
    # up but didn't come. Distinct from signup itself, set afterward.
    status = Column(String(20), default="registered")

    registered_at = Column(DateTime(timezone=True), server_default=func.now())