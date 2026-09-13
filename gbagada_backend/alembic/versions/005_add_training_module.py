"""create training_sessions table and MVP eligibility fields on members

Revision ID: add_training_module
Revises: add_operations_table
Create Date: 2026-08-05
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_training_module'
down_revision = 'add_operations_table'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'training_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('training_type', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column('trainer_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['trainer_id'], ['users.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_training_sessions_id'), 'training_sessions', ['id'], unique=False)
    op.create_index(op.f('ix_training_sessions_training_type'), 'training_sessions', ['training_type'], unique=False)

    op.add_column('members', sa.Column('eligible_for_membership', sa.Boolean(), server_default=sa.false(), nullable=True))
    op.add_column('members', sa.Column('mvp_training_completed_at', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('members', 'mvp_training_completed_at')
    op.drop_column('members', 'eligible_for_membership')
    op.drop_index(op.f('ix_training_sessions_training_type'), table_name='training_sessions')
    op.drop_index(op.f('ix_training_sessions_id'), table_name='training_sessions')
    op.drop_table('training_sessions')