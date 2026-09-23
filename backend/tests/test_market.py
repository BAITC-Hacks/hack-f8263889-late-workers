"""The market indicator."""

from datetime import UTC, datetime, timedelta

import pytest
from app.models import Proposal, SavedTask, Student, Task, TaskView, Team, TeamMember
from app.services.market import median
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import CATALOGUE_OWNER, make_task

NOW = datetime(2026, 9, 23, 12, 0, tzinfo=UTC)


async def _student_rows(db: AsyncSession, count: int) -> list[Student]:
    from app.core.security import hash_password
    from app.models import User

    students = []
    for index in range(count):
        user = User(
            email=f"viewer{index}@student.kz",
            hashed_password=hash_password("viewer2026"),
            role="student",
            student=Student(name=f"Зритель {index}", skills=[], technologies=[]),
        )
        db.add(user)
        students.append(user.student)
    await db.flush()
    return students


async def _add_views(
    db: AsyncSession, task: Task, students: list[Student], *, at: datetime
) -> None:
    for student in students:
        db.add(TaskView(task_id=task.id, student_id=student.id, first_viewed_at=at))


@pytest.fixture
async def business_client(client: AsyncClient, catalogue: list[Task]) -> AsyncClient:
    response = await client.post("/api/auth/login", json=CATALOGUE_OWNER)
    assert response.status_code == 200, response.text
    return client


async def test_the_contract_numbers(
    business_client: AsyncClient, catalogue: list[Task], db: AsyncSession
) -> None:
    """24 views and 3 responses give conversion 13 — the contract's own example."""
    task = next(t for t in catalogue if t.status == "published")
    task.responses_count = 3
    students = await _student_rows(db, 24)
    await _add_views(db, task, students, at=NOW)
    for student in students[:6]:
        db.add(SavedTask(task_id=task.id, student_id=student.id))
    await db.commit()

    market = (await business_client.get(f"/api/business/tasks/{task.id}/market")).json()["market"]
    assert market["views"] == 24
    assert market["saves"] == 6
    assert market["responses"] == 3
    assert market["conversion"] == 13


async def test_no_views_means_no_conversion(
    business_client: AsyncClient, catalogue: list[Task]
) -> None:
    task = next(t for t in catalogue if t.status == "published")
    market = (await business_client.get(f"/api/business/tasks/{task.id}/market")).json()["market"]
    assert market["views"] == 0
    assert market["conversion"] is None
    assert market["hint"] is None


async def test_the_hint_points_at_the_weakest_block(
    business_client: AsyncClient, catalogue: list[Task], db: AsyncSession
) -> None:
    task = next(t for t in catalogue if t.status == "published")
    task.responses_count = 1  # conversion 10
    task.confirmed_at = NOW - timedelta(days=2)
    task.rating_breakdown = [
        {
            "block": "context_need",
            "name": "Контекст и потребность",
            "quality": {"code": "specific", "name": "Конкретно"},
            "points": 20,
            "maxPoints": 20,
            "reason": "",
            "mode": "ai",
            "textHash": "x",
        },
        {
            "block": "users",
            "name": "Пользователи",
            "quality": {"code": "missing", "name": "Пусто"},
            "points": 0,
            "maxPoints": 10,
            "reason": "",
            "mode": "ai",
            "textHash": "x",
        },
        {
            "block": "data",
            "name": "Данные и материалы",
            "quality": {"code": "missing", "name": "Пусто"},
            "points": 0,
            "maxPoints": 20,
            "reason": "",
            "mode": "ai",
            "textHash": "x",
        },
    ]
    students = await _student_rows(db, 12)
    await _add_views(db, task, students[:10], at=NOW)

    # Two industry peers with views and high conversion set the median above 10.
    peers = [
        make_task(
            task.business_id,
            rating=50,
            industry_code=task.industry_code,
            title=f"Аналог {index}",
            responses_count=2,
        )
        for index in range(2)
    ]
    db.add_all(peers)
    await db.flush()
    for peer in peers:
        await _add_views(db, peer, students[10:12], at=NOW)
    await db.commit()

    market = (await business_client.get(f"/api/business/tasks/{task.id}/market")).json()["market"]
    assert market["conversion"] == 10
    assert market["industryMedianConversion"] == 100  # both peers: 2 responses / 2 views
    assert market["industryMedianResponses"] == 2
    # Ties on points share go to the heavier block: data (0/20) beats users (0/10).
    assert market["hint"] == {"block": "data", "name": "Данные и материалы"}


async def test_median_of_an_even_set_keeps_one_decimal() -> None:
    assert median([1, 2]) == 1.5
    assert median([2, 2]) == 2
    assert median([]) is None


async def test_since_update_cuts_by_confirmation_and_skips_withdrawn(
    business_client: AsyncClient, catalogue: list[Task], db: AsyncSession, teammate: Student
) -> None:
    task = next(t for t in catalogue if t.status == "published")
    task.confirmed_at = NOW
    students = await _student_rows(db, 3)
    await _add_views(db, task, students[:1], at=NOW - timedelta(hours=1))  # before
    await _add_views(db, task, students[1:], at=NOW + timedelta(hours=1))  # after

    team = Team(name="Рынок")
    db.add(team)
    await db.flush()
    db.add(TeamMember(team_id=team.id, student_id=teammate.id, role="captain"))

    def proposal(status: str, created: datetime) -> Proposal:
        return Proposal(
            task_id=task.id,
            team_id=team.id,
            author_student_id=teammate.id,
            idea="Идея достаточной длины для контракта.",
            plan="План достаточной длины для контракта.",
            duration_weeks=4,
            status=status,
            created_at=created,
        )

    db.add(proposal("sent", NOW + timedelta(hours=2)))
    db.add(proposal("withdrawn", NOW + timedelta(hours=3)))
    await db.commit()

    market = (await business_client.get(f"/api/business/tasks/{task.id}/market")).json()["market"]
    assert market["sinceUpdate"]["views"] == 2
    assert market["sinceUpdate"]["responses"] == 1  # the withdrawn one is not interest
    assert market["sinceUpdate"]["since"].endswith("Z")


async def test_unconfirmed_task_has_no_since_update(
    business_client: AsyncClient, catalogue: list[Task]
) -> None:
    task = next(t for t in catalogue if t.status == "published")
    market = (await business_client.get(f"/api/business/tasks/{task.id}/market")).json()["market"]
    assert market["sinceUpdate"] is None


async def test_access_rules(client: AsyncClient, catalogue: list[Task], business: dict) -> None:
    """`business` is a different business: the task must look nonexistent."""
    task = next(t for t in catalogue if t.status == "published")
    assert (await client.get(f"/api/business/tasks/{task.id}/market")).status_code == 404


async def test_students_are_forbidden(client: AsyncClient, student: dict) -> None:
    assert (await client.get("/api/business/tasks/1/market")).status_code == 403
