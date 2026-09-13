from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.announcement import Announcement, AnnouncementType
from src.models.member import Member
from src.models.cell import Cell
from src.models.department import Department

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.PASTOR, UserRole.ADMIN]

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    announcement_type: str = "public"
    priority: str = "normal"
    expires_at: Optional[str] = None
    target_cell_id: Optional[int] = None
    target_department_id: Optional[int] = None
    target_user_id: Optional[int] = None

def _parse_announcement_type(value: str) -> AnnouncementType:
    """The frontend sends lowercase values ('public', 'internal', ...).
    SQLAlchemy's Enum column stores member NAMES by default, not values —
    assigning the raw string directly (as this file used to do) fails
    every time, since 'public' matches no enum member name. Converting
    by value here gives the actual enum member SQLAlchemy expects."""
    try:
        return AnnouncementType(value)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid announcement_type: {value}")

def _parse_expires_at(value: Optional[str]):
    if not value or not value.strip():
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None

def _is_expired(announcement: Announcement) -> bool:
    if not announcement.expires_at:
        return False
    expires = announcement.expires_at
    now = datetime.now(timezone.utc) if expires.tzinfo else datetime.now()
    return expires <= now

def _is_a_worker(current_user: User, db: Session) -> bool:
    """'Worker' means actually attached to a cell or department — as its
    leader/HOD, or simply as a registered member of one. This deliberately
    does NOT check current_user.role, because assigning someone as a
    Cell's leader or a Department's head never updates their account's
    role field in this app (established repeatedly elsewhere) — role is
    not a reliable signal for this. Admin-tier roles always count too."""
    if current_user.role in MANAGE_ROLES:
        return True

    is_any_cell_leader = db.query(Cell).filter(
        (Cell.leader_id == current_user.id) | (Cell.assistant_leader_id == current_user.id)
    ).first() is not None
    if is_any_cell_leader:
        return True

    is_any_dept_head = db.query(Department).filter(
        (Department.head_id == current_user.id) | (Department.assistant_head_id == current_user.id)
    ).first() is not None
    if is_any_dept_head:
        return True

    member = db.query(Member).filter(Member.user_id == current_user.id).first()
    if member and (member.cell_id or member.department_id):
        return True

    return False

def _user_can_view(announcement: Announcement, current_user: User, db: Session) -> bool:
    """Visibility rules:
    - PUBLIC: everyone
    - INTERNAL: any logged-in user
    - WORKERS_ONLY: anyone attached to a cell or department (see
      _is_a_worker) — excludes only members with no cell/department at all
    - If target_cell_id/target_department_id is set, further restricted to
      that group's members, its leader/head, or admin-tier roles.
    - If target_user_id is set (a memo to one specific person), only that
      person or admin-tier can see it — this check is independent of and
      stacks on top of the others above.
    """
    if announcement.announcement_type == AnnouncementType.WORKERS_ONLY:
        if not _is_a_worker(current_user, db):
            return False

    is_admin_tier = current_user.role in MANAGE_ROLES

    if announcement.target_cell_id:
        member = db.query(Member).filter(Member.user_id == current_user.id).first()
        is_in_cell = bool(member and member.cell_id == announcement.target_cell_id)
        cell = db.query(Cell).filter(Cell.id == announcement.target_cell_id).first()
        is_cell_leader = bool(cell and (cell.leader_id == current_user.id or cell.assistant_leader_id == current_user.id))
        if not (is_in_cell or is_cell_leader or is_admin_tier):
            return False

    if announcement.target_department_id:
        member = db.query(Member).filter(Member.user_id == current_user.id).first()
        is_in_dept = bool(member and member.department_id == announcement.target_department_id)
        dept = db.query(Department).filter(Department.id == announcement.target_department_id).first()
        is_dept_head = bool(dept and (dept.head_id == current_user.id or dept.assistant_head_id == current_user.id))
        if not (is_in_dept or is_dept_head or is_admin_tier):
            return False

    if announcement.target_user_id:
        is_the_recipient = current_user.id == announcement.target_user_id
        if not (is_the_recipient or is_admin_tier):
            return False

    return True

def _serialize(a: Announcement, db: Session) -> dict:
    creator = db.query(User).filter(User.id == a.created_by_id).first()
    cell = db.query(Cell).filter(Cell.id == a.target_cell_id).first() if a.target_cell_id else None
    department = db.query(Department).filter(Department.id == a.target_department_id).first() if a.target_department_id else None
    target_user = db.query(User).filter(User.id == a.target_user_id).first() if a.target_user_id else None

    return {
        "id": a.id,
        "title": a.title,
        "content": a.content,
        "announcement_type": a.announcement_type.value if a.announcement_type else "public",
        "priority": a.priority,
        "is_published": a.is_published,
        "published_at": a.published_at,
        "expires_at": a.expires_at,
        "target_cell_id": a.target_cell_id,
        "target_cell_name": cell.name if cell else None,
        "target_department_id": a.target_department_id,
        "target_department_name": department.name if department else None,
        "target_user_id": a.target_user_id,
        "target_user_name": target_user.full_name if target_user else None,
        "created_by_name": creator.full_name if creator else None,
        "created_at": a.created_at,
    }

@router.get("/")
async def get_all_announcements(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Announcements visible to the current user — published, not
    expired, and matching the type/targeting visibility rules."""
    announcements = db.query(Announcement).filter(
        Announcement.is_published == True
    ).order_by(
        Announcement.priority.desc(),
        Announcement.published_at.desc()
    ).all()

    visible = [
        a for a in announcements
        if not _is_expired(a) and _user_can_view(a, current_user, db)
    ]
    return [_serialize(a, db) for a in visible]

@router.get("/public")
async def get_public_announcements(
    db: Session = Depends(get_db)
):
    """Public announcements only — no login required."""
    announcements = db.query(Announcement).filter(
        Announcement.announcement_type == AnnouncementType.PUBLIC,
        Announcement.is_published == True
    ).order_by(
        Announcement.priority.desc(),
        Announcement.published_at.desc()
    ).limit(10).all()

    active = [a for a in announcements if not _is_expired(a)]

    return [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content[:200] + "..." if len(a.content) > 200 else a.content,
            "published_at": a.published_at,
            "priority": a.priority
        }
        for a in active
    ]

def _get_email_recipients(announcement: Announcement, db: Session) -> List[str]:
    """Everyone who would actually be able to see this announcement per
    _user_can_view — same visibility rules the app itself uses — and
    who has opted into email. This is the free delivery channel; a
    WhatsApp equivalent would need Meta's per-message fees to fit the
    org's budget first."""
    candidates = db.query(User).filter(
        User.is_active == True,
        User.email_opt_in == True
    ).all()
    return [u.email for u in candidates if u.email and _user_can_view(announcement, u, db)]

@router.post("/")
async def create_announcement(
    announcement_data: AnnouncementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new announcement"""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can create announcements"
        )

    announcement_type = _parse_announcement_type(announcement_data.announcement_type)
    expires_at = _parse_expires_at(announcement_data.expires_at)

    announcement = Announcement(
        title=announcement_data.title,
        content=announcement_data.content,
        announcement_type=announcement_type,
        priority=announcement_data.priority or "normal",
        expires_at=expires_at,
        target_cell_id=announcement_data.target_cell_id,
        target_department_id=announcement_data.target_department_id,
        target_user_id=announcement_data.target_user_id,
        created_by_id=current_user.id,
        is_published=True,
        published_at=datetime.now()
    )

    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    # Fire-and-forget the email — dispatched to Celery so creating the
    # announcement doesn't block on looping through every recipient's
    # send. A failure here (bad SendGrid key, network issue, etc.)
    # should never block or roll back the announcement itself.
    try:
        recipient_emails = _get_email_recipients(announcement, db)
        if recipient_emails:
            from src.services.notification_service import NotificationService
            NotificationService(db).send_announcement_email.delay(
                announcement.title, announcement.content, recipient_emails
            )
    except Exception:
        pass

    return _serialize(announcement, db)

@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an announcement"""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can delete announcements"
        )

    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )

    db.delete(announcement)
    db.commit()

    return {"message": "Announcement deleted successfully"}

@router.put("/{announcement_id}")
async def update_announcement(
    announcement_id: int,
    announcement_data: AnnouncementCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an announcement"""
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can update announcements"
        )

    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Announcement not found"
        )

    announcement.title = announcement_data.title
    announcement.content = announcement_data.content
    announcement.announcement_type = _parse_announcement_type(announcement_data.announcement_type)
    announcement.priority = announcement_data.priority
    announcement.expires_at = _parse_expires_at(announcement_data.expires_at)
    announcement.target_cell_id = announcement_data.target_cell_id
    announcement.target_department_id = announcement_data.target_department_id
    announcement.target_user_id = announcement_data.target_user_id

    db.commit()
    db.refresh(announcement)

    return _serialize(announcement, db)