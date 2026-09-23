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
from app.models import Business, Milestone, Proposal, Student, Task, Team, TeamMember, User
from app.services.proposals import recalc_responses_count, recalc_team_points

logger = logging.getLogger(__name__)

SEED_DIR = Path(__file__).resolve().parents[1] / "seed"
DEMO_PASSWORD = "demo2026"


def _load(name: str) -> list[dict[str, Any]]:
    return json.loads((SEED_DIR / f"{name}.json").read_text(encoding="utf-8"))


def _timestamp(value: str | None) -> datetime | None:
    """Fixed values from the JSON — never `now()`, so two runs agree."""
    return datetime.fromisoformat(value.replace("Z", "+00:00")) if value else None


async def seed() -> tuple[int, int, int, int, int]:
    if settings.ENV == "prod":
        raise SystemExit("Refusing to seed: ENV=prod")

    businesses = _load("businesses")
    students = _load("students")
    tasks = _load("tasks")
    teams = _load("teams")
    proposals = _load("proposals")

    async with SessionLocal() as db:
        # Teams are not owned by a user, so deleting users does not reach them;
        # proposals go with either side.
        await db.execute(delete(Team))
        # Cascades to businesses, students, tasks, saved_tasks and proposals.
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

        students_by_email: dict[str, Student] = {}
        for entry in students:
            student = Student(
                name=entry["name"],
                skills=entry["skills"],
                technologies=entry["technologies"],
            )
            students_by_email[entry["email"]] = student
            db.add(
                User(
                    email=entry["email"],
                    hashed_password=hash_password(DEMO_PASSWORD),
                    full_name=entry["name"],
                    role="student",
                    student=student,
                )
            )

        await db.flush()

        tasks_by_title: dict[str, Task] = {}
        for entry in tasks:
            task = Task(
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
            tasks_by_title[entry["title"]] = task
            db.add(task)

        teams_by_name: dict[str, Team] = {}
        for entry in teams:
            team = Team(
                name=entry["name"],
                interests=entry["interests"],
                own_skills=entry["ownSkills"],
                own_technologies=entry["ownTechnologies"],
                created_at=_timestamp(entry["createdAt"]),
                members=[TeamMember(student=students_by_email[entry["captain"]], role="captain")]
                + [
                    TeamMember(student=students_by_email[email], role="member")
                    for email in entry["members"]
                ],
            )
            teams_by_name[entry["name"]] = team
            db.add(team)

        await db.flush()

        for entry in proposals:
            proposal = Proposal(
                task_id=tasks_by_title[entry["taskTitle"]].id,
                team_id=teams_by_name[entry["team"]].id,
                author_student_id=students_by_email[entry["author"]].id,
                idea=entry["idea"],
                plan=entry["plan"],
                duration_weeks=entry["durationWeeks"],
                prototype_url=entry["prototypeUrl"],
                status=entry["status"],
                business_comment=entry.get("businessComment"),
                created_at=_timestamp(entry["createdAt"]),
                decided_at=_timestamp(entry.get("decidedAt")),
                milestones=[
                    Milestone(
                        title=item["title"],
                        confirmed=item["confirmed"],
                        created_at=_timestamp(item["createdAt"]),
                        confirmed_at=_timestamp(item.get("confirmedAt")),
                    )
                    for item in entry.get("milestones", [])
                ],
            )
            db.add(proposal)

        await db.flush()
        # The JSON carries starting counters; make both match reality.
        for task in tasks_by_title.values():
            await recalc_responses_count(db, task.id)
        for team in teams_by_name.values():
            await recalc_team_points(db, team.id)

        await db.commit()
        counts: list[int] = []
        for model in (Business, Student, Task, Team, Proposal):
            counts.append(await db.scalar(select(func.count()).select_from(model)) or 0)
    return counts[0], counts[1], counts[2], counts[3], counts[4]


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logger.info("Seeding %s", settings.DATABASE_URL)
    businesses, students, tasks, teams, proposals = asyncio.run(seed())
    logger.info(
        "Done: %d businesses, %d students, %d tasks, %d teams, %d proposals",
        businesses,
        students,
        tasks,
        teams,
        proposals,
    )


if __name__ == "__main__":
    main()
