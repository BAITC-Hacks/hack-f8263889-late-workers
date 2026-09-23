"""The AI client's own guarantees: cache, hourly limit, journal, one retry."""

from types import SimpleNamespace
from typing import Any

import pytest
from app.core.config import settings
from app.models import AiCall
from app.services import ai_client
from app.services.ai_client import AIResponseInvalid, AIUnavailable, call_structured
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class Probe(BaseModel):
    ok: bool


def fake_response(parsed: Any, *, status: str = "completed", refusal: str | None = None):
    """Mimic what openai's responses.parse returns, including its awkward parts."""
    content = (
        [SimpleNamespace(type="refusal", refusal=refusal)]
        if refusal
        else [SimpleNamespace(type="output_text", parsed=parsed)]
    )
    return SimpleNamespace(
        output=[SimpleNamespace(type="message", content=content)],
        output_parsed=None if refusal else parsed,
        output_text="" if refusal else parsed.model_dump_json(),
        status=status,
        incomplete_details=SimpleNamespace(reason="max_output_tokens"),
        usage=SimpleNamespace(input_tokens=11, output_tokens=7),
    )


class FakeOpenAI:
    def __init__(self, *responses: Any) -> None:
        self.responses_queue = list(responses)
        self.calls = 0
        self.responses = SimpleNamespace(parse=self._parse)

    async def _parse(self, **_: Any) -> Any:
        self.calls += 1
        answer = self.responses_queue.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


class FakeRedis:
    def __init__(self) -> None:
        self.store: dict[str, str] = {}
        self.counts: dict[str, int] = {}

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> None:
        self.store[key] = value

    async def incr(self, key: str) -> int:
        self.counts[key] = self.counts.get(key, 0) + 1
        return self.counts[key]

    async def expire(self, key: str, seconds: int) -> None:
        return None


@pytest.fixture
def ai(monkeypatch: pytest.MonkeyPatch):
    """Install a fake OpenAI and a fake Redis; return both for assertions."""
    redis = FakeRedis()
    monkeypatch.setattr(ai_client, "get_redis", lambda: redis)

    def install(*responses: Any) -> tuple[FakeOpenAI, FakeRedis]:
        client = FakeOpenAI(*responses)
        monkeypatch.setattr(ai_client, "get_client", lambda: client)
        return client, redis

    return install


async def journal(db: AsyncSession) -> list[AiCall]:
    return list(await db.scalars(select(AiCall).order_by(AiCall.id)))


async def call(**overrides: Any) -> Probe:
    params: dict[str, Any] = {
        "operation": "analyze",
        "prompt_version": "test-v1",
        "system_prompt": "system",
        "user_payload": {"q": 1},
        "response_model": Probe,
        "business_id": 1,
    }
    params.update(overrides)
    return await call_structured(**params)


async def test_a_valid_answer_is_journalled_with_its_tokens(ai, db: AsyncSession) -> None:
    ai(fake_response(Probe(ok=True)))
    assert (await call()).ok is True

    entries = await journal(db)
    assert [entry.status for entry in entries] == ["ok"]
    assert entries[0].prompt_tokens == 11
    assert entries[0].completion_tokens == 7


async def test_the_second_identical_call_is_served_from_cache(ai, db: AsyncSession) -> None:
    client, _ = ai(fake_response(Probe(ok=True)))
    await call()
    await call()

    assert client.calls == 1  # the model was asked once
    assert [entry.status for entry in await journal(db)] == ["ok", "cache"]


async def test_an_invalid_answer_is_retried_once_then_gives_up(ai, db: AsyncSession) -> None:
    ai(fake_response(Probe(ok=False)), fake_response(Probe(ok=False)))

    def reject(_: Probe) -> None:
        raise AIResponseInvalid("нужен ok=true")

    with pytest.raises(AIUnavailable):
        await call(validate=reject)

    assert [entry.status for entry in await journal(db)] == ["invalid", "invalid"]


async def test_a_retry_can_succeed(ai, db: AsyncSession) -> None:
    client, _ = ai(fake_response(Probe(ok=False)), fake_response(Probe(ok=True)))

    def require_ok(probe: Probe) -> None:
        if not probe.ok:
            raise AIResponseInvalid("нужен ok=true")

    assert (await call(validate=require_ok)).ok is True
    assert client.calls == 2
    assert [entry.status for entry in await journal(db)] == ["invalid", "ok"]


async def test_the_hourly_limit_stops_the_call(ai, db: AsyncSession) -> None:
    client, _ = ai(*[fake_response(Probe(ok=True)) for _ in range(40)])
    limit = settings.AI_HOURLY_LIMIT_PER_BUSINESS

    # Vary the payload so nothing is served from the cache.
    for index in range(limit):
        await call(user_payload={"q": index})
    calls_before = client.calls

    with pytest.raises(AIUnavailable):
        await call(user_payload={"q": limit})

    assert client.calls == calls_before  # the model was never asked again
    assert (await journal(db))[-1].status == "rate_limited"


async def test_a_refusal_is_unavailable_not_a_crash(ai, db: AsyncSession) -> None:
    ai(fake_response(Probe(ok=True), refusal="Не могу помочь"))
    with pytest.raises(AIUnavailable):
        await call()
    entry = (await journal(db))[-1]
    assert entry.status == "error"
    assert "refusal" in (entry.error or "")


async def test_a_truncated_answer_is_unavailable(ai, db: AsyncSession) -> None:
    ai(fake_response(Probe(ok=True), status="incomplete"))
    with pytest.raises(AIUnavailable):
        await call()
    assert "max_output_tokens" in ((await journal(db))[-1].error or "")


async def test_without_a_key_nothing_is_called(ai, db: AsyncSession, monkeypatch) -> None:
    client, _ = ai(fake_response(Probe(ok=True)))
    monkeypatch.setattr(type(settings), "ai_enabled", property(lambda _: False))

    with pytest.raises(AIUnavailable):
        await call()
    assert client.calls == 0
    assert (await journal(db))[-1].status == "error"
