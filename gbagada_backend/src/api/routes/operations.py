from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.operation import Operation, OperationPriority, OperationStatus

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.ADMIN, UserRole.PASTOR]

class OperationCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to_id: Optional[int] = None
    priority: Optional[OperationPriority] = OperationPriority.MEDIUM
    due_date: Optional[date] = None
    category: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class OperationResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    assigned_to_id: Optional[int]
    assigned_to_name: Optional[str]
    created_by_id: int
    created_by_name: Optional[str]
    priority: str
    status: str
    due_date: Optional[date]
    completed_at: Optional[datetime]
    category: Optional[str]
    is_recurring: bool
    recurrence_pattern: Optional[str]
    location: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

def _serialize_operation(op: Operation, db: Session) -> dict:
    assigned_name = None
    if op.assigned_to_id:
        u = db.query(User).filter(User.id == op.assigned_to_id).first()
        if u:
            assigned_name = u.full_name

    created_by_name = None
    if op.created_by_id:
        u = db.query(User).filter(User.id == op.created_by_id).first()
        if u:
            created_by_name = u.full_name

    return {
        "id": op.id,
        "title": op.title,
        "description": op.description,
        "assigned_to_id": op.assigned_to_id,
        "assigned_to_name": assigned_name,
        "created_by_id": op.created_by_id,
        "created_by_name": created_by_name,
        "priority": op.priority.value if op.priority else None,
        "status": op.status.value if op.status else None,
        "due_date": op.due_date,
        "completed_at": op.completed_at,
        "category": op.category,
        "is_recurring": op.is_recurring,
        "recurrence_pattern": op.recurrence_pattern,
        "location": op.location,
        "notes": op.notes,
        "created_at": op.created_at,
        "updated_at": op.updated_at
    }

@router.get("/", response_model=List[OperationResponse])
async def get_operations(
    status: Optional[str] = None,
    assigned_to: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Operation)
    if status:
        try:
            status_enum = OperationStatus(status.lower())
            query = query.filter(Operation.status == status_enum)
        except ValueError:
            pass  # ignore invalid status rather than 500ing
    if assigned_to:
        query = query.filter(Operation.assigned_to_id == assigned_to)
    operations = query.order_by(Operation.due_date.asc()).all()
    return [_serialize_operation(op, db) for op in operations]

@router.post("/", response_model=OperationResponse)
async def create_operation(
    data: OperationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    op = Operation(
        title=data.title,
        description=data.description,
        assigned_to_id=data.assigned_to_id,
        priority=data.priority,
        due_date=data.due_date,
        category=data.category,
        is_recurring=data.is_recurring,
        recurrence_pattern=data.recurrence_pattern,
        location=data.location,
        notes=data.notes,
        created_by_id=current_user.id
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return _serialize_operation(op, db)

@router.put("/{operation_id}", response_model=OperationResponse)
async def update_operation(
    operation_id: int,
    data: OperationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    for key, value in data.dict().items():
        setattr(op, key, value)
    db.commit()
    db.refresh(op)
    return _serialize_operation(op, db)

@router.post("/{operation_id}/complete")
async def complete_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")

    # Only the assigned person, or admin-tier roles, can mark it complete —
    # not previously restricted at all, which let any logged-in user
    # complete anyone else's task.
    is_assignee = current_user.id == op.assigned_to_id
    if not is_assignee and current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Only the assignee or an admin can complete this operation")

    op.status = OperationStatus.COMPLETED
    op.completed_at = datetime.now()
    db.commit()
    return {"message": "Operation marked as completed"}

@router.delete("/{operation_id}")
async def delete_operation(
    operation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    op = db.query(Operation).filter(Operation.id == operation_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operation not found")
    db.delete(op)
    db.commit()
    return {"message": "Operation deleted"}