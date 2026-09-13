from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from pydantic import BaseModel

from src.config.database import get_db
from src.api.middleware.auth import get_current_user, get_current_pastor, get_current_admin
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.department import Department, DepartmentActivity

router = APIRouter()

MANAGE_ROLES = ["super_admin", "overall_pastor", "pastor", "admin"]

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    head_id: Optional[int] = None
    assistant_head_id: Optional[int] = None

class DepartmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    head_id: Optional[int]
    assistant_head_id: Optional[int]
    member_count: int
    is_active: bool
    hod_name: Optional[str] = None
    assistant_hod_name: Optional[str] = None

@router.get("/", response_model=List[DepartmentResponse])
async def get_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all departments - includes HOD names"""
    query = db.query(Department).filter(Department.is_active == True)
    
    if search:
        query = query.filter(
            (Department.name.ilike(f"%{search}%")) |
            (Department.description.ilike(f"%{search}%"))
        )
    
    departments = query.offset(skip).limit(limit).all()
    
    result = []
    for dept in departments:
        hod_name = None
        assistant_hod_name = None
        
        if dept.head_id:
            hod = db.query(Member).filter(Member.user_id == dept.head_id).first()
            if hod:
                hod_name = f"{hod.first_name} {hod.last_name}"
        
        if dept.assistant_head_id:
            assistant_hod = db.query(Member).filter(Member.user_id == dept.assistant_head_id).first()
            if assistant_hod:
                assistant_hod_name = f"{assistant_hod.first_name} {assistant_hod.last_name}"
        
        result.append({
            "id": dept.id,
            "name": dept.name,
            "description": dept.description,
            "head_id": dept.head_id,
            "assistant_head_id": dept.assistant_head_id,
            "member_count": len(dept.members) if dept.members else 0,
            "is_active": dept.is_active,
            "hod_name": hod_name,
            "assistant_hod_name": assistant_hod_name
        })
    return result

@router.get("/{dept_id}/members")
async def get_department_members(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List the actual members of a department — the piece that was
    missing; the departments list only ever showed a count."""
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    members = db.query(Member).filter(
        Member.department_id == dept_id,
        Member.membership_status == "active"
    ).all()

    return [
        {
            "id": m.id,
            "name": f"{m.first_name} {m.last_name}",
            "email": m.email,
            "phone_number": m.phone_number,
            "user_id": m.user_id,
            "is_head": m.user_id == department.head_id if m.user_id else False,
            "is_assistant_head": m.user_id == department.assistant_head_id if m.user_id else False,
        }
        for m in members
    ]

@router.post("/", response_model=DepartmentResponse)
async def create_department(
    dept_data: DepartmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new department"""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can create departments"
        )
    
    existing = db.query(Department).filter(Department.name == dept_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department name already exists"
        )
    
    department = Department(
        name=dept_data.name,
        description=dept_data.description,
        head_id=dept_data.head_id,
        assistant_head_id=dept_data.assistant_head_id,
        is_active=True
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    
    hod_name = None
    if department.head_id:
        hod = db.query(Member).filter(Member.user_id == department.head_id).first()
        if hod:
            hod_name = f"{hod.first_name} {hod.last_name}"
    
    return {
        "id": department.id,
        "name": department.name,
        "description": department.description,
        "head_id": department.head_id,
        "assistant_head_id": department.assistant_head_id,
        "member_count": 0,
        "is_active": department.is_active,
        "hod_name": hod_name,
        "assistant_hod_name": None
    }

@router.get("/{dept_id}", response_model=DepartmentResponse)
async def get_department(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific department"""
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    hod_name = None
    if department.head_id:
        hod = db.query(Member).filter(Member.user_id == department.head_id).first()
        if hod:
            hod_name = f"{hod.first_name} {hod.last_name}"
    
    return {
        "id": department.id,
        "name": department.name,
        "description": department.description,
        "head_id": department.head_id,
        "assistant_head_id": department.assistant_head_id,
        "member_count": len(department.members) if department.members else 0,
        "is_active": department.is_active,
        "hod_name": hod_name,
        "assistant_hod_name": None
    }

@router.put("/{dept_id}")
async def update_department(
    dept_id: int,
    dept_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a department"""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can update departments"
        )
    
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    for key, value in dept_data.items():
        if hasattr(department, key) and key not in ["id", "created_at"]:
            setattr(department, key, value)
    
    db.commit()
    db.refresh(department)
    return {"message": "Department updated successfully"}

@router.delete("/{dept_id}")
async def delete_department(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a department (soft delete)"""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can delete departments"
        )
    
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    department.is_active = False
    db.commit()
    return {"message": "Department deactivated successfully"}

@router.post("/{dept_id}/activity")
async def submit_department_activity(
    dept_id: int,
    activity_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a weekly department activity report"""
    department = db.query(Department).filter(Department.id == dept_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if current_user.role not in MANAGE_ROLES:
        if department.head_id != current_user.id and department.assistant_head_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the head of this department"
            )
    
    activity = DepartmentActivity(
        department_id=dept_id,
        week_start_date=activity_data.get('week_start_date'),
        activities_performed=activity_data.get('activities_performed'),
        challenges=activity_data.get('challenges'),
        achievements=activity_data.get('achievements'),
        prayer_requests=activity_data.get('prayer_requests'),
        report=activity_data.get('report'),
        submitted_by_id=current_user.id
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    
    return {"message": "Department activity submitted successfully"}