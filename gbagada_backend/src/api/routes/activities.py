from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from src.config.database import get_db
from src.api.middleware.auth import get_current_user, get_current_admin
from src.models.user import User
from src.models.recurring_activity import RecurringActivity

router = APIRouter()


class RecurringActivityCreate(BaseModel):
    title: str
    frequency_label: str
    time_label: Optional[str] = None
    location: Optional[str] = None
    is_virtual: bool = False
    link: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    display_order: int = 0


def _serialize(a: RecurringActivity) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "frequency_label": a.frequency_label,
        "time_label": a.time_label,
        "location": a.location,
        "is_virtual": a.is_virtual,
        "link": a.link,
        "description": a.description,
        "is_active": a.is_active,
        "display_order": a.display_order,
        "created_at": a.created_at,
    }


@router.get("")
@router.get("/")
async def list_activities(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """All activities, including inactive ones — for the admin management
    page. Public visitors get the /public/activities endpoint instead,
    which only ever returns active ones."""
    activities = (
        db.query(RecurringActivity)
        .order_by(RecurringActivity.display_order.asc(), RecurringActivity.id.asc())
        .all()
    )
    return [_serialize(a) for a in activities]


@router.post("")
@router.post("/")
async def create_activity(
    data: RecurringActivityCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    activity = RecurringActivity(**data.dict(), created_by_id=current_user.id)
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return _serialize(activity)


@router.put("/{activity_id}")
async def update_activity(
    activity_id: int,
    data: RecurringActivityCreate,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    activity = db.query(RecurringActivity).filter(RecurringActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    for key, value in data.dict().items():
        setattr(activity, key, value)

    db.commit()
    db.refresh(activity)
    return _serialize(activity)


@router.delete("/{activity_id}")
async def delete_activity(
    activity_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    activity = db.query(RecurringActivity).filter(RecurringActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    db.delete(activity)
    db.commit()
    return {"message": "Activity deleted successfully"}