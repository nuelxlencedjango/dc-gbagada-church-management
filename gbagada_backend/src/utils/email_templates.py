from typing import Dict

class EmailTemplates:
    """Email template builder for the church"""
    
    @staticmethod
    def welcome_email(name: str, login_link: str) -> Dict[str, str]:
        """Welcome email template"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #1a237e; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .footer {{ background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; }}
                .button {{ background: #1a237e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to Dominion City Gbagada!</h1>
                </div>
                <div class="content">
                    <h2>Dear {name},</h2>
                    <p>We are thrilled to welcome you to the Dominion City Gbagada family!</p>
                    <p>Your account has been created successfully. To get started, please set up your password using the link below:</p>
                    <p style="text-align: center;">
                        <a href="{login_link}" class="button">Set Up Your Account</a>
                    </p>
                    <p>Once you set up your account, you'll be able to:</p>
                    <ul>
                        <li>View church announcements and events</li>
                        <li>Connect with your cell group</li>
                        <li>Access member resources</li>
                        <li>Receive important updates</li>
                    </ul>
                    <p>We look forward to growing with you in faith and fellowship!</p>
                    <p>God bless you,</p>
                    <p><strong>Dominion City Gbagada Team</strong></p>
                </div>
                <div class="footer">
                    <p>© 2026 Dominion City Gbagada. All rights reserved.</p>
                    <p>This email was sent to you as a member of Dominion City Gbagada.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text = f"""
        Welcome to Dominion City Gbagada!
        
        Dear {name},
        
        We are thrilled to welcome you to the Dominion City Gbagada family!
        
        Your account has been created successfully. To get started, please set up your password using the link below:
        
        {login_link}
        
        Once you set up your account, you'll be able to:
        - View church announcements and events
        - Connect with your cell group
        - Access member resources
        - Receive important updates
        
        We look forward to growing with you in faith and fellowship!
        
        God bless you,
        Dominion City Gbagada Team
        """
        
        return {"html": html, "text": text}
    
    @staticmethod
    def password_reset_email(name: str, reset_link: str) -> Dict[str, str]:
        """Password reset email template"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #1a237e; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .footer {{ background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; }}
                .button {{ background: #1a237e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }}
                .warning {{ background: #fff3cd; padding: 12px; border-radius: 4px; margin: 12px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Dear {name},</h2>
                    <p>We received a request to reset your password for your Dominion City Gbagada account.</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Your Password</a>
                    </p>
                    <div class="warning">
                        <p><strong>⚠️ Important:</strong> This link will expire in 15 minutes.</p>
                    </div>
                    <p>If you didn't request this password reset, please ignore this email or contact us immediately.</p>
                    <p>For security, please do not share this link with anyone.</p>
                    <p>God bless you,</p>
                    <p><strong>Dominion City Gbagada Team</strong></p>
                </div>
                <div class="footer">
                    <p>© 2026 Dominion City Gbagada. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text = f"""
        Password Reset Request
        
        Dear {name},
        
        We received a request to reset your password for your Dominion City Gbagada account.
        
        Click the link below to reset your password:
        {reset_link}
        
        ⚠️ Important: This link will expire in 15 minutes.
        
        If you didn't request this password reset, please ignore this email or contact us immediately.
        
        God bless you,
        Dominion City Gbagada Team
        """
        
        return {"html": html, "text": text}
    
    @staticmethod
    def contact_confirmation_email(name: str) -> Dict[str, str]:
        """Contact form confirmation template"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #1a237e; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; }}
                .footer {{ background: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Thank You for Contacting Us</h1>
                </div>
                <div class="content">
                    <h2>Dear {name},</h2>
                    <p>Thank you for reaching out to Dominion City Gbagada.</p>
                    <p>We have received your message and our team will get back to you within 24 hours.</p>
                    <p>In the meantime, please feel free to:</p>
                    <ul>
                        <li>Visit our website for more information</li>
                        <li>Join us for our services on Sunday or Tuesday</li>
                        <li>Follow us on social media for updates</li>
                    </ul>
                    <p>We look forward to connecting with you!</p>
                    <p>God bless you,</p>
                    <p><strong>Dominion City Gbagada Team</strong></p>
                </div>
                <div class="footer">
                    <p>© 2026 Dominion City Gbagada. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text = f"""
        Thank You for Contacting Us
        
        Dear {name},
        
        Thank you for reaching out to Dominion City Gbagada.
        
        We have received your message and our team will get back to you within 24 hours.
        
        In the meantime, please feel free to:
        - Visit our website for more information
        - Join us for our services on Sunday or Tuesday
        - Follow us on social media for updates
        
        We look forward to connecting with you!
        
        God bless you,
        Dominion City Gbagada Team
        """
        
        return {"html": html, "text": text}