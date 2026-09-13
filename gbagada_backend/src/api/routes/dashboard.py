from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from typing import List, Dict

from src.config.database import get_db
from src.api.middleware.auth import get_current_user
from src.models.user import User
from src.models.member import Member
from src.models.cell import Cell
from src.models.department import Department
from src.models.finance import Finance, TransactionType, TransactionStatus

router = APIRouter()

INCOME_TYPES = [
    TransactionType.OFFERING, TransactionType.TITHE,
    TransactionType.FIRST_FRUITS, TransactionType.GIFT,
    TransactionType.DONATION
]

def _pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0 if current == 0 else 100.0
    return round((current - previous) / previous * 100, 1)

def _month_bounds(dt: datetime):
    start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics, including real period-over-period deltas."""

    now = datetime.now(timezone.utc)
    this_month_start, this_month_end = _month_bounds(now)
    last_month_start, _ = _month_bounds(this_month_start - timedelta(days=1))

    # ---- Members ----
    total_members = db.query(Member).count()
    active_members = db.query(Member).filter(Member.membership_status == "active").count()

    members_30d_ago = db.query(Member).filter(
        Member.created_at <= now - timedelta(days=30)
    ).count()
    member_growth_percent = _pct_change(total_members, members_30d_ago)

    # ---- Cells ----
    total_cells = db.query(Cell).filter(Cell.is_active == True).count()
    quarter_start_month = ((now.month - 1) // 3) * 3 + 1
    quarter_start = now.replace(month=quarter_start_month, day=1, hour=0, minute=0, second=0, microsecond=0)
    cells_added_this_quarter = db.query(Cell).filter(Cell.created_at >= quarter_start).count()

    # ---- Departments ----
    total_departments = db.query(Department).filter(Department.is_active == True).count()

    # ---- Offerings (MTD vs last month) ----
    total_offerings = db.query(Finance).filter(
        Finance.transaction_type.in_(INCOME_TYPES),
        Finance.status == TransactionStatus.CONFIRMED
    ).with_entities(func.sum(Finance.amount)).scalar() or 0

    offerings_this_month = db.query(Finance).filter(
        Finance.transaction_type.in_(INCOME_TYPES),
        Finance.status == TransactionStatus.CONFIRMED,
        Finance.date >= this_month_start, Finance.date < this_month_end
    ).with_entities(func.sum(Finance.amount)).scalar() or 0

    offerings_last_month = db.query(Finance).filter(
        Finance.transaction_type.in_(INCOME_TYPES),
        Finance.status == TransactionStatus.CONFIRMED,
        Finance.date >= last_month_start, Finance.date < this_month_start
    ).with_entities(func.sum(Finance.amount)).scalar() or 0

    offerings_change_percent = _pct_change(float(offerings_this_month), float(offerings_last_month))

    # ---- Expenses (MTD vs last month) ----
    total_expenses = db.query(Finance).filter(
        Finance.transaction_type == TransactionType.EXPENSE,
        Finance.status == TransactionStatus.APPROVED
    ).with_entities(func.sum(Finance.amount)).scalar() or 0

    expenses_this_month = db.query(Finance).filter(
        Finance.transaction_type == TransactionType.EXPENSE,
        Finance.status == TransactionStatus.APPROVED,
        Finance.date >= this_month_start, Finance.date < this_month_end
    ).with_entities(func.sum(Finance.amount)).scalar() or 0

    expenses_last_month = db.query(Finance).filter(
        Finance.transaction_type == TransactionType.EXPENSE,
        Finance.status == TransactionStatus.APPROVED,
        Finance.date >= last_month_start, Finance.date < this_month_start
    ).with_entities(func.sum(Finance.amount)).scalar() or 0

    expenses_change_percent = _pct_change(float(expenses_this_month), float(expenses_last_month))

    # ---- Recent activity — merged from members + finance, real data only ----
    activities = []

    recent_members = db.query(Member).order_by(Member.created_at.desc()).limit(5).all()
    for m in recent_members:
        activities.append({
            "text": f"New member registered — {m.first_name} {m.last_name}",
            "timestamp": m.created_at
        })

    recent_finance = db.query(Finance).order_by(Finance.created_at.desc()).limit(5).all()
    for f in recent_finance:
        if f.transaction_type == TransactionType.EXPENSE:
            activities.append({
                "text": f"Expense request submitted — ₦{float(f.amount):,.2f}" + (f" ({f.description})" if f.description else ""),
                "timestamp": f.created_at
            })
        else:
            activities.append({
                "text": f"{f.transaction_type.value.replace('_', ' ').title()} recorded — ₦{float(f.amount):,.2f}",
                "timestamp": f.created_at
            })

    activities.sort(key=lambda a: a["timestamp"], reverse=True)
    recent_activities = activities[:8]

    return {
        "totalMembers": total_members,
        "activeMembers": active_members,
        "memberGrowthPercent": member_growth_percent,
        "totalCells": total_cells,
        "cellsAddedThisQuarter": cells_added_this_quarter,
        "totalDepartments": total_departments,
        "totalOfferings": float(total_offerings),
        "offeringsThisMonth": float(offerings_this_month),
        "offeringsChangePercent": offerings_change_percent,
        "totalExpenses": float(total_expenses),
        "expensesThisMonth": float(expenses_this_month),
        "expensesChangePercent": expenses_change_percent,
        "recentActivities": recent_activities
    }

@router.get("/member-growth")
async def get_member_growth(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cumulative total members by month, for every month from the
    earliest member record through the current month — not a fixed
    6-month window, and not monthly new-signups (this matches the
    'rising total' area chart on the dashboard, not a bar-per-month
    count)."""
    earliest = db.query(func.min(Member.created_at)).scalar()
    if not earliest:
        return []

    now = datetime.now(timezone.utc)
    cursor_start, _ = _month_bounds(earliest)
    months = []
    while cursor_start <= now:
        months.append(cursor_start)
        if cursor_start.month == 12:
            cursor_start = cursor_start.replace(year=cursor_start.year + 1, month=1)
        else:
            cursor_start = cursor_start.replace(month=cursor_start.month + 1)

    result = []
    for month_start in months:
        _, month_end = _month_bounds(month_start)
        cumulative_total = db.query(Member).filter(Member.created_at < month_end).count()
        result.append({
            "month": month_start.strftime("%b %Y"),
            "members": cumulative_total
        })

    return result

@router.get("/offering-trends")
async def get_offering_trends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Total confirmed income per month (all income types, matching
    /stats' totalOfferings), for every month from the earliest finance
    record through the current month."""
    earliest = db.query(func.min(Finance.date)).filter(
        Finance.transaction_type.in_(INCOME_TYPES)
    ).scalar()
    if not earliest:
        return []

    now = datetime.now(timezone.utc)
    cursor_start, _ = _month_bounds(earliest)
    months = []
    while cursor_start <= now:
        months.append(cursor_start)
        if cursor_start.month == 12:
            cursor_start = cursor_start.replace(year=cursor_start.year + 1, month=1)
        else:
            cursor_start = cursor_start.replace(month=cursor_start.month + 1)

    result = []
    for month_start in months:
        _, month_end = _month_bounds(month_start)
        total = db.query(Finance).filter(
            Finance.transaction_type.in_(INCOME_TYPES),
            Finance.status == TransactionStatus.CONFIRMED,
            Finance.date >= month_start, Finance.date < month_end
        ).with_entities(func.sum(Finance.amount)).scalar() or 0

        result.append({
            "month": month_start.strftime("%b %Y"),
            "offerings": float(total)
        })

    return result