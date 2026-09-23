"""PUT /api/student/profile."""

from app.core import messages
from httpx import AsyncClient


async def test_updating_the_profile(client: AsyncClient, student: dict) -> None:
    response = await client.put(
        "/api/student/profile",
        json={"name": "Арман С.", "skills": ["SQL", "sql"], "technologies": ["Python"]},
    )
    assert response.status_code == 200, response.text

    profile = response.json()["user"]["student"]
    assert profile["name"] == "Арман С."
    assert profile["skills"] == ["SQL"]  # case-insensitive de-duplication


async def test_a_short_name_is_rejected(client: AsyncClient, student: dict) -> None:
    response = await client.put(
        "/api/student/profile", json={"name": "A", "skills": [], "technologies": []}
    )
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["name"] == messages.NAME


async def test_a_business_cannot_update_a_student_profile(
    client: AsyncClient, business: dict
) -> None:
    response = await client.put(
        "/api/student/profile", json={"name": "Кто-то", "skills": [], "technologies": []}
    )
    assert response.status_code == 403
