"""POST /api/auth/register/business and /register/student."""

import re

import pytest
from app.core import messages
from app.models import Business, User
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import BUSINESS, STUDENT

ISO_UTC = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")


async def test_register_business_returns_the_contract_envelope(client: AsyncClient) -> None:
    response = await client.post("/api/auth/register/business", json=BUSINESS)
    assert response.status_code == 201, response.text

    user = response.json()["user"]
    assert user["id"] == 1
    assert user["email"] == BUSINESS["email"]
    assert user["role"] == "business"
    assert ISO_UTC.match(user["createdAt"]), user["createdAt"]
    assert user["student"] is None
    assert user["business"] == {
        "id": 1,
        "companyName": BUSINESS["companyName"],
        "contactName": BUSINESS["contactName"],
        "contactPhone": BUSINESS["contactPhone"],
    }


async def test_register_student_returns_the_contract_envelope(client: AsyncClient) -> None:
    response = await client.post("/api/auth/register/student", json=STUDENT)
    assert response.status_code == 201, response.text

    user = response.json()["user"]
    assert user["role"] == "student"
    assert user["business"] is None
    assert user["student"] == {
        "id": 1,
        "name": STUDENT["name"],
        "skills": STUDENT["skills"],
        "technologies": STUDENT["technologies"],
    }


async def test_register_sets_the_auth_cookie(client: AsyncClient) -> None:
    response = await client.post("/api/auth/register/business", json=BUSINESS)
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie
    assert "Max-Age=604800" in cookie  # 7 days, matching the token's lifetime
    assert "Path=/" in cookie
    assert "SameSite=Lax" in cookie
    assert "Secure" not in cookie  # ENV=test, so the cookie survives plain http


async def test_register_normalizes_the_phone(client: AsyncClient, db: AsyncSession) -> None:
    response = await client.post(
        "/api/auth/register/business", json={**BUSINESS, "contactPhone": "+7 (701) 123-45-67"}
    )
    assert response.status_code == 201, response.text
    assert response.json()["user"]["business"]["contactPhone"] == "+77011234567"
    assert await db.scalar(select(Business.contact_phone)) == "+77011234567"


async def test_register_business_reports_every_invalid_field_at_once(
    client: AsyncClient,
) -> None:
    response = await client.post(
        "/api/auth/register/business",
        json={
            "email": "nope",
            "password": "short",
            "companyName": "   ",
            "contactName": "A",
            "contactPhone": "123",
        },
    )
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["message"] == messages.VALIDATION
    assert error["fields"] == {
        "email": messages.EMAIL_FORMAT,
        "password": messages.PASSWORD_WEAK,
        "companyName": messages.COMPANY_NAME,
        "contactName": messages.CONTACT_NAME,
        "contactPhone": messages.CONTACT_PHONE,
    }


async def test_register_business_with_an_empty_body_reports_every_field(
    client: AsyncClient,
) -> None:
    response = await client.post("/api/auth/register/business", json={})
    assert response.status_code == 422
    assert set(response.json()["error"]["fields"]) == {
        "email",
        "password",
        "companyName",
        "contactName",
        "contactPhone",
    }


@pytest.mark.parametrize(
    ("payload", "field", "message"),
    [
        ({"skills": ["  "]}, "skills", messages.TAGS),
        ({"skills": ["x" * 51]}, "skills", messages.TAGS),
        ({"technologies": [f"tag{i}" for i in range(21)]}, "technologies", messages.TAGS),
        ({"name": "A"}, "name", messages.NAME),
        ({"name": "   "}, "name", messages.NAME),
    ],
)
async def test_register_student_rejects_bad_fields(
    client: AsyncClient, payload: dict, field: str, message: str
) -> None:
    response = await client.post("/api/auth/register/student", json={**STUDENT, **payload})
    assert response.status_code == 422
    assert response.json()["error"]["fields"][field] == message


async def test_register_student_trims_and_deduplicates_tags(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/register/student",
        json={**STUDENT, "skills": [" React ", "react", "Python"]},
    )
    assert response.status_code == 201, response.text
    assert response.json()["user"]["student"]["skills"] == ["React", "Python"]


async def test_register_student_accepts_empty_tag_arrays(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/register/student", json={**STUDENT, "skills": [], "technologies": []}
    )
    assert response.status_code == 201, response.text
    student = response.json()["user"]["student"]
    assert student["skills"] == []
    assert student["technologies"] == []


async def test_register_rejects_a_duplicate_email_whatever_its_case(
    client: AsyncClient, business: dict, db: AsyncSession
) -> None:
    response = await client.post(
        "/api/auth/register/business",
        json={**BUSINESS, "email": BUSINESS["email"].upper(), "companyName": "Дубль"},
    )
    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "EMAIL_TAKEN"
    assert error["message"] == messages.EMAIL_TAKEN
    assert "fields" not in error

    # The rejected attempt must leave nothing behind.
    assert await db.scalar(select(func.count()).select_from(User)) == 1
    assert await db.scalar(select(func.count()).select_from(Business)) == 1


async def test_a_duplicate_email_race_is_a_409_not_a_500(
    client: AsyncClient, business: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    """The pre-check is TOCTOU; the unique index is what actually decides."""
    from app.services import users as users_service

    async def no_user_found(*args: object, **kwargs: object) -> None:
        return None

    monkeypatch.setattr(users_service, "get_user_by_email", no_user_found)
    response = await client.post("/api/auth/register/business", json=BUSINESS)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "EMAIL_TAKEN"


async def test_the_password_is_hashed(client: AsyncClient, student: dict, db: AsyncSession) -> None:
    stored = await db.scalar(select(User.hashed_password))
    assert stored != STUDENT["password"]
    assert stored.startswith("$2b$10$")  # bcrypt, cost 10, as the spec requires
