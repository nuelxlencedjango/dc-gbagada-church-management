from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Text, Numeric, Boolean
from sqlalchemy import Enum as SAEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base
import enum

class TransactionType(str, enum.Enum):
    OFFERING = "offering"
    TITHE = "tithe"
    FIRST_FRUITS = "first_fruits"
    GIFT = "gift"
    DONATION = "donation"
    EXPENSE = "expense"
    REQUEST = "request"

class TransactionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CONFIRMED = "confirmed"
    DISBURSED = "disbursed"

class Finance(Base):
    __tablename__ = "finances"

    id = Column(Integer, primary_key=True, index=True)

    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text)
    date = Column(DateTime(timezone=True), nullable=False)
    date_needed = Column(Date, nullable=True)
    service_type = Column(String(50))
    status = Column(SAEnum(TransactionStatus), default=TransactionStatus.PENDING)

    recorded_by_id = Column(Integer, ForeignKey("users.id"))
    recorded_by = relationship("User", foreign_keys=[recorded_by_id])
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Admin assigned at creation time to verify/confirm this transaction.
    # Label/assignment only — does not restrict who is actually allowed
    # to confirm (see confirm_transaction in finance_service.py).
    verified_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_by = relationship("User", foreign_keys=[verified_by_id])

    confirmed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_by = relationship("User", foreign_keys=[confirmed_by_id])
    confirmed_at = Column(DateTime(timezone=True), nullable=True)

    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    approved_at = Column(DateTime(timezone=True), nullable=True)

    disbursed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    disbursed_by = relationship("User", foreign_keys=[disbursed_by_id])
    disbursed_at = Column(DateTime(timezone=True), nullable=True)

    payment_method = Column(String(50))
    reference_number = Column(String(100))
    member_id = Column(Integer, ForeignKey("members.id"), nullable=True)
    member = relationship("Member")

    # Budget proposal fields
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department")
    budget_month = Column(Integer, nullable=True)   # 1–12, null = annual
    budget_year = Column(Integer, nullable=True)
    is_budget_proposal = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())