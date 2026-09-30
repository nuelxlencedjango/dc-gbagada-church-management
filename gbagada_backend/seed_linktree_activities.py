"""
One-time script to seed the 7 activities from the church's Linktree page
into the new recurring_activities table. Safe to run more than once —
it checks for an existing activity with the same title before inserting,
so re-running just skips ones already there instead of duplicating them.

Usage (from gbagada_backend, with your venv active):
    python seed_linktree_activities.py
"""
import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from src.config.database import SessionLocal
from src.models.recurring_activity import RecurringActivity

ACTIVITIES = [
    {
        "title": "Online Prayer Meeting",
        "frequency_label": "Every Friday",
        "time_label": "10:00pm - 11:00pm",
        "is_virtual": True,
        "link": None,
        "display_order": 1,
    },
    {
        "title": "New Eve Weekly Prayer",
        "frequency_label": "Every Thursday",
        "time_label": "9:00pm - 10:30pm",
        "is_virtual": True,
        "link": None,
        "display_order": 2,
    },
    {
        "title": "Physical Prayer Meeting",
        "frequency_label": "Last Friday of the month",
        "time_label": None,
        "is_virtual": False,
        "location": "18 Ibrahim Onashokun St, Gbagada, Lagos",
        "display_order": 3,
    },
    {
        "title": "Evening Oblation",
        "frequency_label": "Last Saturday of the month",
        "time_label": None,
        "is_virtual": False,
        "location": "18 Ibrahim Onashokun St, Gbagada, Lagos",
        "display_order": 4,
    },
    {
        "title": "Pray with Pastor Roberts",
        "frequency_label": "Last Wednesday to Saturday of the month",
        "time_label": None,
        "is_virtual": True,
        "link": None,
        "display_order": 5,
    },
    {
        "title": "Monthly Communion Service",
        "frequency_label": "1st Tuesday of the month",
        "time_label": "6:00pm",
        "is_virtual": False,
        "location": "18 Ibrahim Onashokun St, Gbagada, Lagos",
        "display_order": 6,
    },
    {
        "title": "Commanding Your Week",
        "frequency_label": "Regular",
        "time_label": None,
        "is_virtual": True,
        "link": None,
        "display_order": 7,
    },
]


def main():
    db = SessionLocal()
    try:
        added = 0
        skipped = 0
        for data in ACTIVITIES:
            existing = db.query(RecurringActivity).filter(
                RecurringActivity.title == data["title"]
            ).first()
            if existing:
                skipped += 1
                continue
            db.add(RecurringActivity(**data))
            added += 1
        db.commit()
        print(f"Done — added {added} new activities, skipped {skipped} already present.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
