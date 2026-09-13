from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

# Self-service reporting tables for the Pastor portal. Kept in their own
# file, same pattern as department_program.py — references pastors.id by
# FK only, never modifies the existing Pastor model.

class PastorReport(Base):
    __tablename__ = "pastor_reports"

    id = Column(Integer, primary_key=True, index=True)
    pastor_id = Column(Integer, ForeignKey("pastors.id"), nullable=False)
    pastor = relationship("Pastor")

    week_start_date = Column(Date, nullable=False)
    activities_performed = Column(Text, nullable=True)
    challenges = Column(Text, nullable=True)
    achievements = Column(Text, nullable=True)
    prayer_requests = Column(Text, nullable=True)
    report = Column(Text, nullable=True)

    submitted_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_by = relationship("User")
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())


class PastorProgram(Base):
    __tablename__ = "pastor_programs"

    id = Column(Integer, primary_key=True, index=True)
    pastor_id = Column(Integer, ForeignKey("pastors.id"), nullable=False)
    pastor = relationship("Pastor")

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    program_date = Column(Date, nullable=False)
    program_time = Column(String(20), nullable=True)
    location = Column(String(200), nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PastorContribution(Base):
    __tablename__ = "pastor_contributions"

    id = Column(Integer, primary_key=True, index=True)
    pastor_id = Column(Integer, ForeignKey("pastors.id"), nullable=False)
    pastor = relationship("Pastor")

    contributor_name = Column(String(200), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    purpose = Column(String(200), nullable=True)
    contribution_date = Column(Date, nullable=False)

    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recorded_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
