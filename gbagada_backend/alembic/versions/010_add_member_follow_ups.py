"""add member_follow_ups table

Revision ID: add_member_follow_ups
Revises: add_hod_cell_portals
Create Date: 2026-08-15
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_member_follow_ups'
down_revision = 'add_hod_cell_portals'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'member_follow_ups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('follow_up_date', sa.Date(), nullable=False),
        sa.Column('method', sa.String(length=20), nullable=False),
        sa.Column('reason_for_inactivity', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('outcome', sa.Text(), nullable=True),
        sa.Column('followed_up_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['member_id'], ['members.id']),
        sa.ForeignKeyConstraint(['followed_up_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_member_follow_ups_id'), 'member_follow_ups', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_member_follow_ups_id'), table_name='member_follow_ups')
    op.drop_table('member_follow_ups')