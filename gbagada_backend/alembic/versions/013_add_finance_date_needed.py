"""add date_needed to finances

Revision ID: add_finance_date_needed
Revises: add_cell_report_detail
Create Date: 2026-08-27
"""
from alembic import op
import sqlalchemy as sa

revision = 'add_finance_date_needed'
down_revision = 'add_cell_report_detail'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('finances', sa.Column('date_needed', sa.Date(), nullable=True))


def downgrade():
    op.drop_column('finances', 'date_needed')