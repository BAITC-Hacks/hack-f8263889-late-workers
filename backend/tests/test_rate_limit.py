"""Rate limiter test with an in-memory fake Redis (no server needed)."""

from app.core.config import settings
from app.core.redis import get_redis
from app.main import app
from httpx import AsyncClient


class FakeRedis:
    def __init__(self) -> None:
        self.counts: dict[str, int] = {}
        self.expirations: dict[str, int] = {}

    async def incr(self, key: str) -> int:
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    async def expire(self, key: str, seconds: int) -> None:
        self.expirations[key] = seconds


async def test_ai_rate_limit(client: AsyncClient, auth_headers: dict[str, str], fake_ai) -> None:
    fake_ai()
    fake_redis = FakeRedis()
    app.dependency_overrides[get_redis] = lambda: fake_redis
    limit = settings.AI_RATE_LIMIT_PER_MINUTE

    try:
        payload = {"messages": [{"role": "user", "content": "Hi"}]}
        statuses = [
            (await client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)).status_code
            for _ in range(limit + 2)
        ]
    finally:
        app.dependency_overrides.pop(get_redis, None)

    assert statuses[:limit] == [200] * limit
    assert statuses[limit:] == [429, 429]
    assert list(fake_redis.counts.keys()) == ["ratelimit:ai:user:1"]
    assert list(fake_redis.expirations.values()) == [60]


async def test_rate_limit_disabled_without_redis(
    client: AsyncClient, auth_headers: dict[str, str], fake_ai
) -> None:
    fake_ai()
    for _ in range(settings.AI_RATE_LIMIT_PER_MINUTE + 5):
        response = await client.post(
            "/api/v1/ai/chat",
            json={"messages": [{"role": "user", "content": "Hi"}]},
            headers=auth_headers,
        )
        assert response.status_code == 200
