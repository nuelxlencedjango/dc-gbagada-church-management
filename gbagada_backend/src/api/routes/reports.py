from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from src.config.database import get_db
from src.api.middleware.auth import get_current_admin
from src.models.user import User
from src.models.finance import Finance, TransactionType, TransactionStatus
from src.models.budget import Budget

router = APIRouter()

class ReportResponse(BaseModel):
    total_income: float
    total_expenses: float
    net_balance: float
    income_by_type: dict
    expenses_by_type: dict
    transactions_count: int
    period: str

@router.get("/financial")
async def generate_financial_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    transaction_type: Optional[str] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Generate financial report with filters"""
    
    # Default to current month if no dates provided
    if not start_date:
        start_date = datetime.now().replace(day=1, hour=0, minute=0, second=0)
    if not end_date:
        end_date = datetime.now()
    
    query = db.query(Finance).filter(
        Finance.date >= start_date,
        Finance.date <= end_date
    )
    
    if transaction_type:
        query = query.filter(Finance.transaction_type == transaction_type)
    
    transactions = query.all()
    
    # Calculate totals
    total_income = 0
    total_expenses = 0
    income_by_type = {}
    expenses_by_type = {}
    
    for t in transactions:
        if t.transaction_type in [TransactionType.OFFERING, TransactionType.TITHE, 
                                  TransactionType.FIRST_FRUITS, TransactionType.GIFT, 
                                  TransactionType.DONATION]:
            if t.status == TransactionStatus.CONFIRMED:
                total_income += t.amount
                key = t.transaction_type.value
                income_by_type[key] = income_by_type.get(key, 0) + t.amount
        
        elif t.transaction_type == TransactionType.EXPENSE:
            if t.status == TransactionStatus.APPROVED:
                total_expenses += t.amount
                key = t.transaction_type.value
                expenses_by_type[key] = expenses_by_type.get(key, 0) + t.amount
        
        elif t.transaction_type == TransactionType.REQUEST:
            # Count requests separately
            pass
    
    return {
        "total_income": float(total_income),
        "total_expenses": float(total_expenses),
        "net_balance": float(total_income - total_expenses),
        "income_by_type": {k: float(v) for k, v in income_by_type.items()},
        "expenses_by_type": {k: float(v) for k, v in expenses_by_type.items()},
        "transactions_count": len(transactions),
        "period": f"{start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}"
    }

@router.get("/budget-vs-actual")
async def get_budget_vs_actual(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Compare budget vs actual spending"""
    if not year:
        year = datetime.now().year
    
    budgets = db.query(Budget).filter(Budget.year == year).all()
    
    # Get actual expenses for the year
    start_date = datetime(year, 1, 1)
    end_date = datetime(year, 12, 31, 23, 59, 59)
    
    expenses = db.query(Finance).filter(
        Finance.transaction_type == TransactionType.EXPENSE,
        Finance.status == TransactionStatus.APPROVED,
        Finance.date >= start_date,
        Finance.date <= end_date
    ).all()
    
    total_budget = sum(b.allocated_amount for b in budgets)
    total_spent = sum(e.amount for e in expenses)
    
    return {
        "year": year,
        "total_budget": float(total_budget),
        "total_spent": float(total_spent),
        "remaining": float(total_budget - total_spent),
        "percentage_used": float((total_spent / total_budget * 100) if total_budget > 0 else 0),
        "budgets": [
            {
                "id": b.id,
                "department_name": b.department.name if b.department else "General",
                "allocated": float(b.allocated_amount),
                "spent": float(b.spent_amount or 0),
                "remaining": float(b.allocated_amount - (b.spent_amount or 0))
            }
            for b in budgets
        ]
    }

@router.get("/trends")
async def get_financial_trends(
    months: int = 6,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get monthly income/expense trends"""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30 * months)
    
    results = []
    for i in range(months):
        month_start = (end_date - timedelta(days=30 * (months - i - 1))).replace(day=1, hour=0, minute=0, second=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        
        month_transactions = db.query(Finance).filter(
            Finance.date >= month_start,
            Finance.date <= month_end
        ).all()
        
        monthly_income = sum(
            t.amount for t in month_transactions
            if t.transaction_type in [TransactionType.OFFERING, TransactionType.TITHE, 
                                      TransactionType.FIRST_FRUITS, TransactionType.GIFT, 
                                      TransactionType.DONATION]
            and t.status == TransactionStatus.CONFIRMED
        )
        
        monthly_expenses = sum(
            t.amount for t in month_transactions
            if t.transaction_type == TransactionType.EXPENSE
            and t.status == TransactionStatus.APPROVED
        )
        
        results.append({
            "month": month_start.strftime("%B %Y"),
            "income": float(monthly_income),
            "expenses": float(monthly_expenses)
        })
    
    return results