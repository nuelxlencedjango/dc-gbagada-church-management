from datetime import date
from src.config.celery import celery_app
from src.config.database import SessionLocal
from src.config.email import EmailService
from src.models.member import Member
from src.models.user import User

MANAGE_ROLES = ['super_admin', 'overall_pastor', 'pastor', 'admin']

@celery_app.task
def send_daily_birthday_notifications():
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


@celery_app.task
def scrape_hq_website_daily():
    from src.services.rag_service import RAGService
    print("🌐 Running scheduled daily HQ website scrape...")
    rag_service = RAGService()
    success = rag_service.scrape_church_hq()
    if success:
        print("✅ Scheduled HQ scrape completed successfully")
    else:
        print("⚠️ Scheduled HQ scrape did not complete successfully")
