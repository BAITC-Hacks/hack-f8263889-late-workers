"""Test doubles for the OpenAI client - no network, no API key needed."""

from collections.abc import AsyncIterator
from types import SimpleNamespace
from typing import Any


def fake_event(type_: str, **fields: Any) -> SimpleNamespace:
    return SimpleNamespace(type=type_, **fields)


def fake_response(
    *,
    status: str = "completed",
    reason: str | None = None,
    refusal: str | None = None,
    error: str | None = None,
    model: str = "gpt-5.5",
) -> SimpleNamespace:
    """Mimics the `Response` object carried by response.completed/incomplete/failed events."""
    part = (
        SimpleNamespace(type="refusal", refusal=refusal)
        if refusal
        else SimpleNamespace(type="output_text", text="")
    )
    return SimpleNamespace(
        model=model,
        status=status,
        incomplete_details=SimpleNamespace(reason=reason) if reason else None,
        error=SimpleNamespace(message=error) if error else None,
        output=[SimpleNamespace(type="message", content=[part])],
        usage=SimpleNamespace(input_tokens=10, output_tokens=5),
    )


def text_events(chunks: list[str], final: SimpleNamespace | None = None) -> list[SimpleNamespace]:
    """A normal run: text deltas followed by response.completed."""
    events = [fake_event("response.output_text.delta", delta=chunk) for chunk in chunks]
    events.append(fake_event("response.completed", response=final or fake_response()))
    return events


class FakeOpenAI:
    """Mimics `await AsyncOpenAI().responses.create(**params, stream=True)` and records calls."""

    def __init__(self, events: list[SimpleNamespace], error: Exception | None = None) -> None:
        self.calls: list[dict[str, Any]] = []
        self._events = events
        self._error = error
        self.responses = SimpleNamespace(create=self._create)

    async def _create(self, **params: Any) -> AsyncIterator[SimpleNamespace]:
        self.calls.append(params)
        if self._error:
            raise self._error
        return self._iterate()

    async def _iterate(self) -> AsyncIterator[SimpleNamespace]:
        for event in self._events:
            yield event
