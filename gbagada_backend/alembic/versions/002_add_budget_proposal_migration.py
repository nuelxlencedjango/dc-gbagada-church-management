"""add budget proposal fields and disbursement tracking to finances

Revision ID: add_budget_proposal_fields
Revises: add_verified_by_id
Create Date: 2026-08-04
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_budget_proposal_fields'
down_revision = 'add_verified_by_id'
branch_labels = None
depends_on = None


def upgrade():
    # New enum value must be added outside the normal transaction block
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE transactionstatus ADD VALUE IF NOT EXISTS 'DISBURSED'")

    op.add_column('finances', sa.Column('disbursed_by_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('finances', sa.Column('disbursed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('finances', sa.Column('department_id', sa.Integer(), sa.ForeignKey('departments.id'), nullable=True))
    op.add_column('finances', sa.Column('budget_month', sa.Integer(), nullable=True))
    op.add_column('finances', sa.Column('budget_year', sa.Integer(), nullable=True))
    op.add_column('finances', sa.Column('is_budget_proposal', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade():
    op.drop_column('finances', 'is_budget_proposal')
    op.drop_column('finances', 'budget_year')
    op.drop_column('finances', 'budget_month')
    op.drop_column('finances', 'department_id')
    op.drop_column('finances', 'disbursed_at')
    op.drop_column('finances', 'disbursed_by_id')
    # Postgres does not support removing an enum value; DISBURSED is left in place.
