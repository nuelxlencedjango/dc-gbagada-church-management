from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from src.config.database import get_db
from src.models.department import Department
from src.models.cell import Cell
from src.models.service import Service

router = APIRouter()

@router.get("/departments")
async def get_public_departments(
    db: Session = Depends(get_db)
):
    """Get all active departments for public registration"""
    departments = db.query(Department).filter(
        Department.is_active == True
    ).all()
    return [{"id": d.id, "name": d.name} for d in departments]

@router.get("/cells")
async def get_public_cells(
    db: Session = Depends(get_db)
):
    """Get all active cell groups for public registration"""
    cells = db.query(Cell).filter(
        Cell.is_active == True
    ).all()
    return [{"id": c.id, "name": c.name} for c in cells]

@router.get("/services")
async def get_public_services(
    db: Session = Depends(get_db)
):
    """Upcoming services for the public homepage — name, date, and
    time only. Never exposes attendance or offerings, which are
    internal figures, not public information."""
    services = (
        db.query(Service)
        .filter(Service.date >= datetime.now(), Service.is_cancelled == False)
        .order_by(Service.date.asc())
        .limit(6)
        .all()
    )
    return [
        {
            "id": s.id,
            "name": s.name,
            "date": s.date.isoformat() if s.date else None,
            "start_time": s.start_time.strftime("%H:%M") if s.start_time else None,
            "theme": s.theme,
        }
        for s in services
    ]