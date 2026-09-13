from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.department import Department

router = APIRouter()

class HODAssignment(BaseModel):
    member_id: int
    department_id: int

@router.get("/department-members/{department_id}")
async def get_department_members(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all members of a specific department"""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    members = db.query(Member).filter(
        Member.department_id == department_id,
        Member.membership_status == "active"
    ).all()
    
    return [
        {
            "id": m.id,
            "user_id": m.user_id,  # Include user_id for the foreign key
            "first_name": m.first_name,
            "last_name": m.last_name,
            "email": m.email,
            "phone_number": m.phone_number,
            "is_hod": m.id == department.head_id
        }
        for m in members
    ]

@router.post("/assign")
async def assign_hod(
    assignment: HODAssignment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a member as HOD of a department"""
    if current_user.role not in ["super_admin", "pastor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can assign HODs"
        )
    
    # Check if member exists
    member = db.query(Member).filter(Member.id == assignment.member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Check if member has a user account (must have user_id to be HOD)
    if not member.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This member does not have a user account. Please create a user account first."
        )
    
    # Check if department exists
    department = db.query(Department).filter(Department.id == assignment.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Check if member belongs to this department
    if member.department_id != assignment.department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Member {member.first_name} {member.last_name} is not in this department"
        )
    
    # Assign new HOD using user_id (not member_id)
    department.head_id = member.user_id  # Use user_id for foreign key
    db.commit()
    db.refresh(department)
    
    return {
        "message": f"{member.first_name} {member.last_name} assigned as HOD of {department.name}",
        "hod": {
            "id": member.id,
            "name": f"{member.first_name} {member.last_name}",
            "department": department.name
        }
    }

@router.delete("/remove/{department_id}")
async def remove_hod(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove HOD from a department"""
    if current_user.role not in ["super_admin", "pastor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can remove HODs"
        )
    
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if not department.head_id:
        raise HTTPException(status_code=400, detail="This department has no HOD assigned")
    
    department.head_id = None
    db.commit()
    db.refresh(department)
    
    return {"message": f"HOD removed from {department.name}"}

@router.get("/list")
async def get_hods(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all departments with their HODs"""
    departments = db.query(Department).filter(Department.is_active == True).all()
    
    result = []
    for dept in departments:
        hod_info = None
        if dept.head_id:
            # Find member by user_id
            hod_member = db.query(Member).filter(Member.user_id == dept.head_id).first()
            if hod_member:
                hod_info = {
                    "id": hod_member.id,
                    "first_name": hod_member.first_name,
                    "last_name": hod_member.last_name,
                    "email": hod_member.email
                }
        
        result.append({
            "id": dept.id,
            "name": dept.name,
            "hod": hod_info,
            "member_count": len(dept.members) if dept.members else 0
        })
    
    return result
