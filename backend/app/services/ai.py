"""OpenAI integration (Responses API): a non-streaming call and an SSE stream over one event loop.

Both endpoints consume the same streamed response, so long generations never hit HTTP timeouts.
Swap this module to change providers; the API layer only depends on `chat` and `chat_stream`.
"""

import json
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

import openai

from app.core.config import settings
from app.core.exceptions import AppError, RateLimitedError, UpstreamError
from app.schemas.ai import ChatRequest, ChatResponse, Usage

logger = logging.getLogger(__name__)

FINAL_EVENTS = {"response.completed", "response.incomplete", "response.failed"}

_client: openai.AsyncOpenAI | None = None


def get_client() -> openai.AsyncOpenAI:
    """Lazily create the shared async client. Tests monkeypatch this function."""
    global _client
    if _client is None:
        try:
            # None values let the SDK fall back to OPENAI_API_KEY / OPENAI_BASE_URL env vars.
            _client = openai.AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL
            )
        except openai.OpenAIError as exc:
            raise UpstreamError("AI provider is not configured (set OPENAI_API_KEY)") from exc
    return _client


def build_params(request: ChatRequest) -> dict[str, Any]:
    params: dict[str, Any] = {
        "model": settings.OPENAI_MODEL,
        "instructions": request.system or settings.AI_SYSTEM_PROMPT,
        "input": [message.model_dump() for message in request.messages],
        "max_output_tokens": request.max_tokens or settings.OPENAI_MAX_OUTPUT_TOKENS,
        "stream": True,
    }
    if settings.OPENAI_REASONING_EFFORT:
        params["reasoning"] = {"effort": settings.OPENAI_REASONING_EFFORT}
    return params


@dataclass
class Outcome:
    """What we learned from the stream besides the text: the final response and any refusal."""

    response: Any = None
    refusal: str = ""

    @property
    def stop_reason(self) -> str:
        details = self.response.incomplete_details
        if self.response.status == "incomplete" and details and details.reason:
            return details.reason
        return self.response.status or "completed"

    @property
    def usage(self) -> Usage:
        usage = self.response.usage
        return Usage(
            input_tokens=usage.input_tokens if usage else 0,
            output_tokens=usage.output_tokens if usage else 0,
        )


async def _stream_text(request: ChatRequest, outcome: Outcome) -> AsyncIterator[str]:
    """Yield text deltas; fill `outcome` with the final response. Raises AppError on failure."""
    client = get_client()
    stream = await client.responses.create(**build_params(request))
    async for event in stream:
        if event.type == "response.output_text.delta":
            yield event.delta
        elif event.type == "response.refusal.delta":
            outcome.refusal += event.delta
        elif event.type in FINAL_EVENTS:
            outcome.response = event.response
        elif event.type == "error":
            raise UpstreamError(f"AI provider error: {event.message}")
    if outcome.response is None:
        raise UpstreamError("AI provider stream ended without a final response")


def _refusal_from_output(response: Any) -> str:
    parts = (
        part
        for item in response.output
        if getattr(item, "type", None) == "message"
        for part in item.content
    )
    return "".join(part.refusal for part in parts if getattr(part, "type", None) == "refusal")


def _raise_for_outcome(outcome: Outcome) -> None:
    response = outcome.response
    if response.status == "failed":
        message = response.error.message if response.error else "unknown error"
        raise UpstreamError(f"AI provider failed: {message}")
    details = response.incomplete_details
    reason = details.reason if details else None
    refusal = outcome.refusal or _refusal_from_output(response)
    if refusal or reason == "content_filter":
        raise AppError(
            "The model declined this request",
            status_code=422,
            code="AI_REFUSAL",
            details={"reason": reason or "refusal", "refusal": refusal or None},
        )


def _translate_error(exc: openai.OpenAIError) -> AppError:
    if isinstance(exc, openai.AuthenticationError):
        return UpstreamError("AI provider rejected the API key (check OPENAI_API_KEY)")
    if isinstance(exc, openai.RateLimitError):
        return RateLimitedError("AI provider rate limit reached, retry later")
    if isinstance(exc, openai.BadRequestError):
        return AppError(f"AI provider rejected the request: {exc.message}", code="AI_BAD_REQUEST")
    if isinstance(exc, openai.APIStatusError):
        return UpstreamError(f"AI provider error ({exc.status_code})")
    if isinstance(exc, openai.APIConnectionError):
        return UpstreamError("Could not reach the AI provider")
    return UpstreamError(f"AI provider error: {exc}")


async def chat(request: ChatRequest) -> ChatResponse:
    outcome = Outcome()
    chunks: list[str] = []
    try:
        async for text in _stream_text(request, outcome):
            chunks.append(text)
    except openai.OpenAIError as exc:
        raise _translate_error(exc) from exc
    _raise_for_outcome(outcome)

    return ChatResponse(
        content="".join(chunks),
        model=outcome.response.model,
        stop_reason=outcome.stop_reason,
        usage=outcome.usage,
    )


def sse(event: str, data: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def chat_stream(request: ChatRequest) -> AsyncIterator[str]:
    """Yield Server-Sent Events: `delta` (text chunks), then `done` or `error`."""
    outcome = Outcome()
    try:
        async for text in _stream_text(request, outcome):
            yield sse("delta", {"text": text})
        _raise_for_outcome(outcome)
    except openai.OpenAIError as exc:
        error = _translate_error(exc)
        logger.warning("AI stream failed: %s", error.message)
        yield sse("error", {"code": error.code, "message": error.message})
        return
    except AppError as error:
        logger.warning("AI stream ended with error: %s", error.message)
        yield sse("error", {"code": error.code, "message": error.message, **(error.details or {})})
        return

    yield sse(
        "done",
        {
            "model": outcome.response.model,
            "stop_reason": outcome.stop_reason,
            "usage": outcome.usage.model_dump(),
        },
    )
