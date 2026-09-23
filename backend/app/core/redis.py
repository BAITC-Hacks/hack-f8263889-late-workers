"""Optional shared Redis client. Everything degrades gracefully when REDIS_URL is unset."""

import logging

from redis.asyncio import Redis, from_url
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis: Redis | None = None


def get_redis() -> Redis | None:
    """FastAPI dependency. Returns None when Redis is not configured."""
    global _redis
    if _redis is None and settings.REDIS_URL:
        _redis = from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def redis_status() -> str:
    redis = get_redis()
    if redis is None:
        return "disabled"
    try:
        await redis.ping()
        return "ok"
    except (RedisError, OSError) as exc:
        logger.warning("Redis ping failed: %s", exc)
        return "error"


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
