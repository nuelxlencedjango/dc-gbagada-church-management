"""add REQUEST value to transactiontype enum

The Requests feature (requests_routes.py) creates and filters Finance rows
with transaction_type=TransactionType.REQUEST, and finance_model_FINAL.py
already lists REQUEST on the Python-side TransactionType enum, but nothing
in the migration chain had ever added 'REQUEST' to the actual Postgres
transactiontype enum type. Without this, any call to a Requests endpoint
fails with: invalid input value for enum transactiontype: "REQUEST".

Revision ID: add_request_enum_value
Revises: drop_class_name_unique
Create Date: 2026-09-26
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'add_request_enum_value'
down_revision = 'drop_class_name_unique'
branch_labels = None
depends_on = None


def upgrade():
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
    # older Postgres versions, so we run it with autocommit.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'REQUEST'")


def downgrade():
    # Postgres does not support removing a value from an enum type directly.
    # A real rollback requires creating a new enum type without 'REQUEST',
    # migrating the column over, and dropping the old type. Left as a
    # no-op here since that's a destructive, data-dependent operation, and
    # no data written under this migration justifies that risk automatically.
    pass