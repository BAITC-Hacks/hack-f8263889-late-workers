"""The migrations must build the same schema the models describe.

Tests elsewhere build the schema with `Base.metadata.create_all`, so nothing else
in the suite would notice a model change that never made it into a migration.
"""

import os
import subprocess
import sys
import uuid
from collections.abc import AsyncIterator

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from tests.conftest import TEST_DATABASE_URL

INITIAL_REVISION = "17bf3cdf8fd8"


def _alembic(database_url: str, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        env={**os.environ, "DATABASE_URL": database_url, "AUTO_MIGRATE": "false"},
        capture_output=True,
        text=True,
    )


@pytest.fixture
async def scratch_database() -> AsyncIterator[str]:
    """An empty database of its own, so a migration run can't disturb the suite."""
    name = f"migtest_{uuid.uuid4().hex[:8]}"
    # CREATE DATABASE cannot run inside a transaction.
    admin = create_async_engine(TEST_DATABASE_URL, isolation_level="AUTOCOMMIT")
    async with admin.connect() as conn:
        await conn.execute(text(f'CREATE DATABASE "{name}"'))
    try:
        yield TEST_DATABASE_URL.rsplit("/", 1)[0] + f"/{name}"
    finally:
        async with admin.connect() as conn:
            await conn.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
        await admin.dispose()


async def test_migrations_build_the_schema_the_models_describe(scratch_database: str) -> None:
    upgrade = _alembic(scratch_database, "upgrade", "head")
    assert upgrade.returncode == 0, upgrade.stderr

    # `alembic check` fails when the models have drifted from the migrations.
    check = _alembic(scratch_database, "check")
    assert check.returncode == 0, check.stdout + check.stderr


async def test_migrations_upgrade_a_database_that_already_has_users(
    scratch_database: str,
) -> None:
    base = _alembic(scratch_database, "upgrade", INITIAL_REVISION)
    assert base.returncode == 0, base.stderr

    engine = create_async_engine(scratch_database)
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO users (email, hashed_password, is_active, is_superuser)"
                " VALUES ('legacy@example.com', 'x', true, false)"
            )
        )

    # Adding a NOT NULL column to a populated table only works with a server default.
    upgrade = _alembic(scratch_database, "upgrade", "head")
    assert upgrade.returncode == 0, upgrade.stderr

    async with engine.begin() as conn:
        role = (await conn.execute(text("SELECT role FROM users"))).scalar_one()
    await engine.dispose()
    assert role == "student"


async def test_migrations_downgrade_and_upgrade_again(scratch_database: str) -> None:
    assert _alembic(scratch_database, "upgrade", "head").returncode == 0
    down = _alembic(scratch_database, "downgrade", INITIAL_REVISION)
    assert down.returncode == 0, down.stderr
    up = _alembic(scratch_database, "upgrade", "head")
    assert up.returncode == 0, up.stderr


def test_there_is_a_single_migration_head() -> None:
    heads = _alembic(TEST_DATABASE_URL, "heads")
    assert heads.returncode == 0, heads.stderr
    assert len([line for line in heads.stdout.splitlines() if line.strip()]) == 1
