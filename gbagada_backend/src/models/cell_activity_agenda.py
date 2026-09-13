from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.config.database import Base

class CellActivityAgendaItem(Base):
    """A single timed segment within a cell meeting report — e.g.
    'Praise and Worship, 6:01–6:08'. Several of these belong to one
    CellActivity (the weekly report)."""
    __tablename__ = "cell_activity_agenda_items"

    id = Column(Integer, primary_key=True, index=True)
    cell_activity_id = Column(Integer, ForeignKey("cell_activities.id"), nullable=False)
    cell_activity = relationship("CellActivity")

    segment_name = Column(String(200), nullable=False)
    start_time = Column(String(10), nullable=True)   # free-text, e.g. "6:01"
    end_time = Column(String(10), nullable=True)      # e.g. "6:08"
    sort_order = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())