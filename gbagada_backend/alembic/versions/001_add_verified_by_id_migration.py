"""add verified_by_id to finances

Revision ID: add_verified_by_id
Revises: e3494ef7d230
Create Date: 2026-08-02
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_verified_by_id'
down_revision = 'e3494ef7d230'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'finances',
        sa.Column('verified_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True)
    )


def downgrade():
    op.drop_column('finances', 'verified_by_id')
