import re
from typing import Optional, Tuple
from datetime import datetime

class Validators:
    """Data validation utilities"""
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email address"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Validate phone number (Nigerian format)"""
        # Remove spaces, dashes, and plus signs
        cleaned = re.sub(r'[\s\-+]', '', phone)
        
        # Check if it's a valid Nigerian phone number
        pattern = r'^(234|0)[789][01]\d{8}$'
        return bool(re.match(pattern, cleaned))
    
    @staticmethod
    def validate_password(password: str) -> Tuple[bool, Optional[str]]:
        """Validate password strength"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        if not re.search(r'\d', password):
            return False, "Password must contain at least one number"
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            return False, "Password must contain at least one special character"
        return True, None
    
    @staticmethod
    def validate_date(date_str: str) -> bool:
        """Validate date string (YYYY-MM-DD)"""
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
            return True
        except ValueError:
            return False
    
    @staticmethod
    def validate_amount(amount: float) -> bool:
        """Validate monetary amount"""
        return amount > 0
    
    @staticmethod
    def sanitize_string(text: str) -> str:
        """Sanitize input string"""
        # Remove any HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Remove any extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    @staticmethod
    def validate_member_data(data: dict) -> Tuple[bool, list]:
        """Validate member registration data"""
        errors = []
        
        required_fields = ['first_name', 'last_name', 'email', 'phone_number']
        for field in required_fields:
            if not data.get(field):
                errors.append(f"{field} is required")
        
        if data.get('email') and not Validators.validate_email(data['email']):
            errors.append("Invalid email format")
        
        if data.get('phone_number') and not Validators.validate_phone(data['phone_number']):
            errors.append("Invalid phone number format")
        
        if data.get('password') and not data['password']:
            errors.append("Password is required")
        elif data.get('password'):
            is_valid, msg = Validators.validate_password(data['password'])
            if not is_valid:
                errors.append(msg)
        
        return len(errors) == 0, errors