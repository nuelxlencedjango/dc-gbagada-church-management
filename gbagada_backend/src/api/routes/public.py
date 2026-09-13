from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from src.config.database import get_db
from src.models.department import Department
from src.models.cell import Cell

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
