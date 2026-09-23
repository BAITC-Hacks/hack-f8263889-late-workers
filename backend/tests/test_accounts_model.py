"""Database-level guarantees behind the accounts contract."""

import pytest
from app.models import Business, Student, User
from httpx import AsyncClient
from sqlalchemy import func, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession


async def test_schema_has_users_businesses_and_students(db_engine: AsyncEngine) -> None:
    async with db_engine.connect() as conn:
        tables = await conn.run_sync(lambda sync: inspect(sync).get_table_names())
    assert {"users", "businesses", "students"} <= set(tables)


async def test_duplicate_email_violates_the_unique_constraint(db: AsyncSession) -> None:
    db.add_all(
        [
            User(email="dup@example.com", hashed_password="x", role="student"),
            User(email="dup@example.com", hashed_password="y", role="student"),
        ]
    )
    with pytest.raises(IntegrityError):
        await db.commit()
    await db.rollback()


async def test_deleting_a_user_deletes_its_business(
    client: AsyncClient, business: dict, db: AsyncSession
) -> None:
    # Raw SQL, so this proves the database's ON DELETE CASCADE rather than the ORM's.
    await db.execute(text("DELETE FROM users WHERE id = :id"), {"id": business["id"]})
    await db.commit()
    assert await db.scalar(select(func.count()).select_from(Business)) == 0


async def test_deleting_a_user_deletes_its_student(
    client: AsyncClient, student: dict, db: AsyncSession
) -> None:
    await db.execute(text("DELETE FROM users WHERE id = :id"), {"id": student["id"]})
    await db.commit()
    assert await db.scalar(select(func.count()).select_from(Student)) == 0


async def test_email_is_stored_lowercased_and_trimmed(
    client: AsyncClient, db: AsyncSession
) -> None:
    response = await client.post(
        "/api/auth/register/student",
        json={"email": "  ARMAN@Student.KZ  ", "password": "arman2026", "name": "Арман"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["user"]["email"] == "arman@student.kz"
    assert await db.scalar(select(User.email)) == "arman@student.kz"


async def test_tags_are_stored_as_a_list_not_null(client: AsyncClient, db: AsyncSession) -> None:
    response = await client.post(
        "/api/auth/register/student",
        json={"email": "no@tags.kz", "password": "arman2026", "name": "Арман"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["user"]["student"]["skills"] == []
    assert await db.scalar(select(Student.skills)) == []
