from datetime import date
from src.config.celery import celery_app
from src.config.database import SessionLocal
from src.config.email import EmailService
from src.models.member import Member
from src.models.user import User

MANAGE_ROLES = ['super_admin', 'overall_pastor', 'pastor', 'admin']

@celery_app.task
def send_daily_birthday_notifications():
    """Runs once a day (see beat_schedule in celery.py) — emails a
    greeting directly to anyone whose birthday is today, and separately
    sends admin-tier staff a digest so they can also reach out
    personally. Matched by month/day only, same as the on-demand
    /members/birthdays/upcoming endpoint — the stored birth year is
    irrelevant here."""
    db = SessionLocal()
    email_service = EmailService()
    try:
        today = date.today()
        members = db.query(Member).filter(
            Member.date_of_birth.isnot(None),
            Member.membership_status == "active"
        ).all()

        todays_birthdays = [
            m for m in members
            if m.date_of_birth.month == today.month and m.date_of_birth.day == today.day
        ]

        if not todays_birthdays:
            return

        # 1. Greet each birthday person directly
        for m in todays_birthdays:
            if m.email:
                email_service.send_email(
                    m.email,
                    "Happy Birthday from Dominion City Gbagada! 🎉",
                    f"""
                    <h1>Happy Birthday, {m.first_name}!</h1>
                    <p>The whole Dominion City Gbagada family celebrates you today.</p>
                    <p>May this new year of your life be filled with God's blessings, favor, and joy.</p>
                    <p>With love,<br/>Dominion City Gbagada</p>
                    """
                )

        # 2. Notify staff with a digest so they can reach out personally
        names = ", ".join(f"{m.first_name} {m.last_name}" for m in todays_birthdays)
        staff = db.query(User).filter(
            User.role.in_(MANAGE_ROLES),
            User.is_active == True,
            User.email_opt_in == True
        ).all()
        for staff_member in staff:
            email_service.send_email(
                staff_member.email,
                f"Today's Birthdays — {today.strftime('%B %d')}",
                f"<h2>Birthdays Today</h2><p>{names}</p><p>Consider reaching out personally!</p>"
            )
    finally:
        db.close()
