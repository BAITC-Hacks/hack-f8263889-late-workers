"""AI endpoints are tested against a fake OpenAI client - no network, no API key needed."""

from types import SimpleNamespace

import openai
from app.core.config import settings
from httpx import AsyncClient

from tests.fakes import fake_event, fake_response, text_events

PAYLOAD = {"messages": [{"role": "user", "content": "Hi"}]}


async def test_chat(client: AsyncClient, auth_headers: dict[str, str], fake_ai) -> None:
    fake = fake_ai(text_events(["Hel", "lo!"]))

    response = await client.post("/api/v1/ai/chat", json=PAYLOAD, headers=auth_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["content"] == "Hello!"
    assert body["stop_reason"] == "completed"
    assert body["usage"] == {"input_tokens": 10, "output_tokens": 5}

    params = fake.calls[0]
    assert params["model"] == settings.OPENAI_MODEL
    assert params["input"] == PAYLOAD["messages"]
    assert params["instructions"] == settings.AI_SYSTEM_PROMPT
    assert params["max_output_tokens"] == settings.OPENAI_MAX_OUTPUT_TOKENS
    assert params["stream"] is True
    assert "reasoning" not in params


async def test_chat_overrides(client: AsyncClient, auth_headers: dict[str, str], fake_ai) -> None:
    fake = fake_ai(text_events(["ok"]))
    payload = {**PAYLOAD, "system": "Be terse.", "max_tokens": 42}

    response = await client.post("/api/v1/ai/chat", json=payload, headers=auth_headers)
    assert response.status_code == 200
    assert fake.calls[0]["instructions"] == "Be terse."
    assert fake.calls[0]["max_output_tokens"] == 42


async def test_chat_refusal(client: AsyncClient, auth_headers: dict[str, str], fake_ai) -> None:
    fake_ai(
        [
            fake_event("response.refusal.delta", delta="I can't help with that."),
            fake_event("response.completed", response=fake_response(refusal="I can't help.")),
        ]
    )

    response = await client.post("/api/v1/ai/chat", json=PAYLOAD, headers=auth_headers)
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "AI_REFUSAL"
    assert error["details"]["refusal"] == "I can't help with that."


async def test_chat_content_filter(
    client: AsyncClient, auth_headers: dict[str, str], fake_ai
) -> None:
    final = fake_response(status="incomplete", reason="content_filter")
    fake_ai([fake_event("response.incomplete", response=final)])

    response = await client.post("/api/v1/ai/chat", json=PAYLOAD, headers=auth_headers)
    assert response.status_code == 422
    assert response.json()["error"]["details"]["reason"] == "content_filter"


async def test_chat_truncated_by_max_tokens(
    client: AsyncClient, auth_headers: dict[str, str], fake_ai
) -> None:
    final = fake_response(status="incomplete", reason="max_output_tokens")
    fake_ai(
        text_events(["partial"], final)[:-1] + [fake_event("response.incomplete", response=final)]
    )

    response = await client.post("/api/v1/ai/chat", json=PAYLOAD, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["content"] == "partial"
    assert response.json()["stop_reason"] == "max_output_tokens"


async def test_chat_provider_auth_error(
    client: AsyncClient, auth_headers: dict[str, str], fake_ai
) -> None:
    exc = openai.AuthenticationError(
        "bad key",
        response=SimpleNamespace(status_code=401, headers={}, request=None),  # type: ignore[arg-type]
        body=None,
    )
    fake_ai(error=exc)

    response = await client.post("/api/v1/ai/chat", json=PAYLOAD, headers=auth_headers)
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_ERROR"


async def test_chat_failed_response(
    client: AsyncClient, auth_headers: dict[str, str], fake_ai
) -> None:
    final = fake_response(status="failed", error="server exploded")
    fake_ai([fake_event("response.failed", response=final)])

    response = await client.post("/api/v1/ai/chat", json=PAYLOAD, headers=auth_headers)
    assert response.status_code == 502
    assert "server exploded" in response.json()["error"]["message"]


async def test_chat_stream(client: AsyncClient, auth_headers: dict[str, str], fake_ai) -> None:
    fake_ai(text_events(["Hel", "lo!"]))

    async with client.stream(
        "POST", "/api/v1/ai/chat/stream", json=PAYLOAD, headers=auth_headers
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        events = [line async for line in response.aiter_lines() if line]

    assert events[0] == "event: delta"
    assert events[1] == 'data: {"text": "Hel"}'
    assert "event: done" in events
    assert any('"stop_reason": "completed"' in line for line in events)


async def test_chat_stream_error_event(
    client: AsyncClient, auth_headers: dict[str, str], fake_ai
) -> None:
    fake_ai(
        [
            fake_event("response.output_text.delta", delta="Hel"),
            fake_event("error", code="server_error", message="boom"),
        ]
    )

    async with client.stream(
        "POST", "/api/v1/ai/chat/stream", json=PAYLOAD, headers=auth_headers
    ) as response:
        events = [line async for line in response.aiter_lines() if line]

    assert events[0] == "event: delta"
    assert events[2] == "event: error"
    assert '"code": "UPSTREAM_ERROR"' in events[3]
    assert "boom" in events[3]


async def test_chat_requires_auth(client: AsyncClient) -> None:
    response = await client.post("/api/v1/ai/chat", json=PAYLOAD)
    assert response.status_code == 401
