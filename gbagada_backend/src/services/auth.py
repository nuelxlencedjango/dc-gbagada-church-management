from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import os

from src.models.user import User, UserRole
from src.config.email import EmailService

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        try:
            if not hashed_password or not hashed_password.startswith('$2'):
                return False
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            print(f"Password verification error: {e}")
            return False

    def get_password_hash(self, password: str) -> str:
        if len(password) > 72:
            password = password[:72]
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=30))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, os.getenv("SECRET_KEY"), algorithm=os.getenv("ALGORITHM"))

    def authenticate_user(self, email: str, password: str):
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User not found: {email}")
            return False
        if not user.is_active:
            print(f"❌ User inactive: {email}")
            return False
        if not self.verify_password(password, user.hashed_password):
            print(f"❌ Password incorrect for: {email}")
            return False
        print(f"✅ User authenticated: {email}")
        return user

    def register_member(self, member_data, registered_by_id=None):
        from src.models.member import Member

        existing_user = self.db.query(User).filter(User.email == member_data.email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        user = User(
            email=member_data.email,
            hashed_password=self.get_password_hash(member_data.password),
            full_name=f"{member_data.first_name} {member_data.last_name}",
            role=UserRole.MEMBER,
            is_verified=False
        )
        self.db.add(user)
        self.db.flush()

        member = Member(
            user_id=user.id,
            first_name=member_data.first_name,
            last_name=member_data.last_name,
            email=member_data.email,
            phone_number=member_data.phone_number,
            address=member_data.address,
            date_of_birth=member_data.date_of_birth,
            is_first_timer=member_data.is_first_timer,
            registered_by_id=registered_by_id,
            membership_status="pending"
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)

        login_link = f"https://app.dominioncitygbagada.com/setup/{user.id}"
        self.email_service.send_welcome_email(user.email, user.full_name, login_link)

        return member

    def get_current_user(self, token: str):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=[os.getenv("ALGORITHM")])
            user_id = payload.get("sub")
            if user_id is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        user = self.db.query(User).filter(User.id == int(user_id)).first()
        if user is None:
            raise credentials_exception
        return user

    def check_permissions(self, user: User, required_role: UserRole):
        role_hierarchy = {
            UserRole.SUPER_ADMIN: 6, UserRole.PASTOR: 5, UserRole.ADMIN: 4,
            UserRole.DEPARTMENT_HEAD: 3, UserRole.CELL_LEADER: 2, UserRole.MEMBER: 1
        }
        if role_hierarchy.get(user.role, 0) < role_hierarchy.get(required_role, 0):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return True
