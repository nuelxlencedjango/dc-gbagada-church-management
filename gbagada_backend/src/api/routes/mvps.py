from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime, timedelta

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.mvp import MVP
from src.models.member import Member

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.ADMIN, UserRole.PASTOR]

class MVPCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    occupation: Optional[str] = None
    prayer_point: Optional[str] = None
    visit_date: date
    notes: Optional[str] = None
    assigned_to_id: Optional[int] = None

class MVPResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    occupation: Optional[str]
    prayer_point: Optional[str]
    visit_date: date
    status: str
    notes: Optional[str]
    assigned_to_id: Optional[int]
    assigned_to_name: Optional[str] = None
    converted_member_id: Optional[int]
    converted_at: Optional[datetime]
    created_at: datetime

def _serialize_mvp(m: MVP, db: Session) -> dict:
    assigned_name = None
    if m.assigned_to_id:
        u = db.query(User).filter(User.id == m.assigned_to_id).first()
        if u:
            assigned_name = u.full_name

    return {
        "id": m.id,
        "first_name": m.first_name,
        "last_name": m.last_name,
        "email": m.email,
        "phone": m.phone,
        "address": m.address,
        "occupation": m.occupation,
        "prayer_point": m.prayer_point,
        "visit_date": m.visit_date,
        "status": m.status,
        "notes": m.notes,
        "assigned_to_id": m.assigned_to_id,
        "assigned_to_name": assigned_name,
        "converted_member_id": m.converted_member_id,
        "converted_at": m.converted_at,
        "created_at": m.created_at,
    }

@router.get("/stats")
async def get_mvp_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """MVP dashboard stats — total, new this week, breakdown by status,
    conversion rate."""
    total = db.query(MVP).count()

    week_ago = datetime.now().date() - timedelta(days=7)
    new_this_week = db.query(MVP).filter(MVP.visit_date >= week_ago).count()

    new_count = db.query(MVP).filter(MVP.status == "new").count()
    followed_up = db.query(MVP).filter(MVP.status == "followed_up").count()
    converted = db.query(MVP).filter(MVP.status == "converted").count()

    conversion_rate = round((converted / total * 100) if total > 0 else 0, 1)

    return {
        "total": total,
        "new_this_week": new_this_week,
        "new": new_count,
        "followed_up": followed_up,
        "converted": converted,
        "conversion_rate": conversion_rate
    }

@router.get("/", response_model=List[MVPResponse])
async def get_mvps(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(MVP)
    if status:
        query = query.filter(MVP.status == status)
    mvps = query.order_by(MVP.visit_date.desc()).all()
    return [_serialize_mvp(m, db) for m in mvps]

@router.post("/", response_model=MVPResponse)
async def create_mvp(
    data: MVPCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    mvp = MVP(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        address=data.address,
        occupation=data.occupation,
        prayer_point=data.prayer_point,
        visit_date=data.visit_date,
        notes=data.notes,
        assigned_to_id=data.assigned_to_id,
        status="new",
        created_by_id=current_user.id
    )
    db.add(mvp)
    db.commit()
    db.refresh(mvp)
    return _serialize_mvp(mvp, db)

@router.put("/{mvp_id}", response_model=MVPResponse)
async def update_mvp(
    mvp_id: int,
    data: MVPCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    mvp = db.query(MVP).filter(MVP.id == mvp_id).first()
    if not mvp:
        raise HTTPException(status_code=404, detail="MVP not found")

    mvp.first_name = data.first_name
    mvp.last_name = data.last_name
    mvp.email = data.email
    mvp.phone = data.phone
    mvp.address = data.address
    mvp.occupation = data.occupation
    mvp.prayer_point = data.prayer_point
    mvp.visit_date = data.visit_date
    mvp.notes = data.notes
    mvp.assigned_to_id = data.assigned_to_id

    db.commit()
    db.refresh(mvp)
    return _serialize_mvp(mvp, db)

@router.delete("/{mvp_id}")
async def delete_mvp(
    mvp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    mvp = db.query(MVP).filter(MVP.id == mvp_id).first()
    if not mvp:
        raise HTTPException(status_code=404, detail="MVP not found")

    db.delete(mvp)
    db.commit()
    return {"message": "MVP deleted"}

@router.post("/{mvp_id}/convert")
async def convert_mvp(
    mvp_id: int,
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    mvp = db.query(MVP).filter(MVP.id == mvp_id).first()
    if not mvp:
        raise HTTPException(status_code=404, detail="MVP not found")

    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    mvp.status = "converted"
    mvp.converted_member_id = member_id
    mvp.converted_at = datetime.now()

    db.commit()
    db.refresh(mvp)
    return {"message": "MVP converted to member successfully"}