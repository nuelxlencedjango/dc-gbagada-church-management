"""add class lessons log

Revision ID: add_class_lessons
Revises: add_children_module
Create Date: 2026-09-07
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_class_lessons'
down_revision = 'add_children_module'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'class_lessons',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('taught_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['class_id'], ['children_classes.id']),
        sa.ForeignKeyConstraint(['taught_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_class_lessons_id'), 'class_lessons', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_class_lessons_id'), table_name='class_lessons')
    op.drop_table('class_lessons')