import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

class WhatsAppService:
    def __init__(self):
        # Never configured for this deployment — WhatsApp was
        # deliberately not pursued this session due to cost. This must
        # degrade gracefully rather than raise, since AuthService
        # constructs this unconditionally on every login, and an
        # unhandled Twilio error here was taking down every single
        # login attempt in production.
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_WHATSAPP_NUMBER")

        if not account_sid or not auth_token:
            print("⚠️ Twilio credentials not configured — WhatsApp features disabled.")
            self.client = None
        else:
            try:
                self.client = Client(account_sid, auth_token)
            except Exception as e:
                print(f"❌ Error initializing Twilio client: {e}")
                self.client = None

    def send_whatsapp(self, to_number, message):
        if not self.client:
            return False
        try:
            sent_message = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=f"whatsapp:{to_number}"
            )
            return sent_message.sid is not None
        except Exception as e:
            print(f"WhatsApp error: {e}")
            return False

    def send_registration_confirmation(self, to_number, name):
        message = f"""
        🎉 Welcome to Dominion City Gbagada, {name}!

        Your registration has been received. You can now log in to the church platform to access member resources.

        If you need any assistance, reply to this message.

        May God bless you richly! 🙏
        """
        return self.send_whatsapp(to_number, message)

    def send_memo_to_workers(self, to_number, title, content):
        message = f"""
        📨 MEMO from Dominion City Gbagada

        Title: {title}

        {content}

        Please check the platform for full details.
        """
        return self.send_whatsapp(to_number, message)

    def send_finance_approval_request(self, to_number, admin_name, amount, description):
        message = f"""
        💰 APPROVAL REQUESTED

        {admin_name} has submitted an expense request:
        Amount: ₦{amount:,}
        Description: {description}

        Please log in to approve or reject this request.
        """
        return self.send_whatsapp(to_number, message)