# ruff: noqa: E402  (env vars must be set before the app is imported)
import os

# Tests run against Postgres in Docker (`make infra` + `make test-db`), the same
# engine production uses, so JSONB, timestamptz, real CASCADE and real UNIQUE
# behaviour are what the suite actually exercises.
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5439/app_test"
)

os.environ.update(
    ENV="test",
    SECRET_KEY="test-secret-that-is-at-least-32-bytes-long!",
    AUTO_MIGRATE="false",
    OPENAI_API_KEY="test-key",
    DATABASE_URL=TEST_DATABASE_URL,
    # Empty string (not pop): an env var overrides .env, a missing one does not.
    REDIS_URL="",
)

import asyncio
from collections.abc import AsyncIterator, Callable

import app.models  # noqa: F401
import pytest
from app.core.catalog import INDUSTRIES
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

BUSINESS = {
    "email": "owner@zerno.kz",
    "password": "coffee2026",
    "companyName": "Кофейня «Зерно»",
    "contactName": "Айгерим Нурланова",
    "contactPhone": "+77011234567",
}
STUDENT = {
    "email": "arman@student.kz",
    "password": "arman2026",
    "name": "Арман Сейтказы",
    "skills": ["Анализ данных", "Дизайн интерфейсов"],
    "technologies": ["Python", "React"],
}

_TABLES = "users, businesses, students, notes, tasks, saved_tasks"


@pytest.fixture(scope="session", autouse=True)
def _database_schema() -> None:
    """Build the schema once per session.

    Synchronous on purpose: pytest-asyncio gives each test its own event loop, so a
    session-scoped *async* fixture would pin an asyncpg connection to a loop that is
    already closed by the time the second test runs.
    """

    async def build() -> None:
        engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
        async with engine.begin() as conn:
            await conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
            await conn.execute(text("CREATE SCHEMA public"))
            await conn.run_sync(Base.metadata.create_all)
            # The migration seeds `industries`, but this bootstrap uses create_all,
            # so the reference rows have to be inserted from the same constant.
            await conn.execute(
                text("INSERT INTO industries (code, name) VALUES (:code, :name)"),
                [{"code": code, "name": name} for code, name in INDUSTRIES],
            )
        await engine.dispose()

    asyncio.run(build())


@pytest.fixture
async def db_engine() -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        # RESTART IDENTITY so ids start at 1 and tests can assert the contract's examples.
        await conn.execute(text(f"TRUNCATE {_TABLES} RESTART IDENTITY CASCADE"))
    yield engine
    await engine.dispose()


@pytest.fixture
def session_factory(db_engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(db_engine, expire_on_commit=False)


@pytest.fixture
async def db(session_factory: async_sessionmaker[AsyncSession]) -> AsyncIterator[AsyncSession]:
    """Direct session, for assertions the HTTP surface can't make (cascade, stored values)."""
    async with session_factory() as session:
        yield session


@pytest.fixture
def client_factory(
    session_factory: async_sessionmaker[AsyncSession],
) -> Callable[[], AsyncClient]:
    """Build independent clients: httpx keeps one cookie jar per client, so a test
    that needs a business session *and* a student session needs two of them."""

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return lambda: AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.fixture
async def client(client_factory: Callable[[], AsyncClient]) -> AsyncIterator[AsyncClient]:
    async with client_factory() as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
async def raising_client(
    client_factory: Callable[[], AsyncClient],
) -> AsyncIterator[AsyncClient]:
    """Lets an unhandled exception become a 500 response instead of propagating,
    which is the only way to assert the shape of the 500 body."""
    async with AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test"
    ) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
async def business(client: AsyncClient) -> dict:
    response = await client.post("/api/auth/register/business", json=BUSINESS)
    assert response.status_code == 201, response.text
    return response.json()["user"]


@pytest.fixture
async def student(client: AsyncClient) -> dict:
    response = await client.post("/api/auth/register/student", json=STUDENT)
    assert response.status_code == 201, response.text
    return response.json()["user"]


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """A bearer header for the legacy /api/v1 endpoints.

    The token is lifted out of the auth cookie, so every notes/ai test also proves
    that a cookie token works as a bearer token.
    """
    response = await client.post("/api/auth/register/student", json=STUDENT)
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.cookies['access_token']}"}


@pytest.fixture
def fake_ai(monkeypatch: pytest.MonkeyPatch):
    """Install a fake OpenAI client: `fake_ai(text_events(["Hi"]))` or `fake_ai(error=exc)`."""
    from app.services import ai as ai_service

    from tests.fakes import FakeOpenAI, text_events

    def install(events=None, *, error: Exception | None = None) -> FakeOpenAI:
        client = FakeOpenAI(events if events is not None else text_events([]), error=error)
        monkeypatch.setattr(ai_service, "get_client", lambda: client)
        return client

    return install
