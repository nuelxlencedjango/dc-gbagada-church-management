from .auth import router as auth_router
from .members import router as members_router
from .cells import router as cells_router
from .departments import router as departments_router
from .finance import router as finance_router
from .equipment import router as equipment_router
from .services import router as services_router
from .announcements import router as announcements_router
from .ai import router as ai_router

__all__ = [
    'auth_router',
    'members_router',
    'cells_router',
    'departments_router',
    'finance_router',
    'equipment_router',
    'services_router',
    'announcements_router',
    'ai_router'
]