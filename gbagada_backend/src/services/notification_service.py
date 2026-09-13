from typing import List, Optional
from sqlalchemy.orm import Session
from src.config.email import EmailService
from src.config.whatsapp import WhatsAppService
from src.models.user import User
from src.models.notification import Notification
from src.config.celery import celery_app
from src.config.database import SessionLocal
import os

class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()
        self.whatsapp_service = WhatsAppService()
    
    def create_notification(self, user_id: int, title: str, content: str, type: str = "info", link: str = None):
        """Create a notification for a user"""
        notification = Notification(
            user_id=user_id,
            title=title,
            content=content,
            type=type,
            link=link
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification
    
    def get_user_notifications(self, user_id: int, limit: int = 50):
        """Get notifications for a user"""
        return self.db.query(Notification).filter(
            Notification.user_id == user_id
        ).order_by(Notification.created_at.desc()).limit(limit).all()
    
    def mark_as_read(self, notification_id: int):
        """Mark a notification as read"""
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id
        ).first()
        if notification:
            notification.is_read = True
            notification.read_at = func.now()
            self.db.commit()
            return True
        return False
    
    def mark_all_as_read(self, user_id: int):
        """Mark all notifications as read for a user"""
        self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({"is_read": True, "read_at": func.now()})
        self.db.commit()
    
    @celery_app.task
    def send_notification_to_workers(self, title: str, content: str, sender_id: int):
        """Send notification to all workers via email and WhatsApp"""
        db = SessionLocal()
        try:
            workers = db.query(User).filter(
                User.role.in_(['cell_leader', 'department_head', 'pastor', 'admin', 'super_admin'])
            ).all()
            
            for worker in workers:
                # Create in-app notification
                NotificationService(db).create_notification(
                    user_id=worker.id,
                    title=title,
                    content=content,
                    type="memo"
                )
                
                # Send email if opted in
                if worker.email_opt_in:
                    self.email_service.send_email(
                        worker.email,
                        f"Dominion City Memo: {title}",
                        f"<h1>{title}</h1><p>{content}</p>"
                    )
                
                # Send WhatsApp if opted in
                if worker.whatsapp_opt_in and worker.member:
                    from src.utils.whatsapp_templates import WhatsAppTemplates
                    self.whatsapp_service.send_whatsapp(
                        worker.member.phone_number,
                        WhatsAppTemplates.memo_alert(title, content, str(sender_id))
                    )
        finally:
            db.close()
    
    @celery_app.task
    def send_finance_approval_request(self, admin_id: int, pastor_id: int, amount: float, description: str):
        """Send finance approval request to pastor"""
        db = SessionLocal()
        try:
            pastor = db.query(User).filter(User.id == pastor_id).first()
            if pastor:
                # Create in-app notification
                NotificationService(db).create_notification(
                    user_id=pastor_id,
                    title="Finance Approval Request",
                    content=f"An expense of ₦{amount:,.2f} needs your approval: {description}",
                    type="warning",
                    link="/finance/approvals"
                )
                
                # Send WhatsApp if opted in
                if pastor.whatsapp_opt_in and pastor.member:
                    from src.utils.whatsapp_templates import WhatsAppTemplates
                    admin = db.query(User).filter(User.id == admin_id).first()
                    admin_name = admin.full_name if admin else "An admin"
                    self.whatsapp_service.send_whatsapp(
                        pastor.member.phone_number,
                        WhatsAppTemplates.finance_approval_request(admin_name, amount, description)
                    )
        finally:
            db.close()
    
    @celery_app.task
    def send_service_reminder(self, service_name: str, service_time: str):
        """Send service reminder to all members"""
        db = SessionLocal()
        try:
            members = db.query(User).filter(User.email_opt_in == True).all()
            for member in members:
                self.email_service.send_email(
                    member.email,
                    f"Reminder: {service_name}",
                    f"<h1>Service Reminder</h1><p>{service_name} is at {service_time}</p><p>We look forward to seeing you!</p>"
                )
        finally:
            db.close()

    @celery_app.task
    def send_announcement_email(self, title: str, content: str, recipient_emails: List[str]):
        """Email an announcement to everyone who can actually see it (per
        the same visibility rules as the app itself) and has opted into
        email. Chosen over WhatsApp specifically because Meta's
        per-message fees don't fit this org's budget, while email is
        genuinely free at this scale via SendGrid's free tier."""
        for email in recipient_emails:
            self.email_service.send_email(
                email,
                f"Dominion City Announcement: {title}",
                f"<h1>{title}</h1><p>{content}</p><p style='color:#888;font-size:12px;'>You're receiving this because you're part of Dominion City Gbagada. Manage your email preferences in Settings.</p>"
            )