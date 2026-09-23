"""Fixed-window rate limiter backed by Redis. No-op when Redis is not configured."""

import logging
from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Depends, Request
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.api.deps import OptionalUser
from app.core.exceptions import RateLimitedError
from app.core.redis import get_redis

logger = logging.getLogger(__name__)


def rate_limit(times: int, seconds: int, scope: str) -> Callable[..., Awaitable[None]]:
    """Allow `times` requests per `seconds` per user (or per client IP when anonymous).

    Usage: `router = APIRouter(dependencies=[Depends(rate_limit(20, 60, "ai"))])`
    """

    async def dependency(
        request: Request,
        user: OptionalUser,
        redis: Annotated[Redis | None, Depends(get_redis)],
    ) -> None:
        if redis is None:
            return
        client_ip = request.client.host if request.client else "unknown"
        identity = f"user:{user.id}" if user else f"ip:{client_ip}"
        key = f"ratelimit:{scope}:{identity}"
        try:
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, seconds)
        except (RedisError, OSError) as exc:
            logger.warning("Rate limiter unavailable, allowing request: %s", exc)
            return
        if count > times:
            raise RateLimitedError(
                f"Rate limit exceeded: {times} requests per {seconds}s",
                headers={"Retry-After": str(seconds)},
            )

    return dependency
