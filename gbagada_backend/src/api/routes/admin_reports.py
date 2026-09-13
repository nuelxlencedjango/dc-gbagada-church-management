from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.department import Department, DepartmentActivity
from src.models.department_program import DepartmentProgram
from src.models.cell import Cell, CellActivity
from src.models.cell_activity_agenda import CellActivityAgendaItem
from src.models.member_follow_up import MemberFollowUp
from src.models.pastor import Pastor
from src.models.pastor_report import PastorReport, PastorProgram

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.PASTOR, UserRole.ADMIN]

def _require_admin(current_user: User):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

@router.get("/department-reports")
async def get_all_department_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Every department's weekly activity reports, most recent first."""
    _require_admin(current_user)
    activities = db.query(DepartmentActivity).order_by(DepartmentActivity.week_start_date.desc()).all()
    result = []
    for a in activities:
        dept = db.query(Department).filter(Department.id == a.department_id).first()
        submitter = db.query(User).filter(User.id == a.submitted_by_id).first()
        result.append({
            "id": a.id,
            "department_name": dept.name if dept else f"Department {a.department_id}",
            "week_start_date": a.week_start_date,
            "activities_performed": a.activities_performed,
            "challenges": a.challenges,
            "achievements": a.achievements,
            "prayer_requests": a.prayer_requests,
            "report": a.report,
            "submitted_by_name": submitter.full_name if submitter else None,
            "submitted_at": a.submitted_at,
        })
    return result

@router.get("/department-programs")
async def get_all_department_programs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Every department's recorded programs/events."""
    _require_admin(current_user)
    programs = db.query(DepartmentProgram).order_by(DepartmentProgram.program_date.desc()).all()
    result = []
    for p in programs:
        dept = db.query(Department).filter(Department.id == p.department_id).first()
        result.append({
            "id": p.id,
            "department_name": dept.name if dept else f"Department {p.department_id}",
            "title": p.title,
            "description": p.description,
            "program_date": p.program_date,
            "program_time": p.program_time,
            "location": p.location,
        })
    return result

@router.get("/cell-reports")
async def get_all_cell_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Every cell's weekly activity reports, most recent first."""
    _require_admin(current_user)
    activities = db.query(CellActivity).order_by(CellActivity.week_start_date.desc()).all()
    result = []
    for a in activities:
        cell = db.query(Cell).filter(Cell.id == a.cell_id).first()
        submitter = db.query(User).filter(User.id == a.submitted_by_id).first()
        agenda_items = db.query(CellActivityAgendaItem).filter(
            CellActivityAgendaItem.cell_activity_id == a.id
        ).order_by(CellActivityAgendaItem.sort_order.asc()).all()

        result.append({
            "id": a.id,
            "cell_name": cell.name if cell else f"Cell {a.cell_id}",
            "week_start_date": a.week_start_date,
            "attendance": a.attendance,
            "new_members_count": a.new_members_count,
            "offering_amount": float(a.offering_amount) if getattr(a, "offering_amount", None) else None,
            "meeting_location": getattr(a, "meeting_location", None),
            "attendee_names": getattr(a, "attendee_names", None),
            "children_names": getattr(a, "children_names", None),
            "prayer_points": a.prayer_points,
            "testimonies": a.testimonies,
            "challenges": a.challenges,
            "report": a.report,
            "submitted_by_name": submitter.full_name if submitter else None,
            "submitted_at": a.submitted_at,
            "agenda_items": [
                {"segment_name": ai.segment_name, "start_time": ai.start_time, "end_time": ai.end_time}
                for ai in agenda_items
            ],
        })
    return result

@router.get("/follow-ups")
async def get_all_follow_ups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Every logged follow-up on inactive members, across all departments
    and cells."""
    _require_admin(current_user)
    follow_ups = db.query(MemberFollowUp).order_by(MemberFollowUp.follow_up_date.desc()).all()
    result = []
    for f in follow_ups:
        member = db.query(Member).filter(Member.id == f.member_id).first()
        follower = db.query(User).filter(User.id == f.followed_up_by_id).first()
        result.append({
            "id": f.id,
            "member_name": f"{member.first_name} {member.last_name}" if member else f"Member {f.member_id}",
            "follow_up_date": f.follow_up_date,
            "method": f.method,
            "reason_for_inactivity": f.reason_for_inactivity,
            "notes": f.notes,
            "outcome": f.outcome,
            "followed_up_by_name": follower.full_name if follower else None,
        })
    return result

@router.get("/pastor-reports")
async def get_all_pastor_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Every pastor's weekly reports, most recent first."""
    _require_admin(current_user)
    reports = db.query(PastorReport).order_by(PastorReport.week_start_date.desc()).all()
    result = []
    for r in reports:
        pastor = db.query(Pastor).filter(Pastor.id == r.pastor_id).first()
        submitter = db.query(User).filter(User.id == r.submitted_by_id).first()
        result.append({
            "id": r.id,
            "pastor_name": f"{pastor.first_name} {pastor.last_name}" if pastor else f"Pastor {r.pastor_id}",
            "week_start_date": r.week_start_date,
            "activities_performed": r.activities_performed,
            "challenges": r.challenges,
            "achievements": r.achievements,
            "prayer_requests": r.prayer_requests,
            "report": r.report,
            "submitted_by_name": submitter.full_name if submitter else None,
            "submitted_at": r.submitted_at,
        })
    return result

@router.get("/pastor-programs")
async def get_all_pastor_programs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Every pastor's recorded programs/events."""
    _require_admin(current_user)
    programs = db.query(PastorProgram).order_by(PastorProgram.program_date.desc()).all()
    result = []
    for p in programs:
        pastor = db.query(Pastor).filter(Pastor.id == p.pastor_id).first()
        result.append({
            "id": p.id,
            "pastor_name": f"{pastor.first_name} {pastor.last_name}" if pastor else f"Pastor {p.pastor_id}",
            "title": p.title,
            "description": p.description,
            "program_date": p.program_date,
            "program_time": p.program_time,
            "location": p.location,
        })
    return result