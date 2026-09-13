from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

# These two tables belong to the Head of Department self-service portal.
# They reference "departments" by department_id only — the admin-facing
# Department/DepartmentActivity model (src/models/department.py) is never
# modified by this file, keeping admin department management and the
# HOD's own portal cleanly separate even though they share the same
# underlying Department rows.

class DepartmentProgram(Base):
    """A planned event/program for a department — distinct from the
    weekly activity recap, which is a report of what already happened."""
    __tablename__ = "department_programs"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    department = relationship("Department")

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    program_date = Column(Date, nullable=False)
    program_time = Column(String(20), nullable=True)
    location = Column(String(200), nullable=True)

    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class DepartmentContribution(Base):
    """A donation/contribution made toward the department — recorded by
    the HOD directly, not routed through the main admin Finance
    dual-approval workflow (same lightweight approach as a cell's
    offering_amount on CellActivity)."""
    __tablename__ = "department_contributions"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    department = relationship("Department")

    contributor_name = Column(String(200), nullable=True)  # free text — may not be a registered Member
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)
    member = relationship("Member")

    amount = Column(Numeric(15, 2), nullable=False)
    purpose = Column(String(200), nullable=True)
    contribution_date = Column(Date, nullable=False)

    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recorded_by = relationship("User")

    created_at = Column(DateTime(timezone=True), server_default=func.now())