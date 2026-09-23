# ruff: noqa: E402  (env vars must be set before the app is imported)
import os

os.environ.update(
    ENV="test",
    SECRET_KEY="test-secret-that-is-at-least-32-bytes-long!",
    AUTO_MIGRATE="false",
    OPENAI_API_KEY="test-key",
    DATABASE_URL="sqlite+aiosqlite://",
    # Empty string (not pop): an env var overrides .env, a missing one does not.
    REDIS_URL="",
)

from collections.abc import AsyncIterator

import app.models  # noqa: F401
import pytest
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

USER = {"email": "alice@example.com", "password": "password123", "full_name": "Alice"}


@pytest.fixture
async def db_engine() -> AsyncIterator[AsyncEngine]:
    engine = create_async_engine(
        "sqlite+aiosqlite://", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def client(db_engine: AsyncEngine) -> AsyncIterator[AsyncClient]:
    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    response = await client.post("/api/v1/auth/register", json=USER)
    assert response.status_code == 201, response.text
    response = await client.post(
        "/api/v1/auth/login", data={"username": USER["email"], "password": USER["password"]}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


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
