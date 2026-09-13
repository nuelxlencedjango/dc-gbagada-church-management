"""add attendance status to training_registrations

Revision ID: add_training_attendance
Revises: rebuild_training_add_mvps
Create Date: 2026-08-05
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_training_attendance'
down_revision = 'rebuild_training_add_mvps'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'training_registrations',
        sa.Column('status', sa.String(length=20), server_default='registered', nullable=True)
    )


def downgrade():
    op.drop_column('training_registrations', 'status')