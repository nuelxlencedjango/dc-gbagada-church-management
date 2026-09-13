from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.member import Member
from src.services.auth import AuthService

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.PASTOR, UserRole.ADMIN]

# ================================================================
#  REQUEST MODELS (for JSON body)
# ================================================================
class RoleUpdate(BaseModel):
    role: str

class StatusUpdate(BaseModel):
    is_active: bool

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# ================================================================
#  GET /me – current user info
# ================================================================
@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current user's information"""
    member = db.query(Member).filter(Member.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
        "member_id": member.id if member else None,
        "first_name": member.first_name if member else None,
        "last_name": member.last_name if member else None,
        "phone_number": member.phone_number if member else None,
        "profile_picture_url": member.profile_picture_url if member else None
    }


# ================================================================
#  PUT /me – update own profile
# ================================================================
@router.put("/me")
async def update_my_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's own name/email, and phone number if they
    have a linked Member profile. Does not touch role or active status —
    those stay admin-only via the endpoints below."""
    if data.email and data.email != current_user.email:
        existing = db.query(User).filter(
            User.email == data.email,
            User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use by another account")
        current_user.email = data.email

    if data.full_name:
        current_user.full_name = data.full_name

    if data.phone_number:
        member = db.query(Member).filter(Member.user_id == current_user.id).first()
        if member:
            member.phone_number = data.phone_number

    db.commit()
    db.refresh(current_user)

    member = db.query(Member).filter(Member.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "phone_number": member.phone_number if member else None,
    }


# ================================================================
#  POST /me/change-password – change own password
# ================================================================
@router.post("/me/change-password")
async def change_my_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    auth_service = AuthService(db)

    if not auth_service.verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    current_user.hashed_password = auth_service.get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ================================================================
#  GET /all – list all users (admin only)
# ================================================================
@router.get("/all")
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all users – only accessible by super_admin, overall_pastor, pastor, or admin."""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can view all users"
        )
    
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "created_at": u.created_at
        }
        for u in users
    ]


# ================================================================
#  PUT /{user_id}/role – change a user's role (admin only)
# ================================================================
@router.put("/{user_id}/role")
async def update_user_role(
    user_id: int,
    update_data: RoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update user roles"
        )
    
    role = update_data.role
    try:
        new_role = UserRole(role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {role}. Allowed: {[r.value for r in UserRole]}"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id and new_role != current_user.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )
    
    user.role = new_role
    db.commit()
    db.refresh(user)
    return {"message": f"User role updated to {role}"}


# ================================================================
#  PUT /{user_id}/toggle-status – activate/deactivate a user
# ================================================================
@router.put("/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: int,
    update_data: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can toggle user status"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own status"
        )

    is_active = update_data.is_active 
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return {"message": f"User {'activated' if is_active else 'deactivated'}"}