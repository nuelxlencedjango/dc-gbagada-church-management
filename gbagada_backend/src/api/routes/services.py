from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, date, time

from src.config.database import get_db
from src.api.middleware.auth import get_current_user, get_current_pastor, get_current_admin
from src.models.user import User
from src.models.service import Service
from src.models.finance import Finance, TransactionType, TransactionStatus

router = APIRouter()

class ServiceCreate(BaseModel):
    name: str
    date: datetime
    start_time: str
    end_time: Optional[str] = None
    overseer_id: Optional[int] = None
    opening_prayer_id: Optional[int] = None
    closing_prayer_id: Optional[int] = None
    worship_leader_id: Optional[int] = None
    speaker_id: Optional[int] = None
    speaker_name: Optional[str] = None
    theme: Optional[str] = None
    notes: Optional[str] = None

def _parse_time(value: Optional[str]):
    if not value:
        return None
    try:
        parts = [int(p) for p in value.split(':')]
        return time(*parts[:3])
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail=f"Invalid time value: {value}")

def _serialize_service(s: Service) -> dict:
    def person(rel):
        return {"id": rel.id, "full_name": rel.full_name} if rel else None

    return {
        "id": s.id,
        "name": s.name,
        "date": s.date,
        "start_time": s.start_time.strftime("%H:%M") if s.start_time else None,
        "end_time": s.end_time.strftime("%H:%M") if s.end_time else None,
        "overseer_id": s.overseer_id,
        "overseer": person(s.overseer),
        "opening_prayer_id": s.opening_prayer_id,
        "opening_prayer": person(s.opening_prayer),
        "closing_prayer_id": s.closing_prayer_id,
        "closing_prayer": person(s.closing_prayer),
        "worship_leader_id": s.worship_leader_id,
        "worship_leader": person(s.worship_leader),
        "speaker_id": s.speaker_id,
        "speaker": person(s.speaker),
        "speaker_name": s.speaker_name,
        "theme": s.theme,
        "notes": s.notes,
        "attendance": s.attendance,
        "offerings_recorded": s.offerings_recorded,
        "offerings_total": float(s.offerings_total) if s.offerings_total else 0,
        "is_cancelled": s.is_cancelled,
        "cancellation_reason": s.cancellation_reason,
        "created_at": s.created_at,
    }

@router.get("/")
async def get_services(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Service)
    if start_date:
        query = query.filter(Service.date >= start_date)
    if end_date:
        query = query.filter(Service.date <= end_date)
    services = query.order_by(Service.date.desc()).all()
    return [_serialize_service(s) for s in services]

@router.get("/upcoming")
async def get_upcoming_services(
    db: Session = Depends(get_db)
):
    today = datetime.now().date()
    services = db.query(Service).filter(
        Service.date >= today,
        Service.is_cancelled == False
    ).order_by(Service.date.asc()).limit(10).all()

    result = []
    for service in services:
        result.append({
            "id": service.id,
            "name": service.name,
            "date": service.date,
            "start_time": service.start_time.strftime("%I:%M %p") if service.start_time else None,
            "theme": service.theme,
            "overseer": service.overseer.full_name if service.overseer else None,
            "speaker": (service.speaker.full_name if service.speaker else None) or service.speaker_name
        })
    return result

@router.post("/")
async def create_service(
    service_data: ServiceCreate,
    current_user: User = Depends(get_current_pastor),
    db: Session = Depends(get_db)
):
    data = service_data.dict()
    data['start_time'] = _parse_time(data['start_time'])
    data['end_time'] = _parse_time(data.get('end_time'))

    service = Service(**data)
    db.add(service)
    db.commit()
    db.refresh(service)
    return _serialize_service(service)

@router.put("/{service_id}")
async def update_service(
    service_id: int,
    service_data: ServiceCreate,
    current_user: User = Depends(get_current_pastor),
    db: Session = Depends(get_db)
):
    """This route never existed before — every 'Edit' click in the UI
    was silently hitting a 404. Officials could be set on creation but
    never changed afterward."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    data = service_data.dict()
    data['start_time'] = _parse_time(data['start_time'])
    data['end_time'] = _parse_time(data.get('end_time'))

    for key, value in data.items():
        setattr(service, key, value)

    db.commit()
    db.refresh(service)
    return _serialize_service(service)

@router.delete("/{service_id}")
async def delete_service(
    service_id: int,
    current_user: User = Depends(get_current_pastor),
    db: Session = Depends(get_db)
):
    """Also never existed before — Delete was hitting a 404 too."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    db.delete(service)
    db.commit()
    return {"message": "Service deleted successfully"}

@router.post("/{service_id}/record-offering")
async def record_service_offering(
    service_id: int,
    amount: float,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    service.offerings_total = (service.offerings_total or 0) + amount
    service.offerings_recorded = True

    # This used to only update the number on the Service row, invisible
    # to Finance entirely — its transaction list, summary, and category
    # breakdown all read from the finances table, which this never
    # touched. Now it also creates a real Finance transaction, going
    # through the same PENDING -> confirmed-by-a-different-admin flow
    # every other offering already uses.
    finance_txn = Finance(
        transaction_type=TransactionType.OFFERING,
        amount=amount,
        description=f"Offering — {service.name} ({service.date.strftime('%d %b %Y') if service.date else 'undated'})",
        date=service.date or datetime.now(),
        recorded_by_id=current_user.id,
        status=TransactionStatus.PENDING,
        service_type=service.name,
    )
    db.add(finance_txn)

    db.commit()
    db.refresh(finance_txn)

    return {"message": "Offering recorded successfully", "finance_transaction_id": finance_txn.id}

@router.get("/rotation-report")
async def get_rotation_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Who's served in which role, how often, and over what date range —
    the 'for how long' piece the per-service assignment view alone
    doesn't answer. Aggregates in Python rather than SQL GROUP BY, which
    is fine at this scale (a single church's service history)."""
    query = db.query(Service)
    if start_date:
        query = query.filter(Service.date >= start_date)
    if end_date:
        query = query.filter(Service.date <= end_date)
    services = query.order_by(Service.date.asc()).all()

    roles = {
        "overseer": "overseer_id",
        "speaker": "speaker_id",
        "opening_prayer": "opening_prayer_id",
        "closing_prayer": "closing_prayer_id",
        "worship_leader": "worship_leader_id",
    }

    report = {}
    for role_label, field_name in roles.items():
        tally = {}
        for s in services:
            user_id = getattr(s, field_name)
            if not user_id:
                continue
            if user_id not in tally:
                tally[user_id] = {"count": 0, "first_date": s.date, "last_date": s.date}
            tally[user_id]["count"] += 1
            if s.date < tally[user_id]["first_date"]:
                tally[user_id]["first_date"] = s.date
            if s.date > tally[user_id]["last_date"]:
                tally[user_id]["last_date"] = s.date

        rows = []
        for user_id, info in tally.items():
            u = db.query(User).filter(User.id == user_id).first()
            rows.append({
                "user_id": user_id,
                "full_name": u.full_name if u else f"User {user_id}",
                "times_served": info["count"],
                "first_served": info["first_date"],
                "last_served": info["last_date"],
            })
        rows.sort(key=lambda r: r["times_served"], reverse=True)
        report[role_label] = rows

    return report