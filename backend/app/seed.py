"""Load the demo dataset: `uv run python -m app.seed` (or `make seed`).

Delete-and-reload, so running it twice leaves exactly the same rows. Deleting the
users cascades to their profiles, tasks and saved tasks, which is why nothing else
has to be cleaned up by hand.
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import delete, func, select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Business, Student, Task, User

logger = logging.getLogger(__name__)

SEED_DIR = Path(__file__).resolve().parents[1] / "seed"
DEMO_PASSWORD = "demo2026"


def _load(name: str) -> list[dict[str, Any]]:
    return json.loads((SEED_DIR / f"{name}.json").read_text(encoding="utf-8"))


def _timestamp(value: str | None) -> datetime | None:
    """Fixed values from the JSON — never `now()`, so two runs agree."""
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


async def seed() -> tuple[int, int, int]:
    if settings.ENV == "prod":
        raise SystemExit("Refusing to seed: ENV=prod")

    businesses = _load("businesses")
    students = _load("students")
    tasks = _load("tasks")

    async with SessionLocal() as db:
        # Cascades to businesses, students, tasks and saved_tasks.
        await db.execute(delete(User))
        await db.flush()

        by_email: dict[str, Business] = {}
        for entry in businesses:
            user = User(
                email=entry["email"],
                hashed_password=hash_password(DEMO_PASSWORD),
                full_name=entry["contactName"],
                role="business",
                business=Business(
                    company_name=entry["companyName"],
                    contact_name=entry["contactName"],
                    contact_phone=entry["contactPhone"],
                ),
            )
            db.add(user)
            by_email[entry["email"]] = user.business

        for entry in students:
            db.add(
                User(
                    email=entry["email"],
                    hashed_password=hash_password(DEMO_PASSWORD),
                    full_name=entry["name"],
                    role="student",
                    student=Student(
                        name=entry["name"],
                        skills=entry["skills"],
                        technologies=entry["technologies"],
                    ),
                )
            )

        await db.flush()

        for entry in tasks:
            db.add(
                Task(
                    business_id=by_email[entry["businessEmail"]].id,
                    industry_code=entry["industryCode"],
                    status=entry["status"],
                    title=entry["title"],
                    context=entry["context"],
                    need=entry["need"],
                    target_users=entry["targetUsers"],
                    data_materials=entry["dataMaterials"],
                    constraints=entry["constraints"],
                    expected_result=entry["expectedResult"],
                    success_criteria=entry["successCriteria"],
                    contact=entry["contact"],
                    interaction_format=entry["interactionFormat"],
                    rating=entry["rating"],
                    responses_count=entry["responsesCount"],
                    published_at=_timestamp(entry["publishedAt"]),
                )
            )

        await db.commit()
        counts: list[int] = []
        for model in (Business, Student, Task):
            counts.append(await db.scalar(select(func.count()).select_from(model)) or 0)
    return counts[0], counts[1], counts[2]


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logger.info("Seeding %s", settings.DATABASE_URL)
    businesses, students, tasks = asyncio.run(seed())
    logger.info("Done: %d businesses, %d students, %d tasks", businesses, students, tasks)


if __name__ == "__main__":
    main()
