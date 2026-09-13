from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List, Literal
from pydantic import BaseModel
from datetime import date, datetime, timedelta

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.mvp import MVP
from src.models.training import TrainingSession, TrainingRegistration

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.ADMIN, UserRole.PASTOR]
TRAINING_TYPES = ["mvps", "members", "workers", "department", "headquarters", "other"]

class TrainingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    training_type: Literal["mvps", "members", "workers", "department", "headquarters", "other"] = "other"
    date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    facilitator: Optional[str] = None
    max_capacity: Optional[int] = 50
    notes: Optional[str] = None

class RegisterAttendee(BaseModel):
    attendee_type: Literal["member", "mvp"]
    attendee_id: int

class TrainingResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    training_type: str
    date: date
    start_time: Optional[str]
    end_time: Optional[str]
    location: Optional[str]
    facilitator: Optional[str]
    max_capacity: Optional[int]
    status: str
    notes: Optional[str]
    attendee_count: int
    created_at: datetime

class AttendeeResponse(BaseModel):
    registration_id: int
    attendee_type: str
    attendee_id: int
    name: str
    status: str
    registered_at: datetime

def _attendee_count(training_id: int, db: Session) -> int:
    return db.query(TrainingRegistration).filter(TrainingRegistration.training_id == training_id).count()

def _serialize_training(t: TrainingSession, db: Session) -> dict:
    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "training_type": t.training_type,
        "date": t.date,
        "start_time": t.start_time,
        "end_time": t.end_time,
        "location": t.location,
        "facilitator": t.facilitator,
        "max_capacity": t.max_capacity,
        "status": t.status,
        "notes": t.notes,
        "attendee_count": _attendee_count(t.id, db),
        "created_at": t.created_at,
    }

def _attendee_name(reg: TrainingRegistration, db: Session) -> str:
    if reg.attendee_type == "member":
        m = db.query(Member).filter(Member.id == reg.attendee_id).first()
        return f"{m.first_name} {m.last_name}" if m else f"Member {reg.attendee_id}"
    else:
        mvp = db.query(MVP).filter(MVP.id == reg.attendee_id).first()
        return f"{mvp.first_name} {mvp.last_name}" if mvp else f"MVP {reg.attendee_id}"

@router.get("/overview")
async def get_training_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregate stats across ALL trainings, independent of any active
    filter on the list view — powers the Overview cards."""
    all_trainings = db.query(TrainingSession).all()
    today = date.today()

    total_sessions = len(all_trainings)
    upcoming = sum(1 for t in all_trainings if t.date >= today and t.status in ("scheduled", "ongoing"))
    completed = sum(1 for t in all_trainings if t.status == "completed")
    cancelled = sum(1 for t in all_trainings if t.status == "cancelled")

    by_type = {tt: 0 for tt in TRAINING_TYPES}
    for t in all_trainings:
        if t.training_type in by_type:
            by_type[t.training_type] += 1

    registered_count = db.query(TrainingRegistration).count()
    attended_count = db.query(TrainingRegistration).filter(TrainingRegistration.status == "attended").count()
    attendance_rate = round((attended_count / registered_count * 100) if registered_count > 0 else 0, 1)

    monthly_trend = []
    cursor = today.replace(day=1)
    months = []
    for _ in range(6):
        months.append(cursor)
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    months.reverse()

    for month_start in months:
        if month_start.month == 12:
            next_month = month_start.replace(year=month_start.year + 1, month=1)
        else:
            next_month = month_start.replace(month=month_start.month + 1)
        count = sum(1 for t in all_trainings if month_start <= t.date < next_month)
        monthly_trend.append({"month": month_start.strftime("%b %Y"), "count": count})

    return {
        "total_sessions": total_sessions,
        "upcoming_sessions": upcoming,
        "completed_sessions": completed,
        "cancelled_sessions": cancelled,
        "registered_count": registered_count,
        "attended_count": attended_count,
        "attendance_rate": attendance_rate,
        "by_type": by_type,
        "monthly_trend": monthly_trend,
    }

@router.get("/", response_model=List[TrainingResponse])
async def get_trainings(
    training_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(TrainingSession)
    if training_type:
        query = query.filter(TrainingSession.training_type == training_type)
    if status:
        query = query.filter(TrainingSession.status == status)
    sessions = query.order_by(TrainingSession.date.desc()).all()
    return [_serialize_training(t, db) for t in sessions]

@router.post("/", response_model=TrainingResponse)
async def create_training(
    data: TrainingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    session_obj = TrainingSession(
        title=data.title,
        description=data.description,
        training_type=data.training_type,
        date=data.date,
        start_time=data.start_time,
        end_time=data.end_time,
        location=data.location,
        facilitator=data.facilitator,
        max_capacity=data.max_capacity,
        notes=data.notes,
        status="scheduled",
        created_by_id=current_user.id
    )
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)
    return _serialize_training(session_obj, db)

@router.put("/{training_id}", response_model=TrainingResponse)
async def update_training(
    training_id: int,
    data: TrainingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    session_obj = db.query(TrainingSession).filter(TrainingSession.id == training_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Training not found")

    session_obj.title = data.title
    session_obj.description = data.description
    session_obj.training_type = data.training_type
    session_obj.date = data.date
    session_obj.start_time = data.start_time
    session_obj.end_time = data.end_time
    session_obj.location = data.location
    session_obj.facilitator = data.facilitator
    session_obj.max_capacity = data.max_capacity
    session_obj.notes = data.notes

    db.commit()
    db.refresh(session_obj)
    return _serialize_training(session_obj, db)

@router.delete("/{training_id}")
async def delete_training(
    training_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    session_obj = db.query(TrainingSession).filter(TrainingSession.id == training_id).first()
    if not session_obj:
        raise HTTPException(status_code=404, detail="Training not found")

    db.query(TrainingRegistration).filter(TrainingRegistration.training_id == training_id).delete()
    db.delete(session_obj)
    db.commit()
    return {"message": "Training deleted"}

@router.post("/{training_id}/register")
async def register_attendee(
    training_id: int,
    data: RegisterAttendee,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    training = db.query(TrainingSession).filter(TrainingSession.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")

    if data.attendee_type == "member":
        exists = db.query(Member).filter(Member.id == data.attendee_id).first()
        if not exists:
            raise HTTPException(status_code=404, detail="Member not found")
    else:
        exists = db.query(MVP).filter(MVP.id == data.attendee_id).first()
        if not exists:
            raise HTTPException(status_code=404, detail="MVP not found")

    already_registered = db.query(TrainingRegistration).filter(
        TrainingRegistration.training_id == training_id,
        TrainingRegistration.attendee_type == data.attendee_type,
        TrainingRegistration.attendee_id == data.attendee_id
    ).first()
    if already_registered:
        raise HTTPException(status_code=400, detail="Already registered for this training")

    current_count = _attendee_count(training_id, db)
    if training.max_capacity and current_count >= training.max_capacity:
        raise HTTPException(status_code=400, detail="Training is at full capacity")

    registration = TrainingRegistration(
        training_id=training_id,
        attendee_type=data.attendee_type,
        attendee_id=data.attendee_id,
        status="registered"
    )
    db.add(registration)
    db.commit()
    return {"message": "Registered successfully"}

@router.get("/{training_id}/attendees", response_model=List[AttendeeResponse])
async def get_attendees(
    training_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    training = db.query(TrainingSession).filter(TrainingSession.id == training_id).first()
    if not training:
        raise HTTPException(status_code=404, detail="Training not found")

    registrations = db.query(TrainingRegistration).filter(
        TrainingRegistration.training_id == training_id
    ).order_by(TrainingRegistration.registered_at.asc()).all()

    return [
        {
            "registration_id": r.id,
            "attendee_type": r.attendee_type,
            "attendee_id": r.attendee_id,
            "name": _attendee_name(r, db),
            "status": r.status,
            "registered_at": r.registered_at,
        }
        for r in registrations
    ]

@router.post("/{training_id}/attendees/{registration_id}/mark")
async def mark_attendance(
    training_id: int,
    registration_id: int,
    attendance_status: Literal["attended", "no_show", "registered"],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Not authorized")

    registration = db.query(TrainingRegistration).filter(
        TrainingRegistration.id == registration_id,
        TrainingRegistration.training_id == training_id
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    registration.status = attendance_status
    db.commit()
    return {"message": f"Marked as {attendance_status}"}
