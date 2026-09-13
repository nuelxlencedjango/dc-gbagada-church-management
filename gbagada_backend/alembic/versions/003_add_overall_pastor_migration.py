"""add OVERALL_PASTOR to userrole enum

Revision ID: add_overall_pastor_role
Revises: add_budget_proposal_fields
Create Date: 2026-08-04
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'add_overall_pastor_role'
down_revision = 'add_budget_proposal_fields'
branch_labels = None
depends_on = None


def upgrade():
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'OVERALL_PASTOR'")


def downgrade():
    # Postgres does not support removing an enum value directly.
    pass
