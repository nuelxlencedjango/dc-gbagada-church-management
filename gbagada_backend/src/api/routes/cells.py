from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user, get_current_pastor, get_current_admin
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.cell import Cell, CellActivity

router = APIRouter()

# Same tiers everywhere else in this app uses — 'overall_pastor' was
# missing from every check in this file (string form, not enum, matching
# how this file already compares roles).
MANAGE_ROLES = ["super_admin", "overall_pastor", "pastor", "admin"]
ASSIGN_MEMBER_ROLES = ["super_admin", "overall_pastor", "pastor", "admin", "cell_leader"]

class CellCreate(BaseModel):
    name: str
    description: Optional[str] = None
    meeting_day: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_location: Optional[str] = None
    leader_id: Optional[int] = None          
    assistant_leader_id: Optional[int] = None

class CellResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    meeting_day: Optional[str]
    meeting_time: Optional[str]
    meeting_location: Optional[str]
    leader_id: Optional[int]
    assistant_leader_id: Optional[int]
    member_count: int
    is_active: bool
    leader_name: Optional[str] = None
    assistant_leader_name: Optional[str] = None


@router.get("/", response_model=List[CellResponse])
async def get_cells(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all cells - includes leader names via user_id join."""
    query = db.query(Cell).filter(Cell.is_active == True)
    
    if search:
        query = query.filter(
            (Cell.name.ilike(f"%{search}%")) |
            (Cell.description.ilike(f"%{search}%"))
        )
    
    cells = query.offset(skip).limit(limit).all()
    
    result = []
    for cell in cells:
        leader_name = None
        assistant_leader_name = None
        
        if cell.leader_id:
            leader = db.query(Member).filter(Member.user_id == cell.leader_id).first()
            if leader:
                leader_name = f"{leader.first_name} {leader.last_name}"
        
        if cell.assistant_leader_id:
            assistant = db.query(Member).filter(Member.user_id == cell.assistant_leader_id).first()
            if assistant:
                assistant_leader_name = f"{assistant.first_name} {assistant.last_name}"
        
        member_count = db.query(Member).filter(Member.cell_id == cell.id).count()
        
        result.append({
            "id": cell.id,
            "name": cell.name,
            "description": cell.description,
            "meeting_day": cell.meeting_day,
            "meeting_time": cell.meeting_time,
            "meeting_location": cell.meeting_location,
            "leader_id": cell.leader_id,
            "assistant_leader_id": cell.assistant_leader_id,
            "member_count": member_count,
            "is_active": cell.is_active,
            "leader_name": leader_name,
            "assistant_leader_name": assistant_leader_name
        })
    return result

@router.get("/{cell_id}/members")
async def get_cell_members(
    cell_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get members with correct leader/assistant flags."""
    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    members = db.query(Member).filter(
        Member.cell_id == cell_id,
        Member.membership_status == "active"
    ).all()
    
    return [
        {
            "id": m.id,
            "name": f"{m.first_name} {m.last_name}",
            "email": m.email,
            "phone_number": m.phone_number,
            "user_id": m.user_id,
            "is_leader": m.user_id == cell.leader_id if m.user_id else False,
            "is_assistant": m.user_id == cell.assistant_leader_id if m.user_id else False
        }
        for m in members
    ]


@router.post("/assign-leader")
async def assign_cell_leader(
    member_id: int,
    cell_id: int,
    role: str = "leader",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a member as leader or assistant leader of a cell."""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can assign cell leaders"
        )

    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    if not member.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Member {member.first_name} {member.last_name} does not have a user account. Please create one first."
        )

    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")

    if member.cell_id != cell_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{member.first_name} {member.last_name} is not a member of {cell.name}."
        )

    if role == "leader":
        if cell.leader_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{cell.name} already has a leader. Please remove the current leader first."
            )
        existing = db.query(Cell).filter(
            Cell.leader_id == member.user_id,
            Cell.id != cell.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{member.first_name} {member.last_name} is already the leader of {existing.name}."
            )
        cell.leader_id = member.user_id

    elif role == "assistant":
        if cell.assistant_leader_id is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{cell.name} already has an assistant leader. Remove the current one first."
            )
        existing = db.query(Cell).filter(
            Cell.assistant_leader_id == member.user_id,
            Cell.id != cell.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{member.first_name} {member.last_name} is already an assistant leader of {existing.name}."
            )
        cell.assistant_leader_id = member.user_id

    else:
        raise HTTPException(status_code=400, detail="Invalid role. Use 'leader' or 'assistant'.")

    db.commit()
    db.refresh(cell)

    return {
        "message": f"{member.first_name} {member.last_name} assigned as {role} of {cell.name}.",
        "member_id": member.id,
        "cell_id": cell.id,
        "role": role
    }

@router.delete("/remove-leader/{cell_id}")
async def remove_cell_leader(
    cell_id: int,
    role: str = "leader",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove leader or assistant leader from a cell."""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can remove cell leaders"
        )
    
    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    if role == "leader":
        cell.leader_id = None
    elif role == "assistant":
        cell.assistant_leader_id = None
    else:
        raise HTTPException(status_code=400, detail="Invalid role. Use 'leader' or 'assistant'")
    
    db.commit()
    db.refresh(cell)
    
    return {"message": f"{role.capitalize()} removed from {cell.name}"}


# ==================== MEMBER MANAGEMENT ====================

@router.post("/assign-member")
async def assign_member_to_cell(
    member_id: int,
    cell_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a member to a cell group."""
    if current_user.role not in ASSIGN_MEMBER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and cell leaders can assign members"
        )
    
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    member.cell_id = cell_id
    db.commit()
    db.refresh(member)
    
    return {
        "message": f"Member {member.first_name} {member.last_name} assigned to {cell.name}",
        "member_id": member.id,
        "cell_id": cell.id
    }

@router.delete("/remove-member/{member_id}")
async def remove_member_from_cell(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from their cell group."""
    if current_user.role not in ASSIGN_MEMBER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and cell leaders can remove members"
        )
    
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    member.cell_id = None
    db.commit()
    db.refresh(member)
    
    return {"message": f"Member {member.first_name} {member.last_name} removed from cell"}


# ==================== CELL CRUD ====================

@router.post("/", response_model=CellResponse)
async def create_cell(
    cell_data: CellCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new cell group."""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can create cell groups"
        )
    
    existing = db.query(Cell).filter(Cell.name == cell_data.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cell name already exists"
        )
    
    cell = Cell(
        name=cell_data.name,
        description=cell_data.description,
        meeting_day=cell_data.meeting_day,
        meeting_time=cell_data.meeting_time,
        meeting_location=cell_data.meeting_location,
        leader_id=cell_data.leader_id,
        assistant_leader_id=cell_data.assistant_leader_id,
        is_active=True
    )
    db.add(cell)
    db.commit()
    db.refresh(cell)
    
    leader_name = None
    if cell.leader_id:
        leader = db.query(Member).filter(Member.user_id == cell.leader_id).first()
        if leader:
            leader_name = f"{leader.first_name} {leader.last_name}"
    
    assistant_leader_name = None
    if cell.assistant_leader_id:
        assistant = db.query(Member).filter(Member.user_id == cell.assistant_leader_id).first()
        if assistant:
            assistant_leader_name = f"{assistant.first_name} {assistant.last_name}"
    
    return {
        "id": cell.id,
        "name": cell.name,
        "description": cell.description,
        "meeting_day": cell.meeting_day,
        "meeting_time": cell.meeting_time,
        "meeting_location": cell.meeting_location,
        "leader_id": cell.leader_id,
        "assistant_leader_id": cell.assistant_leader_id,
        "member_count": 0,
        "is_active": cell.is_active,
        "leader_name": leader_name,
        "assistant_leader_name": assistant_leader_name
    }

@router.put("/{cell_id}")
async def update_cell(
    cell_id: int,
    cell_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a cell group."""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can update cell groups"
        )
    
    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    for key, value in cell_data.items():
        if hasattr(cell, key) and key not in ["id", "created_at"]:
            setattr(cell, key, value)
    
    db.commit()
    db.refresh(cell)
    return {"message": "Cell updated successfully"}


@router.delete("/{cell_id}")
async def delete_cell(
    cell_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a cell group (soft delete)."""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can delete cell groups"
        )
    
    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    cell.is_active = False
    db.commit()
    return {"message": "Cell deactivated successfully"}

# ==================== ACTIVITY REPORTING ====================

@router.post("/{cell_id}/activity")
async def submit_cell_activity(
    cell_id: int,
    activity_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a weekly cell activity report."""
    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    if current_user.role not in MANAGE_ROLES:
        if cell.leader_id != current_user.id and cell.assistant_leader_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only cell leaders and admins can submit activities"
            )
    
    activity = CellActivity(
        cell_id=cell_id,
        week_start_date=activity_data.get('week_start_date'),
        attendance=activity_data.get('attendance', 0),
        new_members_count=activity_data.get('new_members_count', 0),
        prayer_points=activity_data.get('prayer_points'),
        testimonies=activity_data.get('testimonies'),
        challenges=activity_data.get('challenges'),
        report=activity_data.get('report'),
        submitted_by_id=current_user.id
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    
    return {"message": "Activity submitted successfully", "activity_id": activity.id}


@router.get("/{cell_id}/activities")
async def get_cell_activities(
    cell_id: int,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get cell activity history."""
    cell = db.query(Cell).filter(Cell.id == cell_id).first()
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    
    activities = db.query(CellActivity).filter(
        CellActivity.cell_id == cell_id
    ).order_by(CellActivity.week_start_date.desc()).limit(limit).all()
    
    return [
        {
            "id": a.id,
            "week_start_date": a.week_start_date,
            "attendance": a.attendance,
            "new_members_count": a.new_members_count,
            "prayer_points": a.prayer_points,
            "testimonies": a.testimonies,
            "challenges": a.challenges,
            "report": a.report,
            "submitted_by": a.submitted_by.full_name if a.submitted_by else None,
            "submitted_at": a.submitted_at
        }
        for a in activities
    ]