from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
from pathlib import Path

load_dotenv()

# ========== IMPORT ALL ROUTERS ==========
from src.api.routes.auth import router as auth_router
from src.api.routes.members import router as members_router
from src.api.routes.cells import router as cells_router
from src.api.routes.departments import router as departments_router
from src.api.routes.finance import router as finance_router
from src.api.routes.equipment import router as equipment_router
from src.api.routes.services import router as services_router
from src.api.routes.announcements import router as announcements_router
from src.api.routes.ai import router as ai_router
from src.api.routes.contact import router as contact_router
from src.api.routes.users import router as users_router
from src.api.routes.dashboard import router as dashboard_router
from src.api.routes.health import router as health_router
from src.api.routes.hod import router as hod_router
from src.api.routes.public import router as public_router

# ----- New routers -----
from src.api.routes.satellites import router as satellites_router
from src.api.routes.pastors import router as pastors_router
from src.api.routes.events import router as events_router
from src.api.routes.budget import router as budget_router
from src.api.routes.reports import router as reports_router
from src.api.routes.requests import router as requests_router
from src.api.routes.operations import router as operations_router
from src.api.routes.trainings import router as trainings_router
from src.api.routes.mvps import router as mvps_router
from src.api.routes.department_head import router as department_head_router
from src.api.routes.cell_leader import router as cell_leader_router
from src.api.routes.help_requests import router as help_requests_router
from src.api.routes.admin_reports import router as admin_reports_router
from src.api.routes.pastor_portal import router as pastor_portal_router

# ========== MODELS (for Alembic / metadata) ==========
from src.models.satellite import SatelliteChurch
from src.models.pastor import Pastor
from src.models.church_event import ChurchEvent
from src.models.budget import Budget  # ensure budget model is imported
from src.models.finance import Finance
from src.models.operation import Operation
from src.models.training import TrainingSession, TrainingRegistration
from src.models.mvp import MVP
from src.models.help_request import HelpRequest
from src.models.department_program import DepartmentProgram, DepartmentContribution
from src.models.member_follow_up import MemberFollowUp
from src.models.pastor_report import PastorReport, PastorProgram, PastorContribution
from src.models.cell_activity_agenda import CellActivityAgendaItem
from src.api.routes.children import router as children_router
from src.api.routes.children import router as children_router


# ========== DATABASE SETUP ==========
from src.config.database import engine, Base

# Create uploads directory
uploads_dir = Path("uploads/profile_pictures")
uploads_dir.mkdir(parents=True, exist_ok=True)

# Create database tables (if they don't exist)
Base.metadata.create_all(bind=engine)

# ========== CREATE FASTAPI APP ==========
app = FastAPI(
    title="Dominion City Gbagada Church Management API",
    description="A comprehensive church management system",
    version="1.0.0",
    redirect_slashes=False
)

# ========== CORS ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== INCLUDE ROUTERS ==========
app.include_router(health_router, prefix="/api/health", tags=["Health"])
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(members_router, prefix="/api/members", tags=["Members"])
app.include_router(cells_router, prefix="/api/cells", tags=["Cells"])
app.include_router(departments_router, prefix="/api/departments", tags=["Departments"])
app.include_router(finance_router, prefix="/api/finance", tags=["Finance"])
app.include_router(equipment_router, prefix="/api/equipment", tags=["Equipment"])
app.include_router(services_router, prefix="/api/services", tags=["Services"])
app.include_router(announcements_router, prefix="/api/announcements", tags=["Announcements"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Assistant"])
app.include_router(contact_router, prefix="/api/contact", tags=["Contact"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(hod_router, prefix="/api/hod", tags=["HOD Management"])
app.include_router(public_router, prefix="/api/public", tags=["Public"])

app.include_router(satellites_router, prefix="/api/satellites", tags=["Satellites"])
app.include_router(pastors_router, prefix="/api/pastors", tags=["Pastors"])
app.include_router(events_router, prefix="/api/events", tags=["Events"])

# ----- NEW ROUTERS -----
app.include_router(budget_router, prefix="/api/budget", tags=["Budget"])
app.include_router(reports_router, prefix="/api/reports", tags=["Reports"])
app.include_router(requests_router, prefix="/api/requests", tags=["Requests"])
app.include_router(operations_router, prefix="/api/operations", tags=["Operations"])
app.include_router(trainings_router, prefix="/api/trainings", tags=["Training"])
app.include_router(mvps_router, prefix="/api/mvps", tags=["MVPs"])
app.include_router(department_head_router, prefix="/api/department-head", tags=["Department Head Portal"])
app.include_router(cell_leader_router, prefix="/api/cell-leader", tags=["Cell Leader Portal"])
app.include_router(help_requests_router, prefix="/api/help-requests", tags=["Help Requests"])
app.include_router(admin_reports_router, prefix="/api/admin-reports", tags=["Admin Reports"])
app.include_router(pastor_portal_router, prefix="/api/pastor-portal", tags=["Pastor Portal"])
app.include_router(children_router, prefix="/api/children", tags=["children"])
app.include_router(children_router, prefix="/api/children", tags=["Children's Department"])
# ========== STATIC FILES ==========
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ========== ROOT ENDPOINTS ==========
@app.get("/")
async def root():
    return {"message": "Dominion City Gbagada Church Management API", "status": "running"}

@app.get("/api")
async def api_root():
    return {
        "message": "API is running!",
        "endpoints": [
            "/api/auth/login",
            "/api/auth/register",
            "/api/users/me",
            "/api/members",
            "/api/cells",
            "/api/departments",
            "/api/finance",
            "/api/announcements",
            "/api/ai",
            "/api/dashboard",
            "/api/satellites",
            "/api/pastors",
            "/api/events",
            "/api/budget",
            "/api/reports",
            "/api/requests",
            "/api/operations",
            "/api/trainings",
            "/api/mvps",
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)