from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date, datetime
from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.satellite import SatelliteChurch
from src.models.pastor import Pastor

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.PASTOR, UserRole.ADMIN]

class SatelliteCreate(BaseModel):
    name: str
    address: str
    city: str
    state: str
    country: str = "Nigeria"
    pastor_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    service_time: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    established_date: Optional[str] = None   # expects 'YYYY-MM-DD'

class SatelliteResponse(BaseModel):
    id: int
    name: str
    address: str
    city: str
    state: str
    country: str
    pastor_id: Optional[int]
    pastor_name: Optional[str] = None
    phone: Optional[str]
    email: Optional[str]
    service_time: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    is_active: bool
    established_date: Optional[str]

def _serialize_satellite(s: SatelliteChurch, db: Session) -> dict:
    pastor_name = None
    if s.pastor_id:
        pastor = db.query(Pastor).filter(Pastor.user_id == s.pastor_id).first()
        if pastor:
            pastor_name = f"{pastor.first_name} {pastor.last_name}"

    return {
        "id": s.id,
        "name": s.name,
        "address": s.address,
        "city": s.city,
        "state": s.state,
        "country": s.country,
        "pastor_id": s.pastor_id,
        "pastor_name": pastor_name,
        "phone": s.phone,
        "email": s.email,
        "service_time": s.service_time,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "is_active": s.is_active,
        "established_date": s.established_date.isoformat() if s.established_date else None
    }

def _sync_pastor_assignment(new_pastor_user_id: Optional[int], satellite: SatelliteChurch, db: Session):
    """Keeps Pastor.assigned_satellite_id in sync with
    SatelliteChurch.pastor_id — these are two one-directional links to
    the same fact, and nothing enforced that they agreed until now. This
    is what the Pastor Portal's "Assigned Satellite" field actually reads.
    """
    old_pastor_user_id = satellite.pastor_id

    # Clear the previous pastor's back-link if they're being replaced/removed
    if old_pastor_user_id and old_pastor_user_id != new_pastor_user_id:
        old_pastor = db.query(Pastor).filter(Pastor.user_id == old_pastor_user_id).first()
        if old_pastor and old_pastor.assigned_satellite_id == satellite.id:
            old_pastor.assigned_satellite_id = None

    # Validate and set the new pastor's back-link
    if new_pastor_user_id:
        new_pastor = db.query(Pastor).filter(Pastor.user_id == new_pastor_user_id).first()
        if not new_pastor:
            raise HTTPException(status_code=400, detail="Selected pastor not found")
        # If that pastor was already assigned elsewhere, silently move them —
        # reassignment is a normal, expected administrative action here.
        new_pastor.assigned_satellite_id = satellite.id

@router.get("/available-pastors")
async def get_available_pastors(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Every active Pastor record, with their current satellite (if any) —
    powers the assignment dropdown. Deliberately built from real Pastor
    records, not filtered by account role, matching the same fix applied
    to Manage Pastors and Announcements elsewhere in this app."""
    pastors = db.query(Pastor).filter(Pastor.is_active == True).all()
    result = []
    for p in pastors:
        current_satellite_name = None
        if p.assigned_satellite_id:
            sat = db.query(SatelliteChurch).filter(SatelliteChurch.id == p.assigned_satellite_id).first()
            current_satellite_name = sat.name if sat else None
        result.append({
            "user_id": p.user_id,
            "name": f"{p.first_name} {p.last_name}",
            "current_satellite_name": current_satellite_name,
        })
    return result

@router.get("/", response_model=List[SatelliteResponse])
async def get_satellites(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    satellites = db.query(SatelliteChurch).filter(SatelliteChurch.is_active == True).offset(skip).limit(limit).all()
    return [_serialize_satellite(s, db) for s in satellites]

@router.post("/", response_model=SatelliteResponse)
async def create_satellite(
    data: SatelliteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    satellite_data = data.dict()
    if satellite_data.get('established_date'):
        try:
            satellite_data['established_date'] = date.fromisoformat(satellite_data['established_date'])
        except ValueError:
            satellite_data['established_date'] = None
    else:
        satellite_data['established_date'] = None

    pastor_user_id = satellite_data.get('pastor_id')
    if pastor_user_id:
        pastor = db.query(Pastor).filter(Pastor.user_id == pastor_user_id).first()
        if not pastor:
            raise HTTPException(status_code=400, detail="Selected pastor not found")

    satellite = SatelliteChurch(**satellite_data)
    db.add(satellite)
    db.flush()  # get satellite.id before syncing the pastor back-link

    if pastor_user_id:
        pastor = db.query(Pastor).filter(Pastor.user_id == pastor_user_id).first()
        pastor.assigned_satellite_id = satellite.id

    db.commit()
    db.refresh(satellite)
    return _serialize_satellite(satellite, db)

@router.put("/{satellite_id}")
async def update_satellite(
    satellite_id: int,
    data: SatelliteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    satellite = db.query(SatelliteChurch).filter(SatelliteChurch.id == satellite_id).first()
    if not satellite:
        raise HTTPException(status_code=404, detail="Satellite not found")
    
    update_data = data.dict()
    if update_data.get('established_date'):
        try:
            update_data['established_date'] = date.fromisoformat(update_data['established_date'])
        except ValueError:
            update_data['established_date'] = None
    else:
        update_data['established_date'] = None

    new_pastor_user_id = update_data.get('pastor_id')
    _sync_pastor_assignment(new_pastor_user_id, satellite, db)

    for key, value in update_data.items():
        setattr(satellite, key, value)
    
    db.commit()
    db.refresh(satellite)
    return {"message": "Satellite updated"}

@router.delete("/{satellite_id}")
async def delete_satellite(
    satellite_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    satellite = db.query(SatelliteChurch).filter(SatelliteChurch.id == satellite_id).first()
    if not satellite:
        raise HTTPException(status_code=404, detail="Satellite not found")

    if satellite.pastor_id:
        pastor = db.query(Pastor).filter(Pastor.user_id == satellite.pastor_id).first()
        if pastor and pastor.assigned_satellite_id == satellite.id:
            pastor.assigned_satellite_id = None

    satellite.is_active = False
    db.commit()
    return {"message": "Satellite deactivated"}