from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base
import enum

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    OVERALL_PASTOR = "overall_pastor"  # full privileges, separate from regular pastors
    PASTOR = "pastor"
    ADMIN = "admin"
    DEPARTMENT_HEAD = "department_head"
    CELL_LEADER = "cell_leader"
    MEMBER = "member"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.MEMBER)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    whatsapp_opt_in = Column(Boolean, default=False)
    email_opt_in = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    member = relationship("Member", back_populates="user", uselist=False, foreign_keys="Member.user_id")
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by = relationship("User", remote_side=[id])
    last_login = Column(DateTime(timezone=True), nullable=True)