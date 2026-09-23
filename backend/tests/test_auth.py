"""The legacy /api/v1 auth surface.

Registration lives in the accounts contract now (`tests/test_accounts_*.py`);
what remains here is the form login that backs Swagger's Authorize button, and
the guarantee that a cookie token is also accepted as a bearer token.
"""

from httpx import AsyncClient

from tests.conftest import STUDENT


async def test_form_login_returns_a_usable_bearer_token(client: AsyncClient, student: dict) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": STUDENT["email"], "password": STUDENT["password"]},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    response = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == STUDENT["email"]


async def test_form_login_wrong_password(client: AsyncClient, student: dict) -> None:
    response = await client.post(
        "/api/v1/auth/login",
        data={"username": STUDENT["email"], "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


async def test_legacy_me_without_token(client: AsyncClient) -> None:
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


async def test_legacy_me_with_garbage_token(client: AsyncClient) -> None:
    response = await client.get("/api/v1/users/me", headers={"Authorization": "Bearer nope"})
    assert response.status_code == 401
