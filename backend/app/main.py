"""Application factory. Run with: uv run uvicorn app.main:app --reload"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.auth import router as accounts_router
from app.api.builder import router as builder_router
from app.api.catalog import (
    badges_router,
    business_router,
    industries_router,
    me_router,
    tasks_router,
)
from app.api.router import api_router
from app.api.selection import router as selection_router
from app.api.teams import proposals_router, student_router, teams_router
from app.api.v1.health import router as health_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestContextMiddleware
from app.core.redis import close_redis
from app.db.migrations import run_migrations
from app.db.session import engine
from app.services.ai import close_client, get_client

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("Starting %s v%s (env=%s)", settings.APP_NAME, settings.APP_VERSION, settings.ENV)
    if settings.ai_enabled:
        get_client()  # one shared client for the whole process
    else:
        logger.warning("OPENAI_API_KEY не задан, AI работает в резервном режиме")
    if settings.AUTO_MIGRATE:
        await run_migrations()
    yield
    await close_client()
    await close_redis()
    await engine.dispose()
    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    setup_logging(settings.LOG_LEVEL)

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
        swagger_ui_parameters={"persistAuthorization": True},
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(RequestContextMiddleware)

    register_exception_handlers(app)

    app.include_router(health_router)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)
    # The accounts contract is unversioned: /api/auth/*
    app.include_router(accounts_router, prefix=settings.API_PREFIX)
    for catalog_router in (
        industries_router,
        badges_router,
        tasks_router,
        me_router,
        business_router,
        builder_router,
        selection_router,
        teams_router,
        proposals_router,
        student_router,
    ):
        app.include_router(catalog_router, prefix=settings.API_PREFIX)

    @app.get("/", include_in_schema=False)
    async def root() -> RedirectResponse:
        return RedirectResponse(url="/docs")

    return app


app = create_app()
