'''from fastapi import HTTPException, status
from typing import List, Optional
from src.models.user import User

class Permissions:
    """Permission checking utility"""
    
    @staticmethod
    def check_role(user: User, allowed_roles: List[str]) -> bool:
        """Check if user has one of the allowed roles"""
        return user.role in allowed_roles
    
    @staticmethod
    def check_member_ownership(user: User, member_user_id: int) -> bool:
        """Check if user owns the member record or has admin access"""
        if user.role in ["super_admin", "pastor", "admin"]:
            return True
        return user.id == member_user_id
    
    @staticmethod
    def check_cell_leader(user: User, cell_leader_id: int) -> bool:
        """Check if user is the leader or assistant leader of a cell"""
        if user.role in ["super_admin", "pastor", "admin"]:
            return True
        return user.id == cell_leader_id
    
    @staticmethod
    def check_department_head(user: User, department_head_id: int) -> bool:
        """Check if user is the head or assistant head of a department"""
        if user.role in ["super_admin", "pastor", "admin"]:
            return True
        return user.id == department_head_id
    
    @staticmethod
    def can_manage_finance(user: User) -> bool:
        """Check if user can manage finances"""
        return user.role in ["admin", "super_admin"]
    
    @staticmethod
    def can_approve_expenses(user: User) -> bool:
        """Check if user can approve expenses"""
        return user.role in ["pastor", "super_admin"]
    
    @staticmethod
    def can_manage_equipment(user: User) -> bool:
        """Check if user can manage equipment"""
        return user.role in ["admin", "super_admin"]

def require_role(allowed_roles: List[str]):
    """Decorator to require specific roles"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            if not Permissions.check_role(current_user, allowed_roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role required: {', '.join(allowed_roles)}"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator
'''
from fastapi import HTTPException, status
from typing import List, Optional
from src.models.user import User

class Permissions:
    """Permission checking utility"""
    
    @staticmethod
    def check_role(user: User, allowed_roles: List[str]) -> bool:
        """Check if user has one of the allowed roles"""
        return user.role in allowed_roles
    
    @staticmethod
    def check_member_ownership(user: User, member_user_id: int) -> bool:
        """Check if user owns the member record or has admin access"""
        if user.role in ["super_admin", "overall_pastor", "pastor", "admin"]:
            return True
        return user.id == member_user_id
    
    @staticmethod
    def check_cell_leader(user: User, cell_leader_id: int) -> bool:
        """Check if user is the leader or assistant leader of a cell"""
        if user.role in ["super_admin", "overall_pastor", "pastor", "admin"]:
            return True
        return user.id == cell_leader_id
    
    @staticmethod
    def check_department_head(user: User, department_head_id: int) -> bool:
        """Check if user is the head or assistant head of a department"""
        if user.role in ["super_admin", "overall_pastor", "pastor", "admin"]:
            return True
        return user.id == department_head_id
    
    @staticmethod
    def can_manage_finance(user: User) -> bool:
        """Check if user can manage finances"""
        return user.role in ["admin", "overall_pastor", "super_admin"]
    
    @staticmethod
    def can_approve_expenses(user: User) -> bool:
        """Check if user can approve expenses"""
        return user.role in ["pastor", "overall_pastor", "super_admin"]
    
    @staticmethod
    def can_manage_equipment(user: User) -> bool:
        """Check if user can manage equipment"""
        return user.role in ["admin", "overall_pastor", "super_admin"]

def require_role(allowed_roles: List[str]):
    """Decorator to require specific roles"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            if not Permissions.check_role(current_user, allowed_roles):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role required: {', '.join(allowed_roles)}"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator