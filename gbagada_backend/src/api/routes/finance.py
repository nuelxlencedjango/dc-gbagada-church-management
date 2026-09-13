from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user, get_current_admin, get_current_pastor
from src.models.user import User
from src.models.finance import Finance, TransactionType, TransactionStatus
from src.services.finance_service import FinanceService

router = APIRouter()

class TransactionCreate(BaseModel):
    transaction_type: TransactionType
    amount: float
    description: Optional[str] = None
    date: datetime
    service_type: Optional[str] = None
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    member_id: Optional[int] = None
    verified_by_id: Optional[int] = None  # admin designated to verify/confirm this transaction

def _serialize_transaction(t: Finance, db: Session) -> dict:
    """Build a transaction dict enriched with human-readable names,
    so the frontend doesn't need a separate users lookup."""

    def name_for(user_id):
        if not user_id:
            return None
        u = db.query(User).filter(User.id == user_id).first()
        return u.full_name if u else f"User {user_id}"

    return {
        "id": t.id,
        "transaction_type": t.transaction_type.value if t.transaction_type else None,
        "amount": float(t.amount),
        "description": t.description,
        "date": t.date,
        "service_type": t.service_type,
        "status": t.status.value if t.status else None,
        "payment_method": t.payment_method,
        "reference_number": t.reference_number,
        "recorded_by_id": t.recorded_by_id,
        "recorded_by_name": name_for(t.recorded_by_id),
        "recorded_at": t.recorded_at,
        "verified_by_id": t.verified_by_id,
        "verified_by_name": name_for(t.verified_by_id),
        "confirmed_by_id": t.confirmed_by_id,
        "confirmed_by_name": name_for(t.confirmed_by_id),
        "confirmed_at": t.confirmed_at,
        "approved_by_id": t.approved_by_id,
        "approved_by_name": name_for(t.approved_by_id),
        "approved_at": t.approved_at,
        "created_at": t.created_at,
    }

@router.get("/transactions")
async def get_transactions(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    transaction_type: Optional[TransactionType] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get all transactions (Admins and above)"""
    query = db.query(Finance)

    if start_date:
        query = query.filter(Finance.date >= start_date)
    if end_date:
        query = query.filter(Finance.date <= end_date)
    if transaction_type:
        query = query.filter(Finance.transaction_type == transaction_type)

    transactions = query.order_by(Finance.date.desc()).all()
    return [_serialize_transaction(t, db) for t in transactions]

@router.post("/transactions")
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a new transaction (Admins only)"""
    finance_service = FinanceService(db)
    transaction = finance_service.create_transaction(transaction_data, current_user)
    return _serialize_transaction(transaction, db)

@router.post("/transactions/{transaction_id}/confirm")
async def confirm_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Confirm a transaction (Second Admin confirmation).
    Any admin other than the one who recorded it may confirm —
    the 'verified_by' assigned at creation is a label only, not a
    permission restriction."""
    finance_service = FinanceService(db)
    transaction = finance_service.confirm_transaction(transaction_id, current_user)
    return {"message": "Transaction confirmed successfully"}

@router.post("/transactions/{transaction_id}/approve")
async def approve_expense(
    transaction_id: int,
    current_user: User = Depends(get_current_pastor),
    db: Session = Depends(get_db)
):
    """Approve an expense (Pastors and above)"""
    finance_service = FinanceService(db)
    transaction = finance_service.approve_expense(transaction_id, current_user)
    return {"message": "Expense approved successfully"}

@router.get("/summary")
async def get_financial_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get financial summary (Admins and above)"""
    finance_service = FinanceService(db)
    summary = finance_service.get_financial_summary(start_date, end_date)
    return summary