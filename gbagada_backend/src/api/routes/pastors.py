from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime
from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.pastor import Pastor
from src.models.satellite import SatelliteChurch
from src.models.member import Member

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.ADMIN, UserRole.PASTOR]
PASTOR_ROLES = [UserRole.PASTOR, UserRole.OVERALL_PASTOR]

class PastorCreate(BaseModel):
    user_id: int  # required — every Pastor profile must be linked to a real login account
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    bio: Optional[str] = None
    ordination_date: Optional[str] = None   # accepts ISO date string
    assigned_satellite_id: Optional[int] = None

def _parse_ordination_date(value: Optional[str]):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return None

def _validate_pastor_user(user_id: int, db: Session, exclude_pastor_id: Optional[int] = None):
    """Every Pastor profile must link to an existing, active user account.
    No role restriction — a pastor may also be an HOD, cell leader, etc.,
    so their account's primary `role` field doesn't have to say "pastor".
    Each account may only back one Pastor profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Selected user account not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Selected user account is not active")

    query = db.query(Pastor).filter(Pastor.user_id == user_id)
    if exclude_pastor_id:
        query = query.filter(Pastor.id != exclude_pastor_id)
    if query.first():
        raise HTTPException(status_code=400, detail="This user account is already linked to a pastor profile")

def _serialize_pastor(p: Pastor, db: Session) -> dict:
    satellite_name = None
    if p.assigned_satellite_id:
        satellite = db.query(SatelliteChurch).filter(SatelliteChurch.id == p.assigned_satellite_id).first()
        if satellite:
            satellite_name = satellite.name

    return {
        "id": p.id,
        "user_id": p.user_id,
        "first_name": p.first_name,
        "last_name": p.last_name,
        "email": p.email,
        "phone": p.phone,
        "bio": p.bio,
        "ordination_date": p.ordination_date.isoformat() if p.ordination_date else None,
        "assigned_satellite_id": p.assigned_satellite_id,
        "assigned_satellite_name": satellite_name,
        "is_active": p.is_active,
    }

@router.get("/available-users")
async def get_available_pastor_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Any active user account not yet linked to a Pastor profile — powers
    the Add Pastor form's account picker. Deliberately not filtered by
    role: someone's account role might be 'cell_leader' or
    'department_head' while they also serve as a pastor."""
    linked_user_ids = {p.user_id for p in db.query(Pastor).filter(Pastor.user_id.isnot(None)).all()}
    candidates = db.query(User).filter(User.is_active == True).all()

    result = []
    for u in candidates:
        if u.id in linked_user_ids:
            continue
        # Phone lives on the Member profile, not on User itself — pull it
        # in if this account has one linked.
        member = db.query(Member).filter(Member.user_id == u.id).first()
        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role.value,
            "phone": member.phone_number if member else None,
        })
    return result

@router.get("/stats")
async def get_pastor_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Basic pastor summary for the Reports page."""
    all_pastors = db.query(Pastor).all()
    active = [p for p in all_pastors if p.is_active]
    inactive = [p for p in all_pastors if not p.is_active]

    by_satellite = {}
    unassigned_count = 0
    for p in active:
        if p.assigned_satellite_id:
            satellite = db.query(SatelliteChurch).filter(SatelliteChurch.id == p.assigned_satellite_id).first()
            name = satellite.name if satellite else f"Satellite {p.assigned_satellite_id}"
            by_satellite[name] = by_satellite.get(name, 0) + 1
        else:
            unassigned_count += 1

    return {
        "total": len(all_pastors),
        "active": len(active),
        "inactive": len(inactive),
        "unassigned": unassigned_count,
        "by_satellite": by_satellite,
    }

@router.get("/")
async def get_pastors(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastors = db.query(Pastor).filter(Pastor.is_active == True).offset(skip).limit(limit).all()
    return [_serialize_pastor(p, db) for p in pastors]

@router.post("/")
async def create_pastor(
    data: PastorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    _validate_pastor_user(data.user_id, db)

    pastor = Pastor(
        user_id=data.user_id,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        bio=data.bio,
        ordination_date=_parse_ordination_date(data.ordination_date),
        assigned_satellite_id=data.assigned_satellite_id,
    )
    db.add(pastor)
    db.commit()
    db.refresh(pastor)
    return _serialize_pastor(pastor, db)

@router.put("/{pastor_id}")
async def update_pastor(
    pastor_id: int,
    data: PastorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    pastor = db.query(Pastor).filter(Pastor.id == pastor_id).first()
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")

    _validate_pastor_user(data.user_id, db, exclude_pastor_id=pastor_id)

    pastor.user_id = data.user_id
    pastor.first_name = data.first_name
    pastor.last_name = data.last_name
    pastor.email = data.email
    pastor.phone = data.phone
    pastor.bio = data.bio
    pastor.ordination_date = _parse_ordination_date(data.ordination_date)
    pastor.assigned_satellite_id = data.assigned_satellite_id

    db.commit()
    db.refresh(pastor)
    return _serialize_pastor(pastor, db)

@router.delete("/{pastor_id}")
async def delete_pastor(
    pastor_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    pastor = db.query(Pastor).filter(Pastor.id == pastor_id).first()
    if not pastor:
        raise HTTPException(status_code=404, detail="Pastor not found")

    pastor.is_active = False
    db.commit()
    return {"message": "Pastor deactivated"}