"""rebuild training tables to match real design, add mvps table

Revision ID: rebuild_training_add_mvps
Revises: add_training_module
Create Date: 2026-08-05
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'rebuild_training_add_mvps'
down_revision = 'add_training_module'
branch_labels = None
depends_on = None


def upgrade():
    # Drop the earlier, mismatched training_sessions table (built before
    # the real frontend design was known — see conversation history).
    op.drop_table('training_sessions')

    op.create_table(
        'trainings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('training_type', sa.String(length=20), nullable=False, server_default='other'),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.String(length=5), nullable=True),
        sa.Column('end_time', sa.String(length=5), nullable=True),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column('facilitator', sa.String(length=200), nullable=True),
        sa.Column('max_capacity', sa.Integer(), server_default='50', nullable=True),
        sa.Column('status', sa.String(length=20), server_default='scheduled', nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_trainings_id'), 'trainings', ['id'], unique=False)

    op.create_table(
        'training_registrations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('training_id', sa.Integer(), nullable=False),
        sa.Column('attendee_type', sa.String(length=10), nullable=False),
        sa.Column('attendee_id', sa.Integer(), nullable=False),
        sa.Column('registered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['training_id'], ['trainings.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_training_registrations_id'), 'training_registrations', ['id'], unique=False)

    op.create_table(
        'mvps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('visit_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='new', nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('assigned_to_id', sa.Integer(), nullable=True),
        sa.Column('converted_member_id', sa.Integer(), nullable=True),
        sa.Column('converted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['assigned_to_id'], ['users.id']),
        sa.ForeignKeyConstraint(['converted_member_id'], ['members.id']),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mvps_id'), 'mvps', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_mvps_id'), table_name='mvps')
    op.drop_table('mvps')
    op.drop_index(op.f('ix_training_registrations_id'), table_name='training_registrations')
    op.drop_table('training_registrations')
    op.drop_index(op.f('ix_trainings_id'), table_name='trainings')
    op.drop_table('trainings')