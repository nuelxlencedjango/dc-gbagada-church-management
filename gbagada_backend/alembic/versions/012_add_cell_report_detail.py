"""add cell report detail fields and agenda items table

Revision ID: add_cell_report_detail
Revises: add_pastor_portal
Create Date: 2026-08-16
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_cell_report_detail'
down_revision = 'add_pastor_portal'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('cell_activities', sa.Column('meeting_location', sa.String(length=200), nullable=True))
    op.add_column('cell_activities', sa.Column('attendee_names', sa.Text(), nullable=True))
    op.add_column('cell_activities', sa.Column('children_names', sa.Text(), nullable=True))

    op.create_table(
        'cell_activity_agenda_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cell_activity_id', sa.Integer(), nullable=False),
        sa.Column('segment_name', sa.String(length=200), nullable=False),
        sa.Column('start_time', sa.String(length=10), nullable=True),
        sa.Column('end_time', sa.String(length=10), nullable=True),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['cell_activity_id'], ['cell_activities.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_cell_activity_agenda_items_id'), 'cell_activity_agenda_items', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_cell_activity_agenda_items_id'), table_name='cell_activity_agenda_items')
    op.drop_table('cell_activity_agenda_items')
    op.drop_column('cell_activities', 'children_names')
    op.drop_column('cell_activities', 'attendee_names')
    op.drop_column('cell_activities', 'meeting_location')