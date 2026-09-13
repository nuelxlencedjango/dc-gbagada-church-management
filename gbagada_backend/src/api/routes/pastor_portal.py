from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User
from src.models.pastor import Pastor
from src.models.satellite import SatelliteChurch
from src.models.pastor_report import PastorReport, PastorProgram, PastorContribution
from src.models.help_request import HelpRequest

router = APIRouter()

class ReportCreate(BaseModel):
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
    amount: float
    purpose: Optional[str] = None
    contribution_date: date

class HelpRequestCreate(BaseModel):
    description: str

def _get_my_pastor_profile(current_user: User, db: Session) -> Pastor:
    """This self-service router is scoped to whichever Pastor profile is
    linked to this account via Pastor.user_id — same relational pattern
    as Department.head_id / Cell.leader_id, not the account's role field."""
    pastor = db.query(Pastor).filter(Pastor.user_id == current_user.id).first()
    if not pastor:
        raise HTTPException(status_code=404, detail="You do not have a pastor profile")
    return pastor

def _serialize_pastor(p: Pastor, db: Session) -> dict:
    satellite_name = None
    if p.assigned_satellite_id:
        s = db.query(SatelliteChurch).filter(SatelliteChurch.id == p.assigned_satellite_id).first()
        if s:
            satellite_name = s.name
    return {
        "id": p.id,
        "first_name": p.first_name,
        "last_name": p.last_name,
        "email": p.email,
        "phone": p.phone,
        "bio": p.bio,
        "assigned_satellite_id": p.assigned_satellite_id,
        "assigned_satellite_name": satellite_name,
        "is_active": p.is_active,
    }

@router.get("/my-profile")
async def get_my_pastor_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastor = _get_my_pastor_profile(current_user, db)
    return _serialize_pastor(pastor, db)

@router.post("/my-profile/reports")
async def submit_my_report(
    data: ReportCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastor = _get_my_pastor_profile(current_user, db)
    report = PastorReport(
        pastor_id=pastor.id,
        week_start_date=data.week_start_date,
        activities_performed=data.activities_performed,
        challenges=data.challenges,
        achievements=data.achievements,
        prayer_requests=data.prayer_requests,
        report=data.report,
        submitted_by_id=current_user.id
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"message": "Report submitted", "report_id": report.id}

@router.get("/my-profile/reports")
async def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastor = _get_my_pastor_profile(current_user, db)
    reports = db.query(PastorReport).filter(
        PastorReport.pastor_id == pastor.id
    ).order_by(PastorReport.week_start_date.desc()).all()
    return [
        {
            "id": r.id,
            "week_start_date": r.week_start_date,
            "activities_performed": r.activities_performed,
            "challenges": r.challenges,
            "achievements": r.achievements,
            "prayer_requests": r.prayer_requests,
            "report": r.report,
            "submitted_at": r.submitted_at,
        }
        for r in reports
    ]

@router.post("/my-profile/programs")
async def create_my_program(
    data: ProgramCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastor = _get_my_pastor_profile(current_user, db)
    program = PastorProgram(
        pastor_id=pastor.id,
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
    return {"message": "Program recorded", "program_id": program.id}

@router.get("/my-profile/programs")
async def get_my_programs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastor = _get_my_pastor_profile(current_user, db)
    programs = db.query(PastorProgram).filter(
        PastorProgram.pastor_id == pastor.id
    ).order_by(PastorProgram.program_date.desc()).all()
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

@router.post("/my-profile/contributions")
async def record_my_contribution(
    data: ContributionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastor = _get_my_pastor_profile(current_user, db)
    contribution = PastorContribution(
        pastor_id=pastor.id,
        contributor_name=data.contributor_name,
        amount=data.amount,
        purpose=data.purpose,
        contribution_date=data.contribution_date,
        recorded_by_id=current_user.id
    )
    db.add(contribution)
    db.commit()
    db.refresh(contribution)
    return {"message": "Contribution recorded", "contribution_id": contribution.id}

@router.get("/my-profile/contributions")
async def get_my_contributions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastor = _get_my_pastor_profile(current_user, db)
    contributions = db.query(PastorContribution).filter(
        PastorContribution.pastor_id == pastor.id
    ).order_by(PastorContribution.contribution_date.desc()).all()
    return [
        {
            "id": c.id,
            "contributor_name": c.contributor_name,
            "amount": float(c.amount),
            "purpose": c.purpose,
            "contribution_date": c.contribution_date,
        }
        for c in contributions
    ]

@router.post("/my-profile/help-requests")
async def submit_help_request(
    data: HelpRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastor = _get_my_pastor_profile(current_user, db)
    help_req = HelpRequest(
        source_type="pastor",
        source_id=pastor.id,
        member_id=None,
        description=data.description,
        status="pending",
        submitted_by_id=current_user.id
    )
    db.add(help_req)
    db.commit()
    db.refresh(help_req)
    return {"message": "Sent to admin", "help_request_id": help_req.id}

@router.get("/my-profile/help-requests")
async def get_my_help_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pastor = _get_my_pastor_profile(current_user, db)
    requests = db.query(HelpRequest).filter(
        HelpRequest.source_type == "pastor",
        HelpRequest.source_id == pastor.id
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
