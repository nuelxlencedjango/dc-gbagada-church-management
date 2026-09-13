"""add address, occupation, prayer_point to mvps

Revision ID: add_mvp_extra_fields
Revises: add_training_attendance
Create Date: 2026-08-07
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_mvp_extra_fields'
down_revision = 'add_training_attendance'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('mvps', sa.Column('address', sa.Text(), nullable=True))
    op.add_column('mvps', sa.Column('occupation', sa.String(length=200), nullable=True))
    op.add_column('mvps', sa.Column('prayer_point', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('mvps', 'prayer_point')
    op.drop_column('mvps', 'occupation')
    op.drop_column('mvps', 'address')