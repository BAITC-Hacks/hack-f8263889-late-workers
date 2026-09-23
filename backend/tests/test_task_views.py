"""View counting: one row per student per task, students only."""

from app.models import Student, Task, TaskView
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


async def _views(db: AsyncSession) -> int:
    return await db.scalar(select(func.count()).select_from(TaskView)) or 0


async def test_a_student_counts_once(
    client: AsyncClient, student: dict, catalogue: list[Task], db: AsyncSession
) -> None:
    task = next(t for t in catalogue if t.status == "published")
    await client.get(f"/api/tasks/{task.id}")
    await client.get(f"/api/tasks/{task.id}")
    assert await _views(db) == 1


async def test_a_second_student_counts_separately(
    client: AsyncClient,
    student: dict,
    catalogue: list[Task],
    teammate: Student,
    teammate_client: AsyncClient,
    db: AsyncSession,
) -> None:
    task = next(t for t in catalogue if t.status == "published")
    await client.get(f"/api/tasks/{task.id}")
    await teammate_client.get(f"/api/tasks/{task.id}")
    assert await _views(db) == 2


async def test_a_business_does_not_count(
    client: AsyncClient, business: dict, catalogue: list[Task], db: AsyncSession
) -> None:
    task = next(t for t in catalogue if t.status == "published")
    assert (await client.get(f"/api/tasks/{task.id}")).status_code == 200
    assert await _views(db) == 0


async def test_the_owner_viewing_a_draft_does_not_count(
    owner_client: AsyncClient, catalogue: list[Task], db: AsyncSession
) -> None:
    draft = next(t for t in catalogue if t.status == "draft")
    assert (await owner_client.get(f"/api/tasks/{draft.id}")).status_code == 200
    assert await _views(db) == 0
