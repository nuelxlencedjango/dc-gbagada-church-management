from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.department import Department, DepartmentActivity
from src.models.department_program import DepartmentProgram, DepartmentContribution
from src.models.help_request import HelpRequest
from src.models.member_follow_up import MemberFollowUp

router = APIRouter()

ADMIN_OVERRIDE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.ADMIN, UserRole.PASTOR]

class ActivityCreate(BaseModel):
    week_start_date: date
    activities_performed: Optional[str] = None
    challenges: Optional[str] = None
    achievements: Optional[str] = None
    prayer_requests: Optional[str] = None
    report: Optional[str] = None

class ProgramCreate(BaseModel):
    title: str
    description: Optional[str] = None
    program_date: date
    program_time: Optional[str] = None
    location: Optional[str] = None

class ContributionCreate(BaseModel):
    contributor_name: Optional[str] = None
    member_id: Optional[int] = None
    amount: float
    purpose: Optional[str] = None
    contribution_date: date

class HelpRequestCreate(BaseModel):
    member_id: Optional[int] = None
    description: str

class FollowUpCreate(BaseModel):
    member_id: int
    follow_up_date: date
    method: str  # call, visitation, message, other
    reason_for_inactivity: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None

def _get_my_department(current_user: User, db: Session) -> Department:
    """The department this user heads or assists — admins/pastors can be
    passed a department via query elsewhere, but this self-service router
    is scoped to whichever single department actually lists this user as
    head or assistant head."""
    dept = db.query(Department).filter(
        (Department.head_id == current_user.id) | (Department.assistant_head_id == current_user.id)
    ).first()
    if not dept:
        raise HTTPException(status_code=404, detail="You are not assigned as head or assistant head of any department")
    return dept

def _serialize_department(d: Department, db: Session) -> dict:
    member_count = db.query(Member).filter(Member.department_id == d.id).count()
    head_name = None
    if d.head_id:
        head_user = db.query(User).filter(User.id == d.head_id).first()
        head_name = head_user.full_name if head_user else None
    assistant_name = None
    if d.assistant_head_id:
        a_user = db.query(User).filter(User.id == d.assistant_head_id).first()
        assistant_name = a_user.full_name if a_user else None

    return {
        "id": d.id,
        "name": d.name,
        "description": d.description,
        "member_count": member_count,
        "head_name": head_name,
        "assistant_head_name": assistant_name,
    }

@router.get("/my-department")
async def get_my_department(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    return _serialize_department(dept, db)

@router.get("/my-department/members")
async def get_my_department_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Roster with contact details — phone and address, as requested."""
    dept = _get_my_department(current_user, db)
    members = db.query(Member).filter(
        Member.department_id == dept.id,
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
    """Search all registered church members, to add one to the department —
    matches 'select from members already registered'."""
    _get_my_department(current_user, db)  # confirms caller actually heads a department
    query = db.query(Member).filter(Member.membership_status == "active")
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Member.first_name.ilike(like)) | (Member.last_name.ilike(like)) | (Member.email.ilike(like))
        )
    members = query.limit(20).all()
    return [
        {"id": m.id, "name": f"{m.first_name} {m.last_name}", "email": m.email, "department_id": m.department_id}
        for m in members
    ]

@router.post("/my-department/members/{member_id}")
async def add_member_to_my_department(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.department_id = dept.id
    db.commit()
    return {"message": f"{member.first_name} {member.last_name} added to {dept.name}"}

@router.delete("/my-department/members/{member_id}")
async def remove_member_from_my_department(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    member = db.query(Member).filter(Member.id == member_id, Member.department_id == dept.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your department")
    member.department_id = None
    db.commit()
    return {"message": f"{member.first_name} {member.last_name} removed from {dept.name}"}

@router.post("/my-department/activity")
async def submit_my_department_activity(
    data: ActivityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit the weekly report — this IS the 'send report to admin' action;
    admins view these via the department Reports page."""
    dept = _get_my_department(current_user, db)
    activity = DepartmentActivity(
        department_id=dept.id,
        week_start_date=data.week_start_date,
        activities_performed=data.activities_performed,
        challenges=data.challenges,
        achievements=data.achievements,
        prayer_requests=data.prayer_requests,
        report=data.report,
        submitted_by_id=current_user.id
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return {"message": "Report submitted successfully", "activity_id": activity.id}

@router.get("/my-department/activities")
async def get_my_department_activities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    activities = db.query(DepartmentActivity).filter(
        DepartmentActivity.department_id == dept.id
    ).order_by(DepartmentActivity.week_start_date.desc()).all()
    return [
        {
            "id": a.id,
            "week_start_date": a.week_start_date,
            "activities_performed": a.activities_performed,
            "challenges": a.challenges,
            "achievements": a.achievements,
            "prayer_requests": a.prayer_requests,
            "report": a.report,
            "submitted_at": a.submitted_at,
        }
        for a in activities
    ]

@router.post("/my-department/programs")
async def create_my_department_program(
    data: ProgramCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    program = DepartmentProgram(
        department_id=dept.id,
        title=data.title,
        description=data.description,
        program_date=data.program_date,
        program_time=data.program_time,
        location=data.location,
        created_by_id=current_user.id
    )
    db.add(program)
    db.commit()
    db.refresh(program)
    return {"message": "Program recorded successfully", "program_id": program.id}

@router.get("/my-department/programs")
async def get_my_department_programs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    programs = db.query(DepartmentProgram).filter(
        DepartmentProgram.department_id == dept.id
    ).order_by(DepartmentProgram.program_date.desc()).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "program_date": p.program_date,
            "program_time": p.program_time,
            "location": p.location,
        }
        for p in programs
    ]

@router.post("/my-department/help-requests")
async def submit_help_request(
    data: HelpRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    help_req = HelpRequest(
        source_type="department",
        source_id=dept.id,
        member_id=data.member_id,
        description=data.description,
        status="pending",
        submitted_by_id=current_user.id
    )
    db.add(help_req)
    db.commit()
    db.refresh(help_req)
    return {"message": "Sent to admin", "help_request_id": help_req.id}

@router.post("/my-department/contributions")
async def record_contribution(
    data: ContributionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a donation/contribution toward the department — kept
    lightweight and separate from the main Finance system, same approach
    as a cell's offering_amount."""
    dept = _get_my_department(current_user, db)
    contribution = DepartmentContribution(
        department_id=dept.id,
        contributor_name=data.contributor_name,
        member_id=data.member_id,
        amount=data.amount,
        purpose=data.purpose,
        contribution_date=data.contribution_date,
        recorded_by_id=current_user.id
    )
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    return {"message": "Contribution recorded", "contribution_id": contribution.id}

@router.get("/my-department/contributions")
async def get_contributions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    contributions = db.query(DepartmentContribution).filter(
        DepartmentContribution.department_id == dept.id
    ).order_by(DepartmentContribution.contribution_date.desc()).all()
    return [
        {
            "id": c.id,
            "contributor_name": c.contributor_name,
            "member_id": c.member_id,
            "amount": float(c.amount),
            "purpose": c.purpose,
            "contribution_date": c.contribution_date,
        }
        for c in contributions
    ]

@router.get("/my-department/inactive-members")
async def get_inactive_department_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Members of this department whose status isn't 'active' — the
    follow-up list."""
    dept = _get_my_department(current_user, db)
    members = db.query(Member).filter(
        Member.department_id == dept.id,
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

@router.post("/my-department/members/{member_id}/follow-up")
async def log_member_follow_up(
    member_id: int,
    data: FollowUpCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    member = db.query(Member).filter(Member.id == member_id, Member.department_id == dept.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your department")

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

@router.get("/my-department/members/{member_id}/follow-ups")
async def get_member_follow_ups(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept = _get_my_department(current_user, db)
    member = db.query(Member).filter(Member.id == member_id, Member.department_id == dept.id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in your department")

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

@router.get("/my-department/help-requests")
async def get_my_help_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """The requests THIS department has sent to admin, with status —
    lets the sender confirm it actually went through, beyond the toast."""
    dept = _get_my_department(current_user, db)
    requests = db.query(HelpRequest).filter(
        HelpRequest.source_type == "department",
        HelpRequest.source_id == dept.id
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