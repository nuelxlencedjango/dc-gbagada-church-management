from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class ChildrenClass(Base):
    """A class within the Children's Department — e.g. 'Toddlers',
    'Grade 1-3'. Linked to the existing Children Ministry Department
    record rather than being a fully separate system."""
    __tablename__ = "children_classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    age_range = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department")

    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    teacher = relationship("User", foreign_keys=[teacher_id])
    assistant_teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assistant_teacher = relationship("User", foreign_keys=[assistant_teacher_id])

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Child(Base):
    """An individual child enrolled in a class — a real record with
    parent/guardian contact info, but deliberately no pickup-verification
    workflow (not requested, and out of scope for this build)."""
    __tablename__ = "children"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)

    class_id = Column(Integer, ForeignKey("children_classes.id"), nullable=True)
    class_group = relationship("ChildrenClass")

    parent_name = Column(String(200), nullable=True)
    parent_phone = Column(String(20), nullable=True)
    parent_email = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChildAttendance(Base):
    """One row per child per date a class met — simple present/absent,
    no check-in/check-out or guardian-matching workflow."""
    __tablename__ = "child_attendance"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id"), nullable=False)
    child = relationship("Child")
    class_id = Column(Integer, ForeignKey("children_classes.id"), nullable=False)
    class_group = relationship("ChildrenClass")

    date = Column(Date, nullable=False)
    present = Column(Boolean, default=True)

    recorded_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    recorded_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ClassLesson(Base):
    """A simple log of what was taught in a class on a given date —
    gives teachers continuity across weeks."""
    __tablename__ = "class_lessons"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("children_classes.id"), nullable=False)
    class_group = relationship("ChildrenClass")

    date = Column(Date, nullable=False)
    title = Column(String(200), nullable=False)
    notes = Column(Text, nullable=True)

    taught_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    taught_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())