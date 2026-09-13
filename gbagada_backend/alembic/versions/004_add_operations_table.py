"""create operations table

Revision ID: add_operations_table
Revises: add_overall_pastor_role
Create Date: 2026-08-05
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_operations_table'
down_revision = 'add_overall_pastor_role'
branch_labels = None
depends_on = None


def upgrade():
    operation_priority = sa.Enum('LOW', 'MEDIUM', 'HIGH', 'URGENT', name='operationpriority')
    operation_status = sa.Enum('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='operationstatus')

    op.create_table(
        'operations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('priority', operation_priority, nullable=True),
        sa.Column('status', operation_status, nullable=True),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('is_recurring', sa.Boolean(), server_default=sa.false(), nullable=True),
        sa.Column('recurrence_pattern', sa.String(length=100), nullable=True),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_operations_id'), 'operations', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_operations_id'), table_name='operations')
    op.drop_table('operations')
    op.execute("DROP TYPE IF EXISTS operationpriority")
    op.execute("DROP TYPE IF EXISTS operationstatus")