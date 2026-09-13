"""drop unique constraint on children_classes name

Classes aren't date-scoped the way Services are, but there's no reason
a class name needs to be globally unique either — this was blocking
legitimate reuse (recreating a deleted class, naming two classes
similarly across different contexts).

Revision ID: drop_class_name_unique
Revises: add_class_lessons
Create Date: 2026-09-07
"""
from alembic import op

revision = 'drop_class_name_unique'
down_revision = 'add_class_lessons'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('children_classes_name_key', 'children_classes', type_='unique')


def downgrade():
    op.create_unique_constraint('children_classes_name_key', 'children_classes', ['name'])