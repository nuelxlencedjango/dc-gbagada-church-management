"""add recurring_activities table

Revision ID: add_recurring_activities
Revises: add_request_enum_value
Create Date: 2026-09-29
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_recurring_activities'
down_revision = 'add_request_enum_value'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'recurring_activities',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('title', sa.String(150), nullable=False),
        sa.Column('frequency_label', sa.String(100), nullable=False),
        sa.Column('time_label', sa.String(50), nullable=True),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('is_virtual', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('link', sa.String(500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_table('recurring_activities')