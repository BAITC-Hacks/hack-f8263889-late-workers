"""GET /api/industries."""

from app.core.catalog import INDUSTRIES
from httpx import AsyncClient


async def test_industries_are_returned_in_contract_order(
    client: AsyncClient, student: dict
) -> None:
    response = await client.get("/api/industries")
    assert response.status_code == 200, response.text
    assert response.json()["items"] == [{"code": code, "name": name} for code, name in INDUSTRIES]


async def test_industries_require_a_session(client: AsyncClient) -> None:
    response = await client.get("/api/industries")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"
