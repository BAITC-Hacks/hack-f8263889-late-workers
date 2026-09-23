"""GET /api/tasks/{id} — the task page and who may see it."""

from app.core import messages
from app.models import Task
from httpx import AsyncClient


async def test_a_published_task_is_visible_to_a_student(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    published = next(t for t in catalogue if t.status == "published")
    response = await client.get(f"/api/tasks/{published.id}")
    assert response.status_code == 200, response.text

    task = response.json()["task"]
    assert "needExcerpt" not in task  # the detail body carries the full prose instead
    assert task["isOwner"] is False
    assert set(task["fields"]) == {
        "context",
        "need",
        "targetUsers",
        "dataMaterials",
        "constraints",
        "expectedResult",
        "successCriteria",
        "contact",
        "interactionFormat",
    }
    assert task["fields"]["need"] == published.need
    assert task["fields"]["context"] is None


async def test_the_owner_sees_their_own_draft(
    owner_client: AsyncClient, catalogue: list[Task]
) -> None:
    draft = next(t for t in catalogue if t.status == "draft")
    response = await owner_client.get(f"/api/tasks/{draft.id}")
    assert response.status_code == 200, response.text
    task = response.json()["task"]
    assert task["isOwner"] is True
    assert task["status"] == {"code": "draft", "name": "Черновик"}


async def test_a_student_gets_404_for_a_draft_not_403(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    """404, so nobody outside the owning business learns that the draft exists."""
    draft = next(t for t in catalogue if t.status == "draft")
    response = await client.get(f"/api/tasks/{draft.id}")
    assert response.status_code == 404
    assert response.json()["error"] == {
        "code": "NOT_FOUND",
        "message": messages.TASK_NOT_FOUND,
    }


async def test_another_business_gets_404_for_a_foreign_draft(
    client: AsyncClient, business: dict, catalogue: list[Task]
) -> None:
    draft = next(t for t in catalogue if t.status == "draft")
    assert (await client.get(f"/api/tasks/{draft.id}")).status_code == 404


async def test_a_missing_task_is_404(client: AsyncClient, student: dict) -> None:
    response = await client.get("/api/tasks/99999")
    assert response.status_code == 404
    assert response.json()["error"]["message"] == messages.TASK_NOT_FOUND


async def test_the_task_page_requires_a_session(client: AsyncClient) -> None:
    assert (await client.get("/api/tasks/1")).status_code == 401
