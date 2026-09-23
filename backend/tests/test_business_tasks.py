"""GET /api/business/tasks."""

from app.models import Task
from httpx import AsyncClient


async def test_a_business_sees_every_status_newest_first(
    owner_client: AsyncClient, catalogue: list[Task]
) -> None:
    response = await owner_client.get("/api/business/tasks")
    assert response.status_code == 200, response.text
    items = response.json()["items"]

    assert len(items) == len(catalogue)  # drafts included
    assert any(item["status"] == {"code": "draft", "name": "Черновик"} for item in items)
    assert [item["updatedAt"] for item in items] == sorted(
        (item["updatedAt"] for item in items), reverse=True
    )
    assert set(items[0]) == {
        "id",
        "title",
        "status",
        "rating",
        "level",
        "responsesCount",
        "updatedAt",
    }


async def test_a_business_without_tasks_gets_an_empty_list(
    client: AsyncClient, business: dict
) -> None:
    assert (await client.get("/api/business/tasks")).json()["items"] == []


async def test_business_tasks_are_business_only(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    response = await client.get("/api/business/tasks")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
