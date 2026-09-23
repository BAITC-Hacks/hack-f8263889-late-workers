from typing import Any

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import settings
from app.core.redis import redis_status

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: DbSession) -> dict[str, Any]:
    try:
        await db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:  # noqa: BLE001 - report, don't crash the probe
        database = "error"
    return {
        "status": "ok" if database == "ok" else "degraded",
        "version": settings.APP_VERSION,
        "env": settings.ENV,
        "database": database,
        "redis": await redis_status(),
    }
