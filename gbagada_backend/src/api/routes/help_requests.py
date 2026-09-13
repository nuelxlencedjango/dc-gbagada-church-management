from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.help_request import HelpRequest
from src.models.cell import Cell
from src.models.department import Department

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.PASTOR, UserRole.ADMIN]

class ResolveRequest(BaseModel):
    admin_notes: Optional[str] = None

def _serialize(h: HelpRequest, db: Session) -> dict:
    source_name = None
    if h.source_type == "cell":
        c = db.query(Cell).filter(Cell.id == h.source_id).first()
        source_name = c.name if c else f"Cell {h.source_id}"
    else:
        d = db.query(Department).filter(Department.id == h.source_id).first()
        source_name = d.name if d else f"Department {h.source_id}"

    member_name = None
    if h.member_id:
        m = db.query(Member).filter(Member.id == h.member_id).first()
        member_name = f"{m.first_name} {m.last_name}" if m else None

    submitted_by_name = None
    if h.submitted_by_id:
        u = db.query(User).filter(User.id == h.submitted_by_id).first()
        submitted_by_name = u.full_name if u else None

    return {
        "id": h.id,
        "source_type": h.source_type,
        "source_id": h.source_id,
        "source_name": source_name,
        "member_id": h.member_id,
        "member_name": member_name,
        "description": h.description,
        "status": h.status,
        "submitted_by_name": submitted_by_name,
        "admin_notes": h.admin_notes,
        "created_at": h.created_at,
        "resolved_at": h.resolved_at,
    }

@router.get("/")
async def get_help_requests(
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    query = db.query(HelpRequest)
    if status:
        query = query.filter(HelpRequest.status == status)
    requests = query.order_by(HelpRequest.created_at.desc()).all()
    return [_serialize(h, db) for h in requests]

@router.post("/{request_id}/resolve")
async def resolve_help_request(
    request_id: int,
    data: ResolveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    help_req = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not help_req:
        raise HTTPException(status_code=404, detail="Help request not found")

    help_req.status = "resolved"
    help_req.admin_notes = data.admin_notes
    help_req.resolved_by_id = current_user.id
    help_req.resolved_at = datetime.now()

    db.commit()
    return {"message": "Marked as resolved"}
