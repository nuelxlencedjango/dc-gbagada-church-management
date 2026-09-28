import os
import sys
from pathlib import Path

# Add project root to Python path so we can import 'src'
sys.path.append(str(Path(__file__).parent.parent))

from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# This is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# IMPORTANT: Set target_metadata to your Base.metadata
from src.config.database import Base
target_metadata = Base.metadata

# Import all models so Alembic detects them
import src.models
import src.models.budget   # ensure budget model is imported


def get_url() -> str | None:
    """Prefer the real DATABASE_URL env var (set by Railway/Neon in
    production, or your local .env) over whatever static value is
    sitting in alembic.ini. Without this, alembic always connects using
    the ini file's value regardless of environment — which is why this
    was silently trying 'localhost' inside the Railway container even
    though DATABASE_URL was set correctly."""
    return os.getenv("DATABASE_URL")


def run_migrations_offline() -> None:
    url = get_url() or config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})

    db_url = get_url()
    if db_url:
        configuration["sqlalchemy.url"] = db_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()