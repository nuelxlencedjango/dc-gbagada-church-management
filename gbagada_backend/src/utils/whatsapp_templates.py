import os
from dotenv import load_dotenv

load_dotenv()

class WhatsAppTemplates:
    """WhatsApp message templates for the church"""
    
    CHURCH_PHONE = os.getenv("CHURCH_PHONE", "+234-XXX-XXX-XXXX")
    CHURCH_EMAIL = os.getenv("CHURCH_EMAIL", "info@dominioncitygbagada.com")
    
    @staticmethod
    def welcome_message(name: str) -> str:
        """Welcome message for new members"""
        return f"""
🎉 Welcome to Dominion City Gbagada, {name}!

We are so excited to have you as part of our church family! 🙏

Here's what you can expect:
• Sunday Services: 9 AM & 11 AM
• Tuesday Prayer: 6 PM
• Cell Meetings: Various locations

You can always reach us at:
📞 {WhatsAppTemplates.CHURCH_PHONE}
📧 {WhatsAppTemplates.CHURCH_EMAIL}

May God bless and keep you always! 🌟

Dominion City Gbagada Team
"""
    
    @staticmethod
    def service_reminder(service_name: str, time: str, location: str) -> str:
        """Service reminder message"""
        return f"""
⏰ REMINDER: {service_name}

Join us today at {time} at {location}.

Come with an expectant heart! 🙌

See you there!
Dominion City Gbagada
"""
    
    @staticmethod
    def memo_alert(title: str, content: str, sender: str) -> str:
        """Memo alert for workers"""
        return f"""
📨 MEMO from Dominion City Gbagada

From: {sender}
Title: {title}

{content}

Please log in to the church platform for full details.
"""
    
    @staticmethod
    def finance_approval_request(admin_name: str, amount: float, description: str) -> str:
        """Finance approval request for pastors"""
        return f"""
💰 APPROVAL REQUESTED

{admin_name} has submitted an expense request:

Amount: ₦{amount:,.2f}
Description: {description}

Please log in to the church platform to approve or reject this request.
"""
    
    @staticmethod
    def activity_report_reminder(group_type: str, group_name: str) -> str:
        """Activity report reminder for leaders"""
        return f"""
📝 WEEKLY REPORT REMINDER

This is a reminder to submit your {group_type} report for {group_name}.

Please log in to the church platform and submit your report before the deadline.

Thank you for your service! 🙏

Dominion City Gbagada
"""