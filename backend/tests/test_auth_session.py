"""POST /api/auth/login, /logout, GET /api/auth/me and the role guard."""

from collections.abc import Iterator
from datetime import timedelta

import pytest
from app.api.deps import require_role
from app.core import messages
from app.core.security import create_access_token
from app.main import app
from fastapi import Depends
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import BUSINESS, STUDENT

PROBE = "/api/_probe/business"


@pytest.fixture
def business_probe() -> Iterator[None]:
    """A business-only route, so the guard has a consumer before the real ones exist."""

    async def probe(_: object = Depends(require_role("business"))) -> dict[str, bool]:
        return {"ok": True}

    app.add_api_route(PROBE, probe, methods=["GET"], include_in_schema=False)
    yield
    app.router.routes = [r for r in app.router.routes if getattr(r, "path", None) != PROBE]


async def test_login_returns_the_user_and_sets_the_cookie(
    client: AsyncClient, business: dict
) -> None:
    await client.post("/api/auth/logout")
    response = await client.post(
        "/api/auth/login", json={"email": BUSINESS["email"], "password": BUSINESS["password"]}
    )
    assert response.status_code == 200, response.text
    assert response.json()["user"]["id"] == business["id"]
    assert "Max-Age=604800" in response.headers["set-cookie"]


async def test_login_is_case_insensitive_on_the_email(client: AsyncClient, business: dict) -> None:
    response = await client.post(
        "/api/auth/login",
        json={"email": "  OWNER@ZERNO.KZ  ", "password": BUSINESS["password"]},
    )
    assert response.status_code == 200, response.text


async def test_login_with_empty_fields_asks_the_user_to_fill_them(client: AsyncClient) -> None:
    response = await client.post("/api/auth/login", json={"email": "", "password": ""})
    assert response.status_code == 422
    assert response.json()["error"]["fields"] == {
        "email": messages.EMAIL_REQUIRED,
        "password": messages.PASSWORD_REQUIRED,
    }


async def test_an_unknown_email_is_indistinguishable_from_a_wrong_password(
    client: AsyncClient, business: dict
) -> None:
    wrong_password = await client.post(
        "/api/auth/login", json={"email": BUSINESS["email"], "password": "nope1234"}
    )
    unknown_email = await client.post(
        "/api/auth/login", json={"email": "ghost@nowhere.kz", "password": "nope1234"}
    )
    assert wrong_password.status_code == unknown_email.status_code == 401
    # Byte-identical, so the endpoint cannot be used to probe for registered emails.
    assert wrong_password.content == unknown_email.content
    assert wrong_password.json()["error"] == {
        "code": "INVALID_CREDENTIALS",
        "message": messages.INVALID_CREDENTIALS,
    }


async def test_me_returns_the_signed_in_business(client: AsyncClient, business: dict) -> None:
    response = await client.get("/api/auth/me")
    assert response.status_code == 200, response.text
    assert response.json()["user"] == business


async def test_me_returns_the_signed_in_student(client: AsyncClient, student: dict) -> None:
    response = await client.get("/api/auth/me")
    assert response.status_code == 200, response.text
    assert response.json()["user"] == student


async def test_me_without_a_cookie_is_unauthorized(client: AsyncClient) -> None:
    response = await client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json()["error"] == {
        "code": "UNAUTHORIZED",
        "message": messages.UNAUTHORIZED,
    }


@pytest.mark.parametrize("token", ["garbage", ""])
async def test_me_with_a_broken_cookie_is_unauthorized(client: AsyncClient, token: str) -> None:
    response = await client.get("/api/auth/me", headers={"Cookie": f"access_token={token}"})
    assert response.status_code == 401


async def test_me_with_an_expired_token_is_unauthorized(client: AsyncClient, student: dict) -> None:
    expired = create_access_token(student["id"], expires_delta=timedelta(seconds=-1))
    client.cookies.set("access_token", expired)
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_me_after_the_user_is_deleted_is_unauthorized(
    client: AsyncClient, student: dict, db: AsyncSession
) -> None:
    await db.execute(text("DELETE FROM users WHERE id = :id"), {"id": student["id"]})
    await db.commit()
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


async def test_the_cookie_wins_over_a_stale_authorization_header(
    client: AsyncClient, student: dict
) -> None:
    stale = create_access_token(999)
    response = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {stale}"})
    assert response.status_code == 200
    assert response.json()["user"]["id"] == student["id"]


async def test_logout_clears_the_cookie(client: AsyncClient, student: dict) -> None:
    response = await client.post("/api/auth/logout")
    assert response.status_code == 204
    assert response.content == b""
    assert "Max-Age=0" in response.headers["set-cookie"]
    assert (await client.get("/api/auth/me")).status_code == 401


async def test_logout_without_a_session_still_succeeds(client: AsyncClient) -> None:
    response = await client.post("/api/auth/logout")
    assert response.status_code == 204


async def test_the_role_guard_rejects_the_wrong_role(
    client: AsyncClient, student: dict, business_probe: None
) -> None:
    response = await client.get(PROBE)
    assert response.status_code == 403
    assert response.json()["error"] == {"code": "FORBIDDEN", "message": messages.FORBIDDEN}


async def test_the_role_guard_admits_the_right_role(
    client: AsyncClient, business: dict, business_probe: None
) -> None:
    response = await client.get(PROBE)
    assert response.status_code == 200


async def test_the_role_guard_answers_401_before_403(
    client: AsyncClient, business_probe: None
) -> None:
    response = await client.get(PROBE)
    assert response.status_code == 401


@pytest.mark.parametrize("body", [[1, 2, 3], "hello", 5, None])
async def test_a_body_that_is_not_an_object_is_a_422(client: AsyncClient, body: object) -> None:
    response = await client.post("/api/auth/login", json=body)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_register_student_via_the_contract_lets_the_user_log_in(
    client: AsyncClient, student: dict
) -> None:
    await client.post("/api/auth/logout")
    response = await client.post(
        "/api/auth/login", json={"email": STUDENT["email"], "password": STUDENT["password"]}
    )
    assert response.status_code == 200, response.text
    assert response.json()["user"]["student"]["name"] == STUDENT["name"]
