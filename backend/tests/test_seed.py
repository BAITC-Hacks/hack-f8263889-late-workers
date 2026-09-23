"""The demo dataset: `make seed`."""

import os
import subprocess
import sys

import pytest
from app.models import Business, Proposal, Student, Task, Team
from app.seed import DEMO_PASSWORD
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import TEST_DATABASE_URL


def run_seed() -> subprocess.CompletedProcess[str]:
    # A subprocess, so the seed's own engine never shares an event loop with the test.
    return subprocess.run(
        [sys.executable, "-m", "app.seed"],
        env={**os.environ, "DATABASE_URL": TEST_DATABASE_URL, "AUTO_MIGRATE": "false"},
        capture_output=True,
        text=True,
    )


@pytest.fixture
async def seeded(db: AsyncSession) -> None:
    result = run_seed()
    assert result.returncode == 0, result.stderr


async def test_seed_loads_the_demo_dataset(seeded: None, db: AsyncSession) -> None:
    assert await db.scalar(select(func.count()).select_from(Business)) == 3
    assert await db.scalar(select(func.count()).select_from(Student)) == 12
    assert await db.scalar(select(func.count()).select_from(Task)) == 7
    assert await db.scalar(select(func.count()).select_from(Team)) == 5
    assert await db.scalar(select(func.count()).select_from(Proposal)) == 6


async def test_seed_is_idempotent(seeded: None, db: AsyncSession) -> None:
    result = run_seed()
    assert result.returncode == 0, result.stderr
    assert await db.scalar(select(func.count()).select_from(Business)) == 3
    assert await db.scalar(select(func.count()).select_from(Student)) == 12
    assert await db.scalar(select(func.count()).select_from(Task)) == 7
    assert await db.scalar(select(func.count()).select_from(Team)) == 5
    assert await db.scalar(select(func.count()).select_from(Proposal)) == 6


async def test_the_catalogue_shows_six_of_the_seven_seeded_tasks(
    seeded: None, client: AsyncClient
) -> None:
    """Five published plus one in progress; the draft stays out."""
    login = await client.post(
        "/api/auth/login", json={"email": "arman@student.kz", "password": DEMO_PASSWORD}
    )
    assert login.status_code == 200, login.text

    body = (await client.get("/api/tasks")).json()
    assert body["total"] == 6
    assert [item["rating"] for item in body["items"]] == [92, 78, 70, 64, 55, 35]
    # All four levels appear among the seeded tasks.
    assert {item["level"]["code"] for item in body["items"]} == {
        "priority",
        "ready",
        "working",
        "needs_clarification",
    }


async def test_a_demo_business_can_log_in(seeded: None, client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/login", json={"email": "owner@zerno.kz", "password": DEMO_PASSWORD}
    )
    assert response.status_code == 200, response.text
    assert response.json()["user"]["business"]["companyName"] == "Кофейня «Зерно»"


async def test_seeded_response_counts_match_the_live_proposals(
    seeded: None, db: AsyncSession
) -> None:
    """The JSON carries a starting count; the seed must recompute it."""
    tasks = list(await db.scalars(select(Task)))
    for task in tasks:
        live = await db.scalar(
            select(func.count())
            .select_from(Proposal)
            .where(Proposal.task_id == task.id, Proposal.status != "withdrawn")
        )
        assert task.responses_count == live, task.title
