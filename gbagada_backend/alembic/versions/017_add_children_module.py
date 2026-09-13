"""add children's department module

Revision ID: add_children_module
Revises: add_service_speaker_name
Create Date: 2026-09-07
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_children_module'
down_revision = 'add_service_speaker_name'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'children_classes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('age_range', sa.String(length=50), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('department_id', sa.Integer(), nullable=True),
        sa.Column('teacher_id', sa.Integer(), nullable=True),
        sa.Column('assistant_teacher_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id']),
        sa.ForeignKeyConstraint(['teacher_id'], ['users.id']),
        sa.ForeignKeyConstraint(['assistant_teacher_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_children_classes_id'), 'children_classes', ['id'], unique=False)

    op.create_table(
        'children',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=True),
        sa.Column('class_id', sa.Integer(), nullable=True),
        sa.Column('parent_name', sa.String(length=200), nullable=True),
        sa.Column('parent_phone', sa.String(length=20), nullable=True),
        sa.Column('parent_email', sa.String(length=200), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['class_id'], ['children_classes.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_children_id'), 'children', ['id'], unique=False)

    op.create_table(
        'child_attendance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('child_id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('present', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('recorded_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['child_id'], ['children.id']),
        sa.ForeignKeyConstraint(['class_id'], ['children_classes.id']),
        sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_child_attendance_id'), 'child_attendance', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_child_attendance_id'), table_name='child_attendance')
    op.drop_table('child_attendance')
    op.drop_index(op.f('ix_children_id'), table_name='children')
    op.drop_table('children')
    op.drop_index(op.f('ix_children_classes_id'), table_name='children_classes')
    op.drop_table('children_classes')