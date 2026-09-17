from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import os

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User
from src.models.service import Service
from src.models.department import Department, DepartmentActivity
from src.models.cell import Cell, CellActivity
from src.models.announcement import Announcement, AnnouncementType
from src.services.rag_service import RAGService

router = APIRouter()

_rag_service = RAGService()

MANAGE_ROLES = ['super_admin', 'overall_pastor', 'pastor', 'admin']

class AIQuery(BaseModel):
    question: str
    context: Optional[dict] = None

class AIResponse(BaseModel):
    answer: str
    source: str = "groq_rag"


def _build_announcements_context(db: Session, current_user: Optional[User] = None) -> str:
    """Real announcements from the app's actual Announcements feature —
    conservatively scoped: public announcements for everyone, plus
    anything individually targeted at the specific person asking.
    Cell- and department-targeted announcements are deliberately left
    out here rather than guessed at, to avoid risking a mismatch that
    could surface something not meant for that person."""
    now = datetime.now()
    query = db.query(Announcement).filter(
        Announcement.is_published == True,
        (Announcement.expires_at.is_(None)) | (Announcement.expires_at > now)
    )
    if current_user:
        query = query.filter(
            (Announcement.announcement_type == AnnouncementType.PUBLIC) |
            (Announcement.target_user_id == current_user.id)
        )
    else:
        query = query.filter(Announcement.announcement_type == AnnouncementType.PUBLIC)

    announcements = query.order_by(Announcement.priority.desc(), Announcement.published_at.desc()).limit(5).all()
    if not announcements:
        return ""

    lines = [f"- {a.title}: {a.content}" for a in announcements]
    return "Current announcements:\n" + "\n".join(lines)


def _build_public_context(db: Session) -> str:
    """Facts anyone is allowed to know — the same information already
    visible on the public site or to any logged-in user. Never includes
    attendance, offerings, or internal department reports."""
    parts = []

    # Static facts (contact info, location) aren't learned from anywhere
    # in the app — they only ever lived in the old hardcoded fast-path
    # answers. Removing the fast-paths without including these here
    # would leave the AI with genuinely no way to know them at all.
    static_facts = (
        f"Dominion City Gbagada is located at Gbagada, Lagos, Nigeria.\n"
        f"Phone: {os.getenv('CHURCH_PHONE', '+234-XXX-XXX-XXXX')}\n"
        f"Email: {os.getenv('CHURCH_EMAIL', 'info@dominioncitygbagada.com')}"
    )
    parts.append("Contact and location:\n" + static_facts)

    window_start = datetime.now() - timedelta(days=7)
    services = (
        db.query(Service)
        .filter(Service.date >= window_start, Service.is_cancelled == False)
        .order_by(Service.date.desc())
        .limit(8)
        .all()
    )
    if services:
        lines = []
        for s in services:
            time_str = s.start_time.strftime("%I:%M %p") if s.start_time else ""
            theme_str = f" — Theme: {s.theme}" if s.theme else ""
            lines.append(f"- {s.name} on {s.date.strftime('%A, %B %d %Y')} at {time_str}{theme_str}")
        parts.append("Recent and upcoming services:\n" + "\n".join(lines))

    departments = db.query(Department).filter(Department.is_active == True).all()
    if departments:
        lines = [f"- {d.name}: {d.description}" if d.description else f"- {d.name}" for d in departments]
        parts.append("Departments at Dominion City Gbagada:\n" + "\n".join(lines))

    cells = db.query(Cell).filter(Cell.is_active == True).all()
    if cells:
        lines = []
        for c in cells:
            meeting_info = []
            if c.meeting_day:
                meeting_info.append(c.meeting_day)
            if c.meeting_time:
                meeting_info.append(c.meeting_time)
            if c.meeting_location:
                meeting_info.append(f"at {c.meeting_location}")
            meeting_str = f" — meets {' '.join(meeting_info)}" if meeting_info else ""
            lines.append(f"- {c.name}{meeting_str}")
        parts.append("Cell groups at Dominion City Gbagada:\n" + "\n".join(lines))

    return "\n\n".join(parts)


def _build_restricted_context(db: Session, current_user: User) -> str:
    """Everything gated by real permission, mirroring exactly what the
    person could already see in their own portal: internal department
    reports (own department for a head, all for admin-tier), each
    department's member roster (same access boundary), and — admin/
    pastor only — the overall church membership count, matching the
    same gate already used on the admin Dashboard's stat card."""
    parts = []

    if current_user.role in MANAGE_ROLES:
        depts = db.query(Department).filter(Department.is_active == True).all()
        from src.models.member import Member
        total_members = db.query(Member).filter(Member.membership_status == "active").count()
        parts.append(f"Total active church members: {total_members}")
    else:
        depts = db.query(Department).filter(
            (Department.head_id == current_user.id) | (Department.assistant_head_id == current_user.id)
        ).all()

    if not depts:
        return "\n\n".join(parts)

    dept_ids = [d.id for d in depts]
    dept_names = {d.id: d.name for d in depts}

    # Member rosters — same access boundary as the reports below: a
    # department head only ever sees their own department's list,
    # exactly matching their portal's Members tab.
    roster_lines = []
    for d in depts:
        names = [m.first_name + " " + m.last_name for m in d.members]
        if names:
            roster_lines.append(f"- {d.name} ({len(names)} members): " + ", ".join(names))
    if roster_lines:
        parts.append("Department member rosters:\n" + "\n".join(roster_lines))

    activities = (
        db.query(DepartmentActivity)
        .filter(DepartmentActivity.department_id.in_(dept_ids))
        .order_by(DepartmentActivity.week_start_date.desc())
        .limit(5)
        .all()
    )
    if activities:
        lines = []
        for a in activities:
            dept_name = dept_names.get(a.department_id, "Unknown Department")
            week = a.week_start_date.strftime("%B %d, %Y")
            details = []
            if a.achievements:
                details.append(f"Achievements: {a.achievements}")
            if a.challenges:
                details.append(f"Challenges: {a.challenges}")
            if a.prayer_requests:
                details.append(f"Prayer requests: {a.prayer_requests}")
            lines.append(f"- {dept_name}, week of {week}: " + "; ".join(details))

        if current_user.role in MANAGE_ROLES:
            header = "Internal department reports across all departments (you have admin-level oversight access):\n"
        else:
            own_names = ", ".join(dept_names.values())
            header = f"Internal reports for the department(s) {current_user.full_name} personally heads ({own_names}):\n"

        parts.append(header + "\n".join(lines))

    return "\n\n".join(parts)


def _build_cell_restricted_context(db: Session, current_user: User) -> str:
    """Mirrors _build_restricted_context exactly, but for Cells. Cell
    reports are, if anything, more sensitive than department ones —
    they include real names of attendees and children present, plus
    actual offering amounts — so the same strict scoping applies: a
    Cell Leader only ever sees their own cell(s), never another's."""
    if current_user.role in MANAGE_ROLES:
        cells = db.query(Cell).filter(Cell.is_active == True).all()
    else:
        cells = db.query(Cell).filter(
            (Cell.leader_id == current_user.id) | (Cell.assistant_leader_id == current_user.id)
        ).all()

    if not cells:
        return ""

    cell_ids = [c.id for c in cells]
    cell_names = {c.id: c.name for c in cells}
    parts = []

    roster_lines = []
    for c in cells:
        names = [m.first_name + " " + m.last_name for m in c.members]
        if names:
            roster_lines.append(f"- {c.name} ({len(names)} members): " + ", ".join(names))
    if roster_lines:
        parts.append("Cell member rosters:\n" + "\n".join(roster_lines))

    activities = (
        db.query(CellActivity)
        .filter(CellActivity.cell_id.in_(cell_ids))
        .order_by(CellActivity.week_start_date.desc())
        .limit(5)
        .all()
    )
    if activities:
        lines = []
        for a in activities:
            cell_name = cell_names.get(a.cell_id, "Unknown Cell")
            week = a.week_start_date.strftime("%B %d, %Y")
            details = []
            if a.attendance is not None:
                details.append(f"Attendance: {a.attendance}")
            if a.new_members_count:
                details.append(f"New members: {a.new_members_count}")
            if a.testimonies:
                details.append(f"Testimonies: {a.testimonies}")
            if a.challenges:
                details.append(f"Challenges: {a.challenges}")
            if a.prayer_points:
                details.append(f"Prayer points: {a.prayer_points}")
            if a.offering_amount:
                details.append(f"Offering: ₦{float(a.offering_amount):,.2f}")
            lines.append(f"- {cell_name}, week of {week}: " + "; ".join(details))

        if current_user.role in MANAGE_ROLES:
            header = "Internal cell reports across all cells (you have admin-level oversight access):\n"
        else:
            own_names = ", ".join(cell_names.values())
            header = f"Internal reports for the cell(s) {current_user.full_name} personally leads ({own_names}):\n"

        parts.append(header + "\n".join(lines))

    return "\n\n".join(parts)


@router.post("/chat", response_model=AIResponse)
async def chat_with_ai(
    query: AIQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Every question goes through the real pipeline now — live
    Gbagada data, HQ background, and Groq's own understanding of the
    phrasing. No keyword pre-matching: it can't anticipate every way
    someone might ask, and worse, it was overriding accurate live data
    (e.g. a hardcoded service time) with stale hardcoded answers."""
    user_context = {"role": current_user.role, "name": current_user.full_name, "user_id": current_user.id}

    live_context = _build_public_context(db)
    announcements_context = _build_announcements_context(db, current_user)
    if announcements_context:
        live_context = f"{live_context}\n\n{announcements_context}" if live_context else announcements_context
    restricted = _build_restricted_context(db, current_user)
    if restricted:
        live_context = f"{live_context}\n\n{restricted}" if live_context else restricted
    cell_restricted = _build_cell_restricted_context(db, current_user)
    if cell_restricted:
        live_context = f"{live_context}\n\n{cell_restricted}" if live_context else cell_restricted

    try:
        answer = _rag_service.query(query.question, user_context, live_context=live_context)
        return AIResponse(answer=answer, source="groq_rag")
    except Exception as e:
        print(f"AI Error: {e}")
        return AIResponse(answer="I apologize, but I'm having trouble answering that right now. Please try again later or contact the church office.", source="error")


@router.post("/update-knowledge")
async def update_knowledge(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role not in MANAGE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins and pastors can update the knowledge base")
    hq_success = _rag_service.scrape_church_hq()
    return {"message": "Knowledge base updated successfully", "hq_website_scraped": hq_success, "status": "completed"}


@router.get("/church-info")
async def get_church_info(info_type: str):
    return {"info": _rag_service.get_church_info(info_type)}


@router.post("/public-chat")
async def public_chat(query: AIQuery, db: Session = Depends(get_db)):
    """No authentication — never calls _build_restricted_context.
    Same real pipeline as /chat, just with only the public tier of
    live context available."""
    live_context = _build_public_context(db)
    announcements_context = _build_announcements_context(db, None)
    if announcements_context:
        live_context = f"{live_context}\n\n{announcements_context}" if live_context else announcements_context

    try:
        answer = _rag_service.query(query.question, None, live_context=live_context)
        return AIResponse(answer=answer, source="groq_rag")
    except Exception as e:
        print(f"AI Error: {e}")
        return AIResponse(answer="I apologize, but I'm having trouble answering that right now. Please try again later or contact the church office directly.", source="error")