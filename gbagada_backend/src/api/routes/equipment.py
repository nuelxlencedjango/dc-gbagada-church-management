from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user, get_current_admin
from src.models.user import User
from src.models.equipment import Equipment

router = APIRouter()

class EquipmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    serial_number: Optional[str] = None
    category: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    assigned_to_person_id: Optional[int] = None
    maintenance_notes: Optional[str] = None

class EquipmentUpdate(BaseModel):
    # All optional — only fields actually sent by the client get applied
    # (see exclude_unset below), instead of accepting an arbitrary raw dict.
    name: Optional[str] = None
    description: Optional[str] = None
    serial_number: Optional[str] = None
    category: Optional[str] = None
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[float] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    assigned_to_person_id: Optional[int] = None
    maintenance_notes: Optional[str] = None

class EquipmentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    serial_number: Optional[str]
    category: Optional[str]
    purchase_date: Optional[datetime]
    purchase_price: Optional[float]
    condition: Optional[str]
    location: Optional[str]
    status: Optional[str]
    assigned_to_person_id: Optional[int]
    assigned_to_name: Optional[str] = None
    maintenance_notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

def _serialize_equipment(e: Equipment, db: Session) -> dict:
    assigned_name = None
    if e.assigned_to_person_id:
        u = db.query(User).filter(User.id == e.assigned_to_person_id).first()
        if u:
            assigned_name = u.full_name

    return {
        "id": e.id,
        "name": e.name,
        "description": e.description,
        "serial_number": e.serial_number,
        "category": e.category,
        "purchase_date": e.purchase_date,
        "purchase_price": float(e.purchase_price) if e.purchase_price is not None else None,
        "condition": e.condition,
        "location": e.location,
        "status": e.status,
        "assigned_to_person_id": e.assigned_to_person_id,
        "assigned_to_name": assigned_name,
        "maintenance_notes": e.maintenance_notes,
        "created_at": e.created_at,
        "updated_at": e.updated_at
    }

@router.get("/", response_model=List[EquipmentResponse])
async def get_equipment(
    category: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all equipment"""
    query = db.query(Equipment)

    if category:
        query = query.filter(Equipment.category == category)
    if status:
        query = query.filter(Equipment.status == status)

    equipment = query.all()
    return [_serialize_equipment(e, db) for e in equipment]

@router.post("/", response_model=EquipmentResponse)
async def create_equipment(
    equipment_data: EquipmentCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Add new equipment (Admins only)"""
    equipment = Equipment(
        **equipment_data.dict(),
        recorded_by_id=current_user.id,
        status="available"
    )
    db.add(equipment)
    db.commit()
    db.refresh(equipment)
    return _serialize_equipment(equipment, db)

@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: int,
    equipment_data: EquipmentUpdate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Update equipment (Admins only)"""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    for key, value in equipment_data.dict(exclude_unset=True).items():
        setattr(equipment, key, value)

    db.commit()
    db.refresh(equipment)
    return _serialize_equipment(equipment, db)

@router.delete("/{equipment_id}")
async def delete_equipment(
    equipment_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete equipment (Admins only)"""
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")

    equipment.status = "retired"
    db.commit()
    return {"message": "Equipment retired successfully"}