from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from datetime import date, datetime, timedelta
import shutil
import uuid
from pathlib import Path

from src.config.database import get_db
from src.api.middleware.auth import get_current_user, get_current_admin, get_current_cell_leader
from src.models.user import User, UserRole
from src.models.member import Member
from src.models.cell import Cell
from src.models.department import Department
from src.services.auth import AuthService

router = APIRouter()

class MemberCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone_number: str
    address: str
    date_of_birth: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    is_first_timer: bool = False
    cell_id: Optional[int] = None
    department_id: Optional[int] = None

class MemberResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    phone_number: str
    address: Optional[str]
    cell_id: Optional[int]
    department_id: Optional[int]
    membership_status: str
    profile_picture_url: Optional[str] = None
    user_id: Optional[int] = None
    department_name: Optional[str] = None
    cell_name: Optional[str] = None

class CreateUserRequest(BaseModel):
    password: str

def _safe_date(year: int, month: int, day: int) -> date:
    """A Feb 29 birthday in a non-leap year has no literal same-day
    equivalent — fall back to Feb 28 rather than crash."""
    try:
        return date(year, month, day)
    except ValueError:
        return date(year, month, day - 1)

@router.get("/birthdays/upcoming")
async def get_upcoming_birthdays(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Members with a birthday in the next N days, matched by month/day
    only — the stored date_of_birth's year is irrelevant here. Built by
    generating the exact set of MM-DD strings in the window rather than
    doing date arithmetic directly on year-bearing dates, which sidesteps
    the December-to-January wraparound entirely."""
    today = date.today()
    window_mmdd = set()
    for i in range(days + 1):
        d = today + timedelta(days=i)
        window_mmdd.add(f"{d.month:02d}-{d.day:02d}")

    members = db.query(Member).filter(
        Member.date_of_birth.isnot(None),
        Member.membership_status == "active"
    ).all()

    upcoming = []
    for m in members:
        mmdd = f"{m.date_of_birth.month:02d}-{m.date_of_birth.day:02d}"
        if mmdd not in window_mmdd:
            continue

        this_year_bday = _safe_date(today.year, m.date_of_birth.month, m.date_of_birth.day)
        next_bday = this_year_bday if this_year_bday >= today else _safe_date(today.year + 1, m.date_of_birth.month, m.date_of_birth.day)

        upcoming.append({
            "id": m.id,
            "first_name": m.first_name,
            "last_name": m.last_name,
            "date_of_birth": m.date_of_birth,
            "next_birthday": next_bday,
            "phone_number": m.phone_number,
            "days_until": (next_bday - today).days
        })

    upcoming.sort(key=lambda x: x["days_until"])
    return upcoming

@router.get("", response_model=List[MemberResponse])
@router.get("/", response_model=List[MemberResponse])
async def get_members(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    cell_id: Optional[int] = None,
    department_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all members with optional filters - includes department and cell names"""
    query = db.query(Member)
    
    # Eager load relationships to get names
    query = query.outerjoin(Department, Member.department_id == Department.id)\
                 .outerjoin(Cell, Member.cell_id == Cell.id)
    
    if search:
        query = query.filter(
            (Member.first_name.ilike(f"%{search}%")) |
            (Member.last_name.ilike(f"%{search}%")) |
            (Member.email.ilike(f"%{search}%"))
        )
    if cell_id:
        query = query.filter(Member.cell_id == cell_id)
    if department_id:
        query = query.filter(Member.department_id == department_id)
    
    if current_user.role == UserRole.CELL_LEADER:
        cell = db.query(Cell).filter(Cell.leader_id == current_user.id).first()
        if cell:
            query = query.filter(Member.cell_id == cell.id)
    
    members = query.offset(skip).limit(limit).all()
    
    # Build response with department and cell names
    result = []
    for member in members:
        result.append({
            "id": member.id,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "email": member.email,
            "phone_number": member.phone_number,
            "address": member.address,
            "cell_id": member.cell_id,
            "department_id": member.department_id,
            "membership_status": member.membership_status,
            "profile_picture_url": member.profile_picture_url,
            "user_id": member.user_id,
            "department_name": member.department.name if member.department else None,
            "cell_name": member.cell.name if member.cell else None
        })
    
    return result

@router.post("", response_model=MemberResponse)
@router.post("/", response_model=MemberResponse)
async def create_member(
    member_data: MemberCreate,
    current_user: User = Depends(get_current_cell_leader),
    db: Session = Depends(get_db)
):
    """Create a new member (Cell Leaders and above)"""
    auth_service = AuthService(db)
    
    existing = db.query(User).filter(User.email == member_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = User(
        email=member_data.email,
        hashed_password=auth_service.get_password_hash(member_data.password),
        full_name=f"{member_data.first_name} {member_data.last_name}",
        role=UserRole.MEMBER,
        is_verified=False,
        is_active=True
    )
    db.add(user)
    db.flush()
    
    member = Member(
        user_id=user.id,
        first_name=member_data.first_name,
        last_name=member_data.last_name,
        email=member_data.email,
        phone_number=member_data.phone_number,
        address=member_data.address,
        cell_id=member_data.cell_id,
        department_id=member_data.department_id,
        is_first_timer=member_data.is_first_timer,
        registered_by_id=current_user.id,
        membership_status="active"
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    
    return member

@router.post("/create-user/{member_id}")
async def create_user_for_member(
    member_id: int,
    request: CreateUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a user account for an existing member"""
    if current_user.role not in ["super_admin", "pastor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins, pastors, and super admins can create user accounts"
        )
    
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if member.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This member already has a user account"
        )
    
    auth_service = AuthService(db)
    
    existing_user = db.query(User).filter(User.email == member.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email {member.email} is already registered to another user"
        )
    
    user = User(
        email=member.email,
        hashed_password=auth_service.get_password_hash(request.password),
        full_name=f"{member.first_name} {member.last_name}",
        role=UserRole.MEMBER,
        is_verified=True,
        is_active=True
    )
    db.add(user)
    db.flush()
    
    member.user_id = user.id
    db.commit()
    db.refresh(member)
    
    return {
        "message": f"User account created for {member.first_name} {member.last_name}",
        "user_id": user.id,
        "email": user.email
    }

@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific member by ID"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@router.put("/{member_id}")
async def update_member(
    member_id: int,
    member_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a member's information"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    if current_user.role not in ["super_admin", "pastor", "admin"]:
        if current_user.role == UserRole.CELL_LEADER:
            cell = db.query(Cell).filter(Cell.leader_id == current_user.id).first()
            if not cell or member.cell_id != cell.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update members in your cell"
                )
    
    for key, value in member_data.items():
        if hasattr(member, key) and key not in ["id", "user_id", "created_at"]:
            setattr(member, key, value)
    
    db.commit()
    db.refresh(member)
    return member

@router.delete("/{member_id}")
async def delete_member(
    member_id: int,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Delete a member (Admins only)"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    member.membership_status = "inactive"
    db.commit()
    return {"message": "Member deactivated successfully"}

@router.post("/upload-photo")
async def upload_photo(
    file: UploadFile = File(...),
    member_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """Upload a profile picture - Public endpoint for registration"""
    upload_dir = Path("uploads/profile_pictures")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    ext = file.filename.split('.')[-1] if file.filename else 'jpg'
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = upload_dir / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    if member_id:
        member = db.query(Member).filter(Member.id == member_id).first()
        if member:
            member.profile_picture_url = f"/uploads/profile_pictures/{filename}"
            db.commit()
            db.refresh(member)
            return {"url": member.profile_picture_url, "member_id": member.id}
    
    return {"url": f"/uploads/profile_pictures/{filename}"}

@router.post("/register")
async def register_member(
    member_data: dict,
    db: Session = Depends(get_db)
):
    """Register a new member WITHOUT login access"""
    from src.config.email import EmailService
    
    existing = db.query(Member).filter(Member.email == member_data.get('email')).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    def clean_date(value):
        if value and value.strip():
            try:
                return datetime.strptime(value, "%Y-%m-%d").date()
            except ValueError:
                return None
        return None
    
    def clean_value(value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        return value
    
    member = Member(
        first_name=clean_value(member_data.get('first_name')),
        last_name=clean_value(member_data.get('last_name')),
        email=clean_value(member_data.get('email')),
        phone_number=clean_value(member_data.get('phone_number')),
        address=clean_value(member_data.get('address')),
        date_of_birth=clean_date(member_data.get('date_of_birth')),
        emergency_contact_name=clean_value(member_data.get('emergency_contact_name')),
        emergency_contact_phone=clean_value(member_data.get('emergency_contact_phone')),
        cell_id=clean_value(member_data.get('cell_id')),
        department_id=clean_value(member_data.get('department_id')),
        is_first_timer=member_data.get('is_first_timer', False),
        membership_status="active",
        member_since=date.today()
    )
    
    db.add(member)
    db.commit()
    db.refresh(member)
    
    try:
        email_service = EmailService()
        email_service.send_email(
            to_email=member.email,
            subject="Welcome to Dominion City Gbagada!",
            html_content=f"""
            <h1>Welcome to Dominion City Gbagada!</h1>
            <p>Dear {member.first_name},</p>
            <p>We are thrilled to welcome you to our church family!</p>
            <p>You have been registered as a member.</p>
            <p>Service Times:</p>
            <ul>
                <li>Sunday: 9:00 AM & 11:00 AM</li>
                <li>Tuesday: 6:00 PM</li>
            </ul>
            <p>We look forward to seeing you!</p>
            <p>God bless you!</p>
            <p>Dominion City Gbagada Team</p>
            """
        )
    except Exception as e:
        print(f"Email error: {e}")
    
    return {
        "message": "Registration successful! Welcome to Dominion City Gbagada.",
        "member_id": member.id
    }