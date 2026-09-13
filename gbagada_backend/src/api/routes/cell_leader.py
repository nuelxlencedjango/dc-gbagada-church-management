from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.cell import Cell, CellActivity
from src.models.cell_activity_agenda import CellActivityAgendaItem
from src.models.mvp import MVP
from src.models.help_request import HelpRequest
from src.models.member_follow_up import MemberFollowUp

router = APIRouter()

class MeetingInfoUpdate(BaseModel):
    meeting_day: Optional[str] = None
    meeting_time: Optional[str] = None
    meeting_location: Optional[str] = None

class RegisterMvpForCell(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    visit_date: date
    notes: Optional[str] = None

class AgendaItemInput(BaseModel):
    segment_name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ActivityCreate(BaseModel):
    week_start_date: date
    attendance: Optional[int] = 0
    new_members_count: Optional[int] = 0
    offering_amount: Optional[float] = None
    meeting_location: Optional[str] = None
    attendee_names: Optional[str] = None
    children_names: Optional[str] = None
    prayer_points: Optional[str] = None
    testimonies: Optional[str] = None
    challenges: Optional[str] = None
    report: Optional[str] = None
    agenda_items: Optional[List[AgendaItemInput]] = None

class HelpRequestCreate(BaseModel):
    member_id: Optional[int] = None
    description: str

class FollowUpCreate(BaseModel):
    member_id: int
    follow_up_date: date
    method: str
    reason_for_inactivity: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None

def _get_my_cell(current_user: User, db: Session) -> Cell:
    cell = db.query(Cell).filter(
        (Cell.leader_id == current_user.id) | (Cell.assistant_leader_id == current_user.id)
    ).first()
    if not cell:
        raise HTTPException(status_code=404, detail="You are not assigned as leader or assistant leader of any cell")
    return cell

def _serialize_cell(c: Cell, db: Session) -> dict:
    member_count = db.query(Member).filter(Member.cell_id == c.id).count()
    return {
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "meeting_day": c.meeting_day,
        "meeting_time": c.meeting_time,
        "meeting_location": c.meeting_location,
        "member_count": member_count,
    }

@router.get("/my-cell")
async def get_my_cell(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    return _serialize_cell(cell, db)

@router.put("/my-cell/meeting-info")
async def update_my_cell_meeting_info(
    data: MeetingInfoUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    if data.meeting_day is not None:
        cell.meeting_day = data.meeting_day
    if data.meeting_time is not None:
        cell.meeting_time = data.meeting_time
    if data.meeting_location is not None:
        cell.meeting_location = data.meeting_location
    db.commit()
    return {"message": "Meeting info updated"}

@router.get("/my-cell/members")
async def get_my_cell_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """General cell member report — roster with contact info."""
    cell = _get_my_cell(current_user, db)
    members = db.query(Member).filter(
        Member.cell_id == cell.id,
        Member.membership_status == "active"
    ).all()
    return [
        {
            "id": m.id,
            "name": f"{m.first_name} {m.last_name}",
            "phone_number": m.phone_number,
            "address": m.address,
            "email": m.email,
        }
        for m in members
    ]

@router.get("/members/search")
async def search_all_members(
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search registered church members to add to the cell."""
    _get_my_cell(current_user, db)
    query = db.query(Member).filter(Member.membership_status == "active")
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Member.first_name.ilike(like)) | (Member.last_name.ilike(like)) | (Member.email.ilike(like))
        )
    members = query.limit(20).all()
    return [
        {"id": m.id, "name": f"{m.first_name} {m.last_name}", "email": m.email, "cell_id": m.cell_id}
        for m in members
    ]

@router.post("/my-cell/members/{member_id}")
async def add_member_to_my_cell(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.cell_id = cell.id
    db.commit()
    return {"message": f"{member.first_name} {member.last_name} added to {cell.name}"}

@router.delete("/my-cell/members/{member_id}")
async def remove_member_from_my_cell(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    member = db.query(Member).filter(Member.id == member_id, Member.cell_id == cell.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your cell")
    member.cell_id = None
    db.commit()
    return {"message": f"{member.first_name} {member.last_name} removed from {cell.name}"}

@router.post("/my-cell/register-mvp")
async def register_mvp_for_my_cell(
    data: RegisterMvpForCell,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """For a first-time visitor who isn't a registered Member yet —
    registers them as an MVP, assigned to this cell leader for follow-up."""
    _get_my_cell(current_user, db)
    mvp = MVP(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        visit_date=data.visit_date,
        notes=data.notes,
        status="new",
        assigned_to_id=current_user.id,
        created_by_id=current_user.id
    )
    db.add(mvp)
    db.commit()
    db.refresh(mvp)
    return {"message": f"{mvp.first_name} {mvp.last_name} registered as MVP", "mvp_id": mvp.id}

@router.post("/my-cell/activity")
async def submit_my_cell_activity(
    data: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    activity = CellActivity(
        cell_id=cell.id,
        week_start_date=data.week_start_date,
        attendance=data.attendance,
        new_members_count=data.new_members_count,
        offering_amount=data.offering_amount,
        meeting_location=data.meeting_location,
        attendee_names=data.attendee_names,
        children_names=data.children_names,
        prayer_points=data.prayer_points,
        testimonies=data.testimonies,
        challenges=data.challenges,
        report=data.report,
        submitted_by_id=current_user.id
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    if data.agenda_items:
        for i, item in enumerate(data.agenda_items):
            db.add(CellActivityAgendaItem(
                cell_activity_id=activity.id,
                segment_name=item.segment_name,
                start_time=item.start_time,
                end_time=item.end_time,
                sort_order=i
            ))
        db.commit()

    return {"message": "Activity submitted successfully", "activity_id": activity.id}

@router.get("/my-cell/activities")
async def get_my_cell_activities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    activities = db.query(CellActivity).filter(
        CellActivity.cell_id == cell.id
    ).order_by(CellActivity.week_start_date.desc()).all()

    result = []
    for a in activities:
        agenda_items = db.query(CellActivityAgendaItem).filter(
            CellActivityAgendaItem.cell_activity_id == a.id
        ).order_by(CellActivityAgendaItem.sort_order.asc()).all()

        result.append({
            "id": a.id,
            "week_start_date": a.week_start_date,
            "attendance": a.attendance,
            "new_members_count": a.new_members_count,
            "offering_amount": float(a.offering_amount) if a.offering_amount else None,
            "meeting_location": a.meeting_location,
            "attendee_names": a.attendee_names,
            "children_names": a.children_names,
            "prayer_points": a.prayer_points,
            "testimonies": a.testimonies,
            "challenges": a.challenges,
            "report": a.report,
            "submitted_at": a.submitted_at,
            "agenda_items": [
                {"segment_name": ai.segment_name, "start_time": ai.start_time, "end_time": ai.end_time}
                for ai in agenda_items
            ],
        })
    return result

@router.post("/my-cell/help-requests")
async def submit_help_request(
    data: HelpRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    help_req = HelpRequest(
        source_type="cell",
        source_id=cell.id,
        member_id=data.member_id,
        description=data.description,
        status="pending",
        submitted_by_id=current_user.id
    )
    db.add(help_req)
    db.commit()
    db.refresh(help_req)
    return {"message": "Sent to admin", "help_request_id": help_req.id}

@router.get("/my-cell/inactive-members")
async def get_inactive_cell_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    members = db.query(Member).filter(
        Member.cell_id == cell.id,
        Member.membership_status != "active"
    ).all()
    return [
        {
            "id": m.id,
            "name": f"{m.first_name} {m.last_name}",
            "phone_number": m.phone_number,
            "address": m.address,
            "membership_status": m.membership_status,
        }
        for m in members
    ]

@router.post("/my-cell/members/{member_id}/follow-up")
async def log_member_follow_up(
    member_id: int,
    data: FollowUpCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    member = db.query(Member).filter(Member.id == member_id, Member.cell_id == cell.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your cell")

    follow_up = MemberFollowUp(
        member_id=member_id,
        follow_up_date=data.follow_up_date,
        method=data.method,
        reason_for_inactivity=data.reason_for_inactivity,
        notes=data.notes,
        outcome=data.outcome,
        followed_up_by_id=current_user.id
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return {"message": "Follow-up logged", "follow_up_id": follow_up.id}

@router.get("/my-cell/members/{member_id}/follow-ups")
async def get_member_follow_ups(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cell = _get_my_cell(current_user, db)
    member = db.query(Member).filter(Member.id == member_id, Member.cell_id == cell.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your cell")

    follow_ups = db.query(MemberFollowUp).filter(
        MemberFollowUp.member_id == member_id
    ).order_by(MemberFollowUp.follow_up_date.desc()).all()
    return [
        {
            "id": f.id,
            "follow_up_date": f.follow_up_date,
            "method": f.method,
            "reason_for_inactivity": f.reason_for_inactivity,
            "notes": f.notes,
            "outcome": f.outcome,
        }
        for f in follow_ups
    ]

@router.get("/my-cell/help-requests")
async def get_my_help_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """The requests THIS cell has sent to admin, with status."""
    cell = _get_my_cell(current_user, db)
    requests = db.query(HelpRequest).filter(
        HelpRequest.source_type == "cell",
        HelpRequest.source_id == cell.id
    ).order_by(HelpRequest.created_at.desc()).all()
    return [
        {
            "id": h.id,
            "description": h.description,
            "status": h.status,
            "admin_notes": h.admin_notes,
            "created_at": h.created_at,
            "resolved_at": h.resolved_at,
        }
        for h in requests
    ]