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
from datetime import UTC, datetime

import app.models  # noqa: F401
import pytest
from app.core.catalog import INDUSTRIES
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Business, Task, User
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

_TABLES = (
    "users, businesses, students, notes, tasks, saved_tasks, "
    "clarification_rounds, round_questions, ai_calls"
)


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


# --- Catalogue fixtures -------------------------------------------------------

# The catalogue's owner is created straight in the database, never over HTTP:
# registering would set an auth cookie and overwrite the session the test is
# actually using (httpx keeps one cookie jar per client).
CATALOGUE_OWNER = {"email": "catalog@zerno.kz", "password": "catalog2026"}


def make_task(business_id: int, **overrides: object) -> Task:
    """A published, catalogue-visible task unless the test says otherwise."""
    defaults: dict = {
        "business_id": business_id,
        "industry_code": "horeca",
        "status": "published",
        "title": "Прогноз спроса на выпечку",
        "need": "Каждый день списываем до 15% выпечки.",
        "rating": 78,
        "responses_count": 3,
        "published_at": datetime(2026, 9, 20, 10, 0, tzinfo=UTC),
    }
    return Task(**{**defaults, **overrides})


@pytest.fixture
async def catalogue_owner(db: AsyncSession) -> Business:
    owner = User(
        email=CATALOGUE_OWNER["email"],
        hashed_password=hash_password(CATALOGUE_OWNER["password"]),
        role="business",
        business=Business(
            company_name="Кофейня «Зерно»",
            contact_name="Айгерим Нурланова",
            contact_phone="+77011234567",
        ),
    )
    db.add(owner)
    await db.commit()
    await db.refresh(owner)
    return owner.business


@pytest.fixture
async def catalogue(catalogue_owner: Business, db: AsyncSession) -> list[Task]:
    """Six catalogue tasks covering all four levels, plus a draft that must stay hidden."""
    owner_id = catalogue_owner.id
    tasks = [
        make_task(
            owner_id,
            rating=92,
            industry_code="retail",
            title="Лояльность",
            published_at=datetime(2026, 9, 21, 9, 30, tzinfo=UTC),
            responses_count=6,
        ),
        make_task(
            owner_id,
            rating=78,
            industry_code="horeca",
            title="Выпечка",
            published_at=datetime(2026, 9, 20, 10, 0, tzinfo=UTC),
            responses_count=3,
        ),
        make_task(
            owner_id,
            rating=70,
            industry_code="it",
            title="Карты пациентов",
            published_at=datetime(2026, 9, 19, 14, 15, tzinfo=UTC),
            responses_count=2,
        ),
        make_task(
            owner_id,
            rating=64,
            industry_code="healthcare",
            title="Напоминания",
            status="in_progress",
            published_at=None,
            responses_count=4,
        ),
        make_task(
            owner_id,
            rating=55,
            industry_code="logistics",
            title="Маршруты",
            published_at=datetime(2026, 9, 18, 12, 0, tzinfo=UTC),
            responses_count=1,
        ),
        make_task(
            owner_id,
            rating=35,
            industry_code="education",
            title="Обучение",
            published_at=datetime(2026, 9, 15, 8, 0, tzinfo=UTC),
            responses_count=0,
        ),
        make_task(
            owner_id,
            rating=0,
            industry_code="other",
            title="Черновик",
            status="draft",
            published_at=None,
            responses_count=0,
            need="Только need.",
        ),
    ]
    db.add_all(tasks)
    await db.commit()
    for task in tasks:
        await db.refresh(task)
    return tasks


@pytest.fixture
async def owner_client(client: AsyncClient, catalogue: list[Task]) -> AsyncClient:
    """The signed-in owner of the catalogue's tasks."""
    response = await client.post("/api/auth/login", json=CATALOGUE_OWNER)
    assert response.status_code == 200, response.text
    return client


# --- Card builder fixtures ----------------------------------------------------

DRAFT_TEXT = (
    "У нас 4 кофейни в Астане, выпечку печём сами каждое утро. "
    "Каждый день списываем до 15% выпечки, хотим понимать, сколько печь на завтра."
)


@pytest.fixture(autouse=True)
def journal_session(
    session_factory: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Point the AI journal at the test engine.

    The journal deliberately opens its own session on the module-level engine, which
    binds to the first event loop it sees — and pytest-asyncio gives every test a
    fresh one, so the second test would fail with "attached to a different loop".
    """
    import app.db.session as db_session
    from app.services import ai_client

    monkeypatch.setattr(db_session, "SessionLocal", session_factory)
    monkeypatch.setattr(ai_client, "SessionLocal", session_factory)


@pytest.fixture
def ai_off(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every AI call fails, so the builder must take the fallback path."""
    from app.services import builder_ai
    from app.services.ai_client import AIUnavailable

    async def unavailable(**_: object):
        raise AIUnavailable("test: AI disabled")

    monkeypatch.setattr(builder_ai, "call_structured", unavailable)


@pytest.fixture
def ai_answers(monkeypatch: pytest.MonkeyPatch):
    """Install canned model answers, keyed by operation."""
    from app.services import builder_ai
    from app.services.ai_client import AIUnavailable

    calls: list[str] = []

    def install(**answers: object):
        async def fake(*, operation: str, validate=None, user_payload=None, **_: object):
            calls.append(operation)
            answer = answers.get(operation)
            if answer is None:
                raise AIUnavailable(f"test: no canned answer for {operation}")
            # A callable answer is built from the payload — `assess` must reply about
            # exactly the blocks it was asked about, and that set varies per test.
            if callable(answer):
                answer = answer(user_payload or {})
            if validate is not None:
                validate(answer)
            return answer

        monkeypatch.setattr(builder_ai, "call_structured", fake)
        return calls

    return install


@pytest.fixture
async def draft(client: AsyncClient, business: dict) -> dict:
    response = await client.post(
        "/api/business/tasks", json={"draftText": DRAFT_TEXT, "industryCode": "horeca"}
    )
    assert response.status_code == 201, response.text
    return response.json()["task"]
