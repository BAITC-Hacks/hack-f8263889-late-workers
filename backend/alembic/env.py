"""Async Alembic environment. Reads DATABASE_URL from app settings."""

import asyncio
import logging

import app.models  # noqa: F401  (registers every model on Base.metadata)
from alembic import context
from app.core.config import settings
from app.db.base import Base
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

config = context.config
# Escape '%' for configparser interpolation (passwords may contain it).
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("%", "%%"))

if not logging.getLogger().handlers:  # running from the CLI, not from the app
    logging.basicConfig(level=logging.INFO, format="%(levelname)-5s %(name)s: %(message)s")

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=settings.is_sqlite,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=settings.is_sqlite,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
