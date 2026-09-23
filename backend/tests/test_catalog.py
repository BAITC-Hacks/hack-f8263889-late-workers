"""GET /api/tasks — filters, sorting, pagination and query validation."""

from app.core import messages
from app.models import Task
from httpx import AsyncClient


async def test_catalogue_hides_non_catalogue_statuses_and_sorts_by_rating(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    response = await client.get("/api/tasks")
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["total"] == 6  # the draft is not in the catalogue
    assert body["page"] == 1
    assert body["pageSize"] == 20
    assert [item["rating"] for item in body["items"]] == [92, 78, 70, 64, 55, 35]


async def test_an_in_progress_task_without_a_publish_date_does_not_float_to_the_top(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    """Postgres sorts NULLs first on DESC — the query must ask for NULLS LAST."""
    response = await client.get("/api/tasks?sort=date")
    dates = [item["publishedAt"] for item in response.json()["items"]]
    assert dates[0] is not None
    assert dates[-1] is None


async def test_sort_by_responses(client: AsyncClient, student: dict, catalogue: list[Task]) -> None:
    response = await client.get("/api/tasks?sort=responses")
    assert [item["responsesCount"] for item in response.json()["items"]] == [6, 4, 3, 2, 1, 0]


async def test_filter_by_level(client: AsyncClient, student: dict, catalogue: list[Task]) -> None:
    response = await client.get("/api/tasks?level=needs_clarification")
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["rating"] == 35


async def test_several_levels_do_not_swallow_the_levels_between(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    """working is 40-69 and priority is 90-100; ready (70-89) must stay out."""
    response = await client.get("/api/tasks?level=working,priority")
    assert sorted(item["rating"] for item in response.json()["items"]) == [55, 64, 92]


async def test_filter_by_industry(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    response = await client.get("/api/tasks?industry=horeca,it")
    codes = {item["industry"]["code"] for item in response.json()["items"]}
    assert codes == {"horeca", "it"}


async def test_filters_combine_with_and(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    response = await client.get("/api/tasks?industry=horeca&level=priority")
    assert response.json()["total"] == 0


async def test_every_invalid_parameter_is_reported_at_once(
    client: AsyncClient, student: dict
) -> None:
    response = await client.get("/api/tasks?industry=farm&page=0&sort=nope&level=zzz")
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["message"] == messages.VALIDATION_QUERY
    assert error["fields"] == {
        "sort": messages.SORT,
        "industry": messages.unknown_industry("farm"),
        "level": messages.unknown_level("zzz"),
        "page": messages.PAGE,
    }


async def test_a_page_past_the_end_is_empty_but_keeps_the_total(
    client: AsyncClient, student: dict, catalogue: list[Task]
) -> None:
    response = await client.get("/api/tasks?page=2")
    body = response.json()
    assert body["items"] == []
    assert body["total"] == 6
    assert body["page"] == 2


async def test_card_shape(client: AsyncClient, student: dict, catalogue: list[Task]) -> None:
    item = (await client.get("/api/tasks")).json()["items"][0]
    assert set(item) == {
        "id",
        "title",
        "companyName",
        "industry",
        "rating",
        "level",
        "status",
        "needExcerpt",
        "responsesCount",
        "publishedAt",
        "isSaved",
        "badges",
    }
    assert item["level"] == {"code": "priority", "name": "Приоритетная"}
    assert item["status"] == {"code": "published", "name": "Опубликована"}
    assert item["publishedAt"].endswith("Z")


async def test_is_saved_is_always_false_for_a_business(
    client: AsyncClient, business: dict, catalogue: list[Task]
) -> None:
    response = await client.get("/api/tasks")
    assert {item["isSaved"] for item in response.json()["items"]} == {False}


async def test_catalogue_requires_a_session(client: AsyncClient) -> None:
    assert (await client.get("/api/tasks")).status_code == 401
