'''from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department")
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=True) 
    allocated_amount = Column(Numeric(15, 2), nullable=False)
    spent_amount = Column(Numeric(15, 2), default=0)
    remaining_amount = Column(Numeric(15, 2), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
'''
'''from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.finance import Finance, TransactionType, TransactionStatus
from src.models.budget import Budget

router = APIRouter()

class RequestCreate(BaseModel):
    amount: float
    description: str
    purpose: str
    date_needed: Optional[datetime] = None
    # Budget proposal fields — optional. If any are set, the request is
    # treated as a budget proposal tied to a department/period.
    department_id: Optional[int] = None
    budget_month: Optional[int] = None
    budget_year: Optional[int] = None

class RequestResponse(BaseModel):
    id: int
    amount: float
    description: str
    purpose: str
    status: str
    requested_by_id: int
    requested_by_name: str
    date_needed: Optional[datetime]
    created_at: datetime
    approved_by_id: Optional[int]
    approved_by_name: Optional[str]
    approved_at: Optional[datetime]
    disbursed_by_id: Optional[int]
    disbursed_by_name: Optional[str]
    disbursed_at: Optional[datetime]
    is_budget_proposal: bool
    department_id: Optional[int]
    budget_month: Optional[int]
    budget_year: Optional[int]

@router.post("/")
async def create_request(
    data: RequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a request or budget proposal (any logged-in user)"""

    is_proposal = (
        data.department_id is not None
        or data.budget_month is not None
        or data.budget_year is not None
    )

    request = Finance(
        transaction_type=TransactionType.REQUEST,
        amount=data.amount,
        description=data.description,
        date=datetime.now(),
        recorded_by_id=current_user.id,
        status=TransactionStatus.PENDING,
        service_type=data.purpose,
        department_id=data.department_id,
        budget_month=data.budget_month,
        budget_year=data.budget_year,
        is_budget_proposal=is_proposal,
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    return {
        "message": "Request submitted successfully",
        "request_id": request.id
    }

@router.get("/")
async def get_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all requests / budget proposals (filter by status)"""
    query = db.query(Finance).filter(Finance.transaction_type == TransactionType.REQUEST)

    if status:
        try:
            status_enum = TransactionStatus(status.lower())
            query = query.filter(Finance.status == status_enum)
        except ValueError:
            pass  # ignore invalid status

    requests = query.order_by(Finance.created_at.desc()).all()

    result = []
    for r in requests:
        requested_by_name = None
        u = db.query(User).filter(User.id == r.recorded_by_id).first()
        if u:
            requested_by_name = u.full_name

        approved_by_name = None
        if r.approved_by_id:
            u = db.query(User).filter(User.id == r.approved_by_id).first()
            if u:
                approved_by_name = u.full_name

        disbursed_by_name = None
        if r.disbursed_by_id:
            u = db.query(User).filter(User.id == r.disbursed_by_id).first()
            if u:
                disbursed_by_name = u.full_name

        result.append({
            "id": r.id,
            "amount": float(r.amount),
            "description": r.description,
            "purpose": r.service_type,
            "status": r.status.value if r.status else None,
            "requested_by_id": r.recorded_by_id,
            "requested_by_name": requested_by_name,
            "date_needed": r.date,
            "created_at": r.created_at,
            "approved_by_id": r.approved_by_id,
            "approved_by_name": approved_by_name,
            "approved_at": r.approved_at,
            "disbursed_by_id": r.disbursed_by_id,
            "disbursed_by_name": disbursed_by_name,
            "disbursed_at": r.disbursed_at,
            "is_budget_proposal": r.is_budget_proposal,
            "department_id": r.department_id,
            "budget_month": r.budget_month,
            "budget_year": r.budget_year,
        })
    return result

@router.post("/{request_id}/approve")
async def approve_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a request/budget proposal.

    Restricted to the Super Admin only. Money going out is treated as
    sensitive enough that only the Super Admin (the Overall Pastor role
    in this church's setup) signs off — regular admins and other pastors
    cannot approve.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR]:
        raise HTTPException(status_code=403, detail="Only the Super Admin or the Overall Pastor can approve this request")

    request = db.query(Finance).filter(
        Finance.id == request_id,
        Finance.transaction_type == TransactionType.REQUEST
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is not pending")

    request.approved_by_id = current_user.id
    request.approved_at = datetime.now()
    request.status = TransactionStatus.APPROVED

    db.commit()
    db.refresh(request)

    return {"message": "Request approved successfully"}

@router.post("/{request_id}/reject")
async def reject_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a request/budget proposal. Restricted to the Super Admin,
    same as approve, so a single authority governs the whole decision."""
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR]:
        raise HTTPException(status_code=403, detail="Only the Super Admin or the Overall Pastor can reject this request")

    request = db.query(Finance).filter(
        Finance.id == request_id,
        Finance.transaction_type == TransactionType.REQUEST
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != TransactionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Request is not pending")

    request.status = TransactionStatus.REJECTED

    db.commit()
    db.refresh(request)

    return {"message": "Request rejected successfully"}

@router.post("/{request_id}/disburse")
async def disburse_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disburse funds for an already-approved request/budget proposal.
    This is a separate step from approval, restricted to the Super Admin.
    If the request is a budget proposal tied to a department, this also
    increases that department's spent_amount on the matching Budget row.
    """
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR]:
        raise HTTPException(status_code=403, detail="Only the Super Admin or the Overall Pastor can disburse funds")

    request = db.query(Finance).filter(
        Finance.id == request_id,
        Finance.transaction_type == TransactionType.REQUEST
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != TransactionStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Request must be approved before it can be disbursed")

    if request.is_budget_proposal and request.department_id:
        budget = db.query(Budget).filter(
            Budget.department_id == request.department_id,
            Budget.year == request.budget_year,
            Budget.month == request.budget_month
        ).first()

        if not budget:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No matching Budget found for this department/year/month. "
                    "Create the Budget allocation first, then disburse."
                )
            )

        budget.spent_amount = (budget.spent_amount or 0) + float(request.amount)
        budget.remaining_amount = float(budget.allocated_amount) - float(budget.spent_amount)

    request.disbursed_by_id = current_user.id
    request.disbursed_at = datetime.now()
    request.status = TransactionStatus.DISBURSED

    db.commit()
    db.refresh(request)

    return {"message": "Funds disbursed successfully"}
'''

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class Budget(Base):
    __tablename__ = "budgets"
    
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department")
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=True) 
    allocated_amount = Column(Numeric(15, 2), nullable=False)
    spent_amount = Column(Numeric(15, 2), default=0)
    remaining_amount = Column(Numeric(15, 2), nullable=True)
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_by = relationship("User")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())