from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv
import os

load_dotenv()

celery_app = Celery(
    "dominion_church",
    broker=os.getenv("REDIS_URL"),
    backend=os.getenv("REDIS_URL")
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Africa/Lagos",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
)

celery_app.conf.beat_schedule = {
    "daily-birthday-notifications": {
        "task": "src.services.scheduled_tasks.send_daily_birthday_notifications",
        "schedule": crontab(hour=7, minute=0),
    },
}

celery_app.autodiscover_tasks(["src.services"])

from src.services import notification_service  # noqa: F401,E402
from src.services import scheduled_tasks  # noqa: F401,E402
