import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

class EmailService:
    def __init__(self):
        self.from_email = os.getenv("FROM_EMAIL")

    def send_email(self, to_email, subject, html_content, plain_text=None):
        try:
            params = {
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            if plain_text:
                params["text"] = plain_text
            resend.Emails.send(params)
            return True
        except Exception as e:
            print(f"Email error: {e}")
            return False

    def send_welcome_email(self, to_email, name, login_link):
        html = f"""
        <h1>Welcome to Dominion City Gbagada!</h1>
        <p>Dear {name},</p>
        <p>We are thrilled to have you as a member of our church family.</p>
        <p>Please click the link below to set up your account:</p>
        <a href="{login_link}">Set Up Account</a>
        <p>May God bless you abundantly!</p>
        <p>Dominion City Gbagada</p>
        """
        return self.send_email(to_email, "Welcome to Dominion City Gbagada", html)

    def send_password_reset(self, to_email, name, reset_link):
        html = f"""
        <h1>Password Reset Request</h1>
        <p>Dear {name},</p>
        <p>We received a request to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <a href="{reset_link}">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Dominion City Gbagada</p>
        """
        return self.send_email(to_email, "Password Reset - Dominion City Gbagada", html)

    def send_contact_confirmation(self, to_email, name):
        html = f"""
        <h1>We Received Your Message</h1>
        <p>Dear {name},</p>
        <p>Thank you for contacting Dominion City Gbagada.</p>
        <p>Our team will get back to you within 24 hours.</p>
        <p>God bless you!</p>
        <p>Dominion City Gbagada</p>
        """
        return self.send_email(to_email, "Thank You for Contacting Us", html)
