"""The single entry point for structured AI calls: cache, limit, journal, retry.

Everything here is best-effort by design. When anything goes wrong — no key, a
timeout, a refusal, a schema violation twice in a row, the hourly limit — the caller
gets `AIUnavailable` and switches to the deterministic fallback. No AI failure ever
reaches the HTTP layer.
"""

import hashlib
import json
import logging
import time
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import openai
from pydantic import BaseModel, ValidationError
from redis.exceptions import RedisError

from app.core.config import settings
from app.core.redis import get_redis
from app.db.session import SessionLocal
from app.models import AiCall
from app.services.ai import get_client

logger = logging.getLogger(__name__)

RETRY_HINT = "Предыдущий ответ не прошёл проверку: {error}. Верни ответ строго по схеме."


class AIUnavailable(Exception):
    """Internal signal: fall back. Never surfaced to the API."""


class AIResponseInvalid(Exception):
    """A structurally valid answer that breaks a business rule."""


def _cache_key(operation: str, prompt_version: str, system_prompt: str, payload: str) -> str:
    digest = hashlib.sha256(f"{settings.OPENAI_MODEL}{system_prompt}{payload}".encode()).hexdigest()
    return f"ai:{operation}:{prompt_version}:{digest}"


def _limit_key(business_id: int) -> str:
    return f"ai:rl:{business_id}:{datetime.now(UTC):%Y%m%d%H}"


async def _journal(
    *,
    task_id: int | None,
    operation: str,
    prompt_version: str,
    input_payload: dict[str, Any],
    raw_output: str | None,
    status: str,
    error: str | None,
    latency_ms: int,
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
) -> None:
    """Record one attempt in its own session.

    Deliberately not the caller's session: rolling back the task transaction must not
    erase the evidence of what the model was asked and what it replied.
    """
    try:
        async with SessionLocal() as db:
            db.add(
                AiCall(
                    task_id=task_id,
                    operation=operation,
                    prompt_version=prompt_version,
                    model=settings.OPENAI_MODEL,
                    input=input_payload,
                    raw_output=raw_output,
                    status=status,
                    error=error,
                    latency_ms=latency_ms,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                )
            )
            await db.commit()
    except Exception as exc:  # noqa: BLE001 — journalling must never break the request
        logger.warning("Could not journal the AI call: %s", exc)


async def _cache_get(key: str) -> str | None:
    redis = get_redis()
    if redis is None:
        return None
    try:
        return await redis.get(key)
    except (RedisError, OSError) as exc:
        logger.warning("AI cache unavailable: %s", exc)
        return None


async def _cache_set(key: str, value: str) -> None:
    redis = get_redis()
    if redis is None:
        return
    try:
        await redis.set(key, value, ex=settings.AI_CACHE_TTL_SECONDS)
    except (RedisError, OSError) as exc:
        logger.warning("Could not write the AI cache: %s", exc)


async def _over_limit(business_id: int) -> bool:
    """Fixed hourly window per business. Without Redis there is no limit."""
    redis = get_redis()
    if redis is None:
        return False
    key = _limit_key(business_id)
    try:
        used = await redis.incr(key)
        if used == 1:
            await redis.expire(key, 3600)
    except (RedisError, OSError) as exc:
        logger.warning("AI rate limiter unavailable, allowing the call: %s", exc)
        return False
    return used > settings.AI_HOURLY_LIMIT_PER_BUSINESS


def _refusal(response: Any) -> str:
    """responses.parse never raises on a refusal — it arrives as an output item."""
    parts = (
        part
        for item in response.output
        if getattr(item, "type", None) == "message"
        for part in item.content
    )
    return "".join(part.refusal for part in parts if getattr(part, "type", None) == "refusal")


def _usage(response: Any) -> tuple[int, int]:
    """Responses API reports input/output tokens, not prompt/completion."""
    usage = getattr(response, "usage", None)
    if usage is None:
        return 0, 0
    return usage.input_tokens or 0, usage.output_tokens or 0


async def call_structured[T: BaseModel](
    *,
    operation: str,
    prompt_version: str,
    system_prompt: str,
    user_payload: dict[str, Any],
    response_model: type[T],
    validate: Callable[[T], None] | None = None,
    task_id: int | None = None,
    business_id: int,
) -> T:
    """Ask the model for a schema-validated answer, or raise `AIUnavailable`."""
    payload = json.dumps(user_payload, ensure_ascii=False, sort_keys=True)
    journal = {
        "task_id": task_id,
        "operation": operation,
        "prompt_version": prompt_version,
        "input_payload": user_payload,
    }

    if not settings.ai_enabled:
        await _journal(
            **journal,
            raw_output=None,
            status="error",
            error="OPENAI_API_KEY не задан",
            latency_ms=0,
        )
        raise AIUnavailable("AI is not configured")

    key = _cache_key(operation, prompt_version, system_prompt, payload)
    cached = await _cache_get(key)
    if cached is not None:
        try:
            parsed = response_model.model_validate_json(cached)
        except ValidationError:
            logger.warning("Stale AI cache entry for %s, ignoring it", key)
        else:
            await _journal(**journal, raw_output=cached, status="cache", error=None, latency_ms=0)
            return parsed

    if await _over_limit(business_id):
        await _journal(
            **journal,
            raw_output=None,
            status="rate_limited",
            error="Часовой лимит вызовов AI исчерпан",
            latency_ms=0,
        )
        raise AIUnavailable("hourly AI limit reached")

    client = get_client()
    instructions = system_prompt

    # One retry, and only for an answer that parsed but broke a rule: a schema the
    # model can still satisfy if told what was wrong.
    for attempt in (1, 2):
        started = time.perf_counter()
        raw: str | None = None
        try:
            response = await client.responses.parse(
                model=settings.OPENAI_MODEL,
                instructions=instructions,
                input=[{"role": "user", "content": payload}],
                text_format=response_model,
                max_output_tokens=settings.OPENAI_MAX_OUTPUT_TOKENS,
            )
        except openai.OpenAIError as exc:
            await _journal(
                **journal,
                raw_output=None,
                status="error",
                error=f"{type(exc).__name__}: {exc}",
                latency_ms=int((time.perf_counter() - started) * 1000),
            )
            raise AIUnavailable(str(exc)) from exc

        latency_ms = int((time.perf_counter() - started) * 1000)
        prompt_tokens, completion_tokens = _usage(response)
        raw = response.output_text or None
        tokens = {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens}

        refusal = _refusal(response)
        if refusal:
            await _journal(
                **journal,
                raw_output=raw,
                status="error",
                error=f"refusal: {refusal}",
                latency_ms=latency_ms,
                **tokens,
            )
            raise AIUnavailable("the model refused")

        if response.status in {"incomplete", "failed"}:
            details = getattr(response, "incomplete_details", None)
            reason = getattr(details, "reason", None) or response.status
            await _journal(
                **journal,
                raw_output=raw,
                status="error",
                error=f"response {reason}",
                latency_ms=latency_ms,
                **tokens,
            )
            raise AIUnavailable(f"response {reason}")

        parsed = response.output_parsed
        if parsed is None:
            await _journal(
                **journal,
                raw_output=raw,
                status="invalid",
                error="no parsed output",
                latency_ms=latency_ms,
                **tokens,
            )
            raise AIUnavailable("no parsed output")

        try:
            if validate is not None:
                validate(parsed)
        except (AIResponseInvalid, ValidationError, ValueError) as exc:
            await _journal(
                **journal,
                raw_output=raw,
                status="invalid",
                error=str(exc),
                latency_ms=latency_ms,
                **tokens,
            )
            if attempt == 2:
                raise AIUnavailable(f"invalid answer twice: {exc}") from exc
            instructions = f"{system_prompt}\n\n{RETRY_HINT.format(error=exc)}"
            continue

        await _journal(
            **journal,
            raw_output=raw,
            status="ok",
            error=None,
            latency_ms=latency_ms,
            **tokens,
        )
        await _cache_set(key, parsed.model_dump_json())
        return parsed

    raise AIUnavailable("unreachable")
