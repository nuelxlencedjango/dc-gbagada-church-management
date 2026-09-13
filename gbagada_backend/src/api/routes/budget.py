from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user, get_current_admin
from src.models.user import User, UserRole
from src.models.budget import Budget
from src.models.department import Department

router = APIRouter()

class BudgetCreate(BaseModel):
    department_id: Optional[int] = None
    year: int
    month: Optional[int] = None
    allocated_amount: float
    notes: Optional[str] = None

class BudgetResponse(BaseModel):
    id: int
    department_id: Optional[int]
    department_name: Optional[str]
    year: int
    month: Optional[int]
    allocated_amount: float
    spent_amount: float
    remaining_amount: float
    notes: Optional[str]
    created_at: datetime

def _serialize_budget(b: Budget, db: Session) -> dict:
    dept_name = None
    if b.department_id:
        dept = db.query(Department).filter(Department.id == b.department_id).first()
        if dept:
            dept_name = dept.name

    allocated = float(b.allocated_amount or 0)
    spent = float(b.spent_amount or 0)

    return {
        "id": b.id,
        "department_id": b.department_id,
        "department_name": dept_name,
        "year": b.year,
        "month": b.month,
        "allocated_amount": allocated,
        "spent_amount": spent,
        "remaining_amount": allocated - spent,
        "notes": b.notes,
        "created_at": b.created_at
    }

@router.get("/", response_model=List[BudgetResponse])
async def get_budgets(
    year: Optional[int] = None,
    department_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all budgets (filter by year/department)"""
    query = db.query(Budget)

    if year:
        query = query.filter(Budget.year == year)
    if department_id:
        query = query.filter(Budget.department_id == department_id)

    budgets = query.all()
    return [_serialize_budget(b, db) for b in budgets]

@router.post("/", response_model=BudgetResponse)
async def create_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Create a budget (Admin only)"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can create budgets")

    budget = Budget(
        department_id=data.department_id,
        year=data.year,
        month=data.month,
        allocated_amount=data.allocated_amount,
        spent_amount=0,
        remaining_amount=data.allocated_amount,
        notes=data.notes,
        created_by_id=current_user.id
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)

    return _serialize_budget(budget, db)

@router.put("/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: int,
    data: BudgetCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update budget (Admin only)"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can update budgets")

    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    budget.department_id = data.department_id
    budget.year = data.year
    budget.month = data.month
    budget.allocated_amount = data.allocated_amount
    budget.notes = data.notes
    budget.remaining_amount = float(data.allocated_amount) - float(budget.spent_amount or 0)

    db.commit()
    db.refresh(budget)
    return _serialize_budget(budget, db)

@router.delete("/{budget_id}")
async def delete_budget(
    budget_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete budget (Admin only)"""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Only admins can delete budgets")

    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted successfully"}