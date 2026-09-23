"""Run Alembic migrations programmatically (used on startup when AUTO_MIGRATE=true)."""

import asyncio
import logging
from pathlib import Path

from alembic import command
from alembic.config import Config

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _upgrade_head() -> None:
    cfg = Config(str(PROJECT_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(PROJECT_ROOT / "alembic"))
    command.upgrade(cfg, "head")


async def run_migrations() -> None:
    """Alembic's async env uses `asyncio.run`, so run it in a thread without a loop."""
    logger.info("Applying database migrations")
    await asyncio.to_thread(_upgrade_head)
