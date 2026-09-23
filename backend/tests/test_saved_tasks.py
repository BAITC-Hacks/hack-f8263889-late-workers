"""POST/DELETE /api/tasks/{id}/save and GET /api/me/saved-tasks."""

from app.models import SavedTask, Task
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession


async def test_saving_twice_leaves_one_row(
    client: AsyncClient, student: dict, catalogue: list[Task], db: AsyncSession
) -> None:
    task = catalogue[0]
    first = await client.post(f"/api/tasks/{task.id}/save")
    second = await client.post(f"/api/tasks/{task.id}/save")
    assert first.status_code == second.status_code == 204
    assert await db.scalar(select(func.count()).select_from(SavedTask)) == 1


async def test_a_business_cannot_save(
    client: AsyncClient, business: dict, catalogue: list[Task]
) -> None:
    response = await client.post(f"/api/tasks/{catalogue[0].id}/save")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


async def test_saving_a_draft_is_404(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    draft = next(t for t in catalogue if t.status == "draft")
    assert (await client.post(f"/api/tasks/{draft.id}/save")).status_code == 404


async def test_saving_a_missing_task_is_404(client: AsyncClient, student: dict) -> None:
    assert (await client.post("/api/tasks/99999/save")).status_code == 404


async def test_the_newest_save_comes_first(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    first, second = catalogue[0], catalogue[1]
    await client.post(f"/api/tasks/{first.id}/save")
    await client.post(f"/api/tasks/{second.id}/save")

    items = (await client.get("/api/me/saved-tasks")).json()["items"]
    assert [item["id"] for item in items] == [second.id, first.id]
    assert {item["isSaved"] for item in items} == {True}


async def test_unsaving_removes_it_everywhere(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    task = catalogue[0]
    await client.post(f"/api/tasks/{task.id}/save")

    response = await client.delete(f"/api/tasks/{task.id}/save")
    assert response.status_code == 204
    assert (await client.get("/api/me/saved-tasks")).json()["items"] == []

    catalogue_items = (await client.get("/api/tasks")).json()["items"]
    assert {item["isSaved"] for item in catalogue_items} == {False}


async def test_unsaving_something_that_was_never_saved_still_succeeds(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    assert (await client.delete(f"/api/tasks/{catalogue[0].id}/save")).status_code == 204


async def test_saved_tasks_are_student_only(
    client: AsyncClient, business: dict, catalogue: list[Task]
) -> None:
    assert (await client.get("/api/me/saved-tasks")).status_code == 403
