from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from src.config.email import EmailService
import os

router = APIRouter()

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    message: str

@router.post("/")
async def send_contact_message(contact: ContactForm):
    """Send a contact message from the landing page"""
    try:
        email_service = EmailService()
        
        # Send confirmation to user
        email_service.send_email(
            to_email=contact.email,
            subject="Thank You for Contacting Dominion City Gbagada",
            html_content=f"""
            <h1>Thank You for Contacting Us!</h1>
            <p>Dear {contact.name},</p>
            <p>We have received your message and will get back to you within 24 hours.</p>
            <p>Your message: {contact.message}</p>
            <p>God bless you!</p>
            <p>Dominion City Gbagada</p>
            """
        )
        
        # Send notification to church admin
        email_service.send_email(
            to_email=os.getenv("CHURCH_EMAIL", "info@dominioncitygbagada.com"),
            subject=f"New Contact Message from {contact.name}",
            html_content=f"""
            <h1>New Contact Message</h1>
            <p><strong>Name:</strong> {contact.name}</p>
            <p><strong>Email:</strong> {contact.email}</p>
            <p><strong>Message:</strong> {contact.message}</p>
            """
        )
        
        return {"message": "Message sent successfully"}
    except Exception as e:
        print(f"Error sending contact: {e}")
        return {"message": "Message received, but email could not be sent"}
