"""add speaker_name to services

Revision ID: add_service_speaker_name
Revises: add_announcement_target_user
Create Date: 2026-09-03
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_service_speaker_name'
down_revision = 'add_announcement_target_user'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('services', sa.Column('speaker_name', sa.String(length=200), nullable=True))


def downgrade():
    op.drop_column('services', 'speaker_name')
