"""add target_user_id to announcements

Revision ID: add_announcement_target_user
Revises: add_finance_date_needed
Create Date: 2026-09-02
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_announcement_target_user'
down_revision = 'add_finance_date_needed'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('announcements', sa.Column('target_user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_announcements_target_user_id', 'announcements', 'users',
        ['target_user_id'], ['id']
    )


def downgrade():
    op.drop_constraint('fk_announcements_target_user_id', 'announcements', type_='foreignkey')
    op.drop_column('announcements', 'target_user_id')