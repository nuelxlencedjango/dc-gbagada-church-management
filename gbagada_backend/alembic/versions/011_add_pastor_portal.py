"""add pastor portal tables

Revision ID: add_pastor_portal
Revises: add_member_follow_ups
Create Date: 2026-08-15
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_pastor_portal'
down_revision = 'add_member_follow_ups'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'pastor_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pastor_id', sa.Integer(), nullable=False),
        sa.Column('week_start_date', sa.Date(), nullable=False),
        sa.Column('activities_performed', sa.Text(), nullable=True),
        sa.Column('challenges', sa.Text(), nullable=True),
        sa.Column('achievements', sa.Text(), nullable=True),
        sa.Column('prayer_requests', sa.Text(), nullable=True),
        sa.Column('report', sa.Text(), nullable=True),
        sa.Column('submitted_by_id', sa.Integer(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['pastor_id'], ['pastors.id']),
        sa.ForeignKeyConstraint(['submitted_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pastor_reports_id'), 'pastor_reports', ['id'], unique=False)

    op.create_table(
        'pastor_programs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pastor_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('program_date', sa.Date(), nullable=False),
        sa.Column('program_time', sa.String(length=20), nullable=True),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['pastor_id'], ['pastors.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pastor_programs_id'), 'pastor_programs', ['id'], unique=False)

    op.create_table(
        'pastor_contributions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('pastor_id', sa.Integer(), nullable=False),
        sa.Column('contributor_name', sa.String(length=200), nullable=True),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('purpose', sa.String(length=200), nullable=True),
        sa.Column('contribution_date', sa.Date(), nullable=False),
        sa.Column('recorded_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['pastor_id'], ['pastors.id']),
        sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pastor_contributions_id'), 'pastor_contributions', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_pastor_contributions_id'), table_name='pastor_contributions')
    op.drop_table('pastor_contributions')
    op.drop_index(op.f('ix_pastor_programs_id'), table_name='pastor_programs')
    op.drop_table('pastor_programs')
    op.drop_index(op.f('ix_pastor_reports_id'), table_name='pastor_reports')
    op.drop_table('pastor_reports')
