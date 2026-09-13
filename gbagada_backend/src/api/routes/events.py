from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.church_event import ChurchEvent
from src.models.satellite import SatelliteChurch

router = APIRouter()

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_date: datetime   # expects ISO datetime string
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    satellite_id: Optional[int] = None
    is_published: bool = True
    image_url: Optional[str] = None

@router.get("/")
async def get_events(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    events = db.query(ChurchEvent).filter(ChurchEvent.is_published == True).offset(skip).limit(limit).all()
    result = []
    for e in events:
        satellite_name = None
        if e.satellite_id:
            satellite = db.query(SatelliteChurch).filter(SatelliteChurch.id == e.satellite_id).first()
            if satellite:
                satellite_name = satellite.name
        result.append({
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "start_date": e.start_date.isoformat(),
            "end_date": e.end_date.isoformat() if e.end_date else None,
            "location": e.location,
            "satellite_id": e.satellite_id,
            "satellite_name": satellite_name,
            "is_published": e.is_published,
            "image_url": e.image_url,
            "created_by": e.created_by.full_name if e.created_by else None,
            "created_at": e.created_at.isoformat()
        })
    return result

@router.post("/")
async def create_event(
    data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.PASTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    event_data = data.dict()
    # Pydantic already validates datetime, but we can ensure it's a datetime object
    # No extra conversion needed if frontend sends valid ISO strings
    event = ChurchEvent(**event_data, created_by_id=current_user.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

@router.put("/{event_id}")
async def update_event(
    event_id: int,
    data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.PASTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    event = db.query(ChurchEvent).filter(ChurchEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = data.dict()
    for key, value in update_data.items():
        setattr(event, key, value)
    
    db.commit()
    db.refresh(event)
    return {"message": "Event updated"}

@router.delete("/{event_id}")
async def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.PASTOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    event = db.query(ChurchEvent).filter(ChurchEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}