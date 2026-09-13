"""add help_requests, department_programs, cell offering field

Revision ID: add_hod_cell_portals
Revises: add_mvp_extra_fields
Create Date: 2026-08-11
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_hod_cell_portals'
down_revision = 'add_mvp_extra_fields'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'help_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_type', sa.String(length=20), nullable=False),
        sa.Column('source_id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='pending', nullable=True),
        sa.Column('submitted_by_id', sa.Integer(), nullable=True),
        sa.Column('resolved_by_id', sa.Integer(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['member_id'], ['members.id']),
        sa.ForeignKeyConstraint(['submitted_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['resolved_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_help_requests_id'), 'help_requests', ['id'], unique=False)

    op.create_table(
        'department_programs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('program_date', sa.Date(), nullable=False),
        sa.Column('program_time', sa.String(length=20), nullable=True),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_department_programs_id'), 'department_programs', ['id'], unique=False)

    op.create_table(
        'department_contributions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('department_id', sa.Integer(), nullable=False),
        sa.Column('contributor_name', sa.String(length=200), nullable=True),
        sa.Column('member_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('purpose', sa.String(length=200), nullable=True),
        sa.Column('contribution_date', sa.Date(), nullable=False),
        sa.Column('recorded_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id']),
        sa.ForeignKeyConstraint(['member_id'], ['members.id']),
        sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_department_contributions_id'), 'department_contributions', ['id'], unique=False)

    op.add_column('cell_activities', sa.Column('offering_amount', sa.Numeric(precision=15, scale=2), nullable=True))


def downgrade():
    op.drop_column('cell_activities', 'offering_amount')
    op.drop_index(op.f('ix_department_contributions_id'), table_name='department_contributions')
    op.drop_table('department_contributions')
    op.drop_index(op.f('ix_department_programs_id'), table_name='department_programs')
    op.drop_table('department_programs')
    op.drop_index(op.f('ix_help_requests_id'), table_name='help_requests')
    op.drop_table('help_requests')