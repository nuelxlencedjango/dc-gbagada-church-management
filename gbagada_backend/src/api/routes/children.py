from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date as date_type

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User, UserRole
from src.models.department import Department
from src.models.children import ChildrenClass, Child, ChildAttendance, ClassLesson
from src.models.finance import Finance, TransactionType, TransactionStatus

router = APIRouter()

MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.OVERALL_PASTOR, UserRole.PASTOR, UserRole.ADMIN]

def _can_manage(current_user: User, db: Session, class_obj: Optional[ChildrenClass] = None, department_id: Optional[int] = None) -> bool:
    """Two ways to reach this: with an existing class_obj (edit/delete/
    attendance — check the department it's already linked to), or with a
    raw department_id (create — the class doesn't exist yet, so there's
    nothing to look up through). Without this second path, creation could
    only ever succeed for admin-tier roles, which is exactly the bug that
    let a real HOD get blocked from creating their own department's
    first class."""
    if current_user.role in MANAGE_ROLES:
        return True
    check_dept_id = department_id if department_id is not None else (class_obj.department_id if class_obj else None)
    if check_dept_id:
        dept = db.query(Department).filter(Department.id == check_dept_id).first()
        if dept and (dept.head_id == current_user.id or dept.assistant_head_id == current_user.id):
            return True
    return False

def _require_manage(current_user: User, db: Session, class_obj: Optional[ChildrenClass] = None, department_id: Optional[int] = None):
    if not _can_manage(current_user, db, class_obj, department_id):
        raise HTTPException(status_code=403, detail="Not authorized to manage the Children's Department")

def _is_children_ministry_manager(current_user: User, db: Session) -> bool:
    """For actions not tied to a specific class (like recording an
    offering for the whole session) — admin-tier always can; otherwise,
    only someone who heads a department named 'Children Ministry'."""
    if current_user.role in MANAGE_ROLES:
        return True
    dept = db.query(Department).filter(Department.name.ilike('%children%')).first()
    if dept and (dept.head_id == current_user.id or dept.assistant_head_id == current_user.id):
        return True
    return False

class OfferingRecord(BaseModel):
    date: str
    class_id: Optional[int] = None
    amount: float
    notes: Optional[str] = None

class LessonCreate(BaseModel):
    date: str
    title: str
    notes: Optional[str] = None

class ClassCreate(BaseModel):
    name: str
    age_range: Optional[str] = None
    description: Optional[str] = None
    department_id: Optional[int] = None
    teacher_id: Optional[int] = None
    assistant_teacher_id: Optional[int] = None

class ChildCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    class_id: Optional[int] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    parent_email: Optional[str] = None
    notes: Optional[str] = None

class AttendanceRecord(BaseModel):
    child_id: int
    present: bool = True

class AttendanceSubmit(BaseModel):
    date: str
    records: List[AttendanceRecord]

def _serialize_class(c: ChildrenClass, db: Session) -> dict:
    child_count = db.query(Child).filter(Child.class_id == c.id, Child.is_active == True).count()
    return {
        "id": c.id,
        "name": c.name,
        "age_range": c.age_range,
        "description": c.description,
        "department_id": c.department_id,
        "department_name": c.department.name if c.department else None,
        "teacher_id": c.teacher_id,
        "teacher_name": c.teacher.full_name if c.teacher else None,
        "assistant_teacher_id": c.assistant_teacher_id,
        "assistant_teacher_name": c.assistant_teacher.full_name if c.assistant_teacher else None,
        "is_active": c.is_active,
        "child_count": child_count,
    }

def _serialize_child(c: Child) -> dict:
    return {
        "id": c.id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "date_of_birth": c.date_of_birth,
        "gender": c.gender,
        "class_id": c.class_id,
        "class_name": c.class_group.name if c.class_group else None,
        "parent_name": c.parent_name,
        "parent_phone": c.parent_phone,
        "parent_email": c.parent_email,
        "notes": c.notes,
        "is_active": c.is_active,
    }

@router.get("/classes")
async def get_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    classes = db.query(ChildrenClass).filter(ChildrenClass.is_active == True).all()
    return [_serialize_class(c, db) for c in classes]

@router.post("/classes")
async def create_class(
    data: ClassCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    _require_manage(current_user, db, department_id=data.department_id)
    class_obj = ChildrenClass(**data.dict(), is_active=True)
    db.add(class_obj)
    db.commit()
    db.refresh(class_obj)
    return _serialize_class(class_obj, db)

@router.put("/classes/{class_id}")
async def update_class(
    class_id: int,
    data: ClassCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    _require_manage(current_user, db, class_obj)

    for key, value in data.dict().items():
        setattr(class_obj, key, value)
    db.commit()
    db.refresh(class_obj)
    return _serialize_class(class_obj, db)

@router.delete("/classes/{class_id}")
async def delete_class(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    _require_manage(current_user, db, class_obj)
    class_obj.is_active = False
    db.commit()
    return {"message": "Class deactivated"}

@router.get("/classes/{class_id}/children")
async def get_children_in_class(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    children = db.query(Child).filter(
        Child.class_id == class_id,
        Child.is_active == True
    ).order_by(Child.first_name.asc()).all()
    return [_serialize_child(c) for c in children]

@router.post("/children")
async def create_child(
    data: ChildCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = None
    if data.class_id:
        class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == data.class_id).first()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
    _require_manage(current_user, db, class_obj)

    payload = data.dict()
    if payload.get('date_of_birth'):
        try:
            payload['date_of_birth'] = date_type.fromisoformat(payload['date_of_birth'])
        except ValueError:
            payload['date_of_birth'] = None
    else:
        payload['date_of_birth'] = None

    child = Child(**payload, is_active=True)
    db.add(child)
    db.commit()
    db.refresh(child)
    return _serialize_child(child)

@router.put("/children/{child_id}")
async def update_child(
    child_id: int,
    data: ChildCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == child.class_id).first() if child.class_id else None
    _require_manage(current_user, db, class_obj)

    payload = data.dict()
    if payload.get('date_of_birth'):
        try:
            payload['date_of_birth'] = date_type.fromisoformat(payload['date_of_birth'])
        except ValueError:
            payload['date_of_birth'] = None
    else:
        payload['date_of_birth'] = None

    for key, value in payload.items():
        setattr(child, key, value)
    db.commit()
    db.refresh(child)
    return _serialize_child(child)

@router.delete("/children/{child_id}")
async def delete_child(
    child_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    child = db.query(Child).filter(Child.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == child.class_id).first() if child.class_id else None
    _require_manage(current_user, db, class_obj)
    child.is_active = False
    db.commit()
    return {"message": "Child record deactivated"}

@router.get("/classes/{class_id}/attendance")
async def get_attendance_for_date(
    class_id: int,
    date: date_type,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    records = db.query(ChildAttendance).filter(
        ChildAttendance.class_id == class_id,
        ChildAttendance.date == date
    ).all()
    return {r.child_id: r.present for r in records}

@router.post("/classes/{class_id}/attendance")
async def submit_attendance(
    class_id: int,
    data: AttendanceSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    _require_manage(current_user, db, class_obj)

    try:
        attendance_date = date_type.fromisoformat(data.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    db.query(ChildAttendance).filter(
        ChildAttendance.class_id == class_id,
        ChildAttendance.date == attendance_date
    ).delete()

    for record in data.records:
        db.add(ChildAttendance(
            child_id=record.child_id,
            class_id=class_id,
            date=attendance_date,
            present=record.present,
            recorded_by_id=current_user.id
        ))

    db.commit()
    present_count = sum(1 for r in data.records if r.present)
    return {"message": "Attendance recorded", "present_count": present_count, "total": len(data.records)}

@router.get("/classes/{class_id}/attendance-history")
async def get_attendance_history(
    class_id: int,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    records = db.query(ChildAttendance).filter(
        ChildAttendance.class_id == class_id
    ).order_by(ChildAttendance.date.desc()).all()

    by_date = {}
    for r in records:
        if r.date not in by_date:
            by_date[r.date] = {"present": 0, "total": 0}
        by_date[r.date]["total"] += 1
        if r.present:
            by_date[r.date]["present"] += 1

    result = [
        {"date": d, "present": counts["present"], "total": counts["total"]}
        for d, counts in sorted(by_date.items(), key=lambda x: x[0], reverse=True)
    ]
    return result[:limit]

@router.post("/record-offering")
async def record_children_offering(
    data: OfferingRecord,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """A dedicated, department-level offering entry — not tied to a
    specific class, since an offering usually covers the whole children's
    service. Creates a real Finance transaction, same PENDING ->
    confirmed-by-a-different-admin flow every other offering already
    uses (matching the same pattern just added for Services)."""
    if not _is_children_ministry_manager(current_user, db):
        raise HTTPException(status_code=403, detail="Not authorized to record offerings for the Children's Department")

    try:
        offering_date = date_type.fromisoformat(data.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    class_name = None
    if data.class_id:
        class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == data.class_id).first()
        if class_obj:
            class_name = class_obj.name

    description = "Children's Department Offering"
    if class_name:
        description += f" — {class_name}"
    description += f" ({offering_date.strftime('%d %b %Y')})"
    if data.notes:
        description += f" — {data.notes}"

    finance_txn = Finance(
        transaction_type=TransactionType.OFFERING,
        amount=data.amount,
        description=description,
        date=offering_date,
        recorded_by_id=current_user.id,
        status=TransactionStatus.PENDING,
        service_type="Children's Department",
    )
    db.add(finance_txn)
    db.commit()
    db.refresh(finance_txn)

    return {"message": "Offering recorded successfully", "finance_transaction_id": finance_txn.id}

@router.get("/classes/{class_id}/lessons")
async def get_lessons(
    class_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    lessons = db.query(ClassLesson).filter(
        ClassLesson.class_id == class_id
    ).order_by(ClassLesson.date.desc()).all()

    return [
        {
            "id": l.id,
            "date": l.date,
            "title": l.title,
            "notes": l.notes,
            "taught_by_id": l.taught_by_id,
            "taught_by_name": l.taught_by.full_name if l.taught_by else None,
        }
        for l in lessons
    ]

@router.post("/classes/{class_id}/lessons")
async def create_lesson(
    class_id: int,
    data: LessonCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
    _require_manage(current_user, db, class_obj)

    try:
        lesson_date = date_type.fromisoformat(data.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    lesson = ClassLesson(
        class_id=class_id,
        date=lesson_date,
        title=data.title,
        notes=data.notes,
        taught_by_id=current_user.id
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    return {
        "id": lesson.id,
        "date": lesson.date,
        "title": lesson.title,
        "notes": lesson.notes,
        "taught_by_id": lesson.taught_by_id,
        "taught_by_name": current_user.full_name,
    }

@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    lesson = db.query(ClassLesson).filter(ClassLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson entry not found")

    class_obj = db.query(ChildrenClass).filter(ChildrenClass.id == lesson.class_id).first()
    _require_manage(current_user, db, class_obj)

    db.delete(lesson)
    db.commit()
    return {"message": "Lesson entry deleted"}