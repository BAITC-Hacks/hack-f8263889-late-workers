"""Database guarantees behind teams and proposals — the three index expressions."""

import pytest
from app.models import Proposal, Student, Task, Team, TeamMember
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession


async def test_the_tables_exist(db_engine: AsyncEngine) -> None:
    async with db_engine.connect() as conn:
        tables = await conn.run_sync(lambda sync: inspect(sync).get_table_names())
    assert {"teams", "team_members", "proposals"} <= set(tables)


async def test_team_names_are_unique_regardless_of_case(db: AsyncSession) -> None:
    db.add_all([Team(name="Data Hawks"), Team(name="data hawks")])
    with pytest.raises(IntegrityError):
        await db.commit()
    await db.rollback()


async def test_a_team_may_have_only_one_captain(
    db: AsyncSession, student: dict, teammate: Student
) -> None:
    team = Team(name="Solo")
    db.add(team)
    await db.flush()

    first = await db.scalar(select(Student).limit(1))
    db.add_all(
        [
            TeamMember(team_id=team.id, student_id=first.id, role="captain"),
            TeamMember(team_id=team.id, student_id=teammate.id, role="captain"),
        ]
    )
    with pytest.raises(IntegrityError):
        await db.commit()
    await db.rollback()


def _proposal(task_id: int, team_id: int, student_id: int, status: str) -> Proposal:
    return Proposal(
        task_id=task_id,
        team_id=team_id,
        author_student_id=student_id,
        idea="Идея на двадцать с лишним символов.",
        plan="План на двадцать с лишним символов.",
        duration_weeks=4,
        status=status,
    )


async def test_only_one_live_proposal_per_task_and_team(
    db: AsyncSession, catalogue: list[Task], teammate: Student
) -> None:
    task = catalogue[0]
    team = Team(name="Duplicators")
    db.add(team)
    await db.flush()

    db.add(_proposal(task.id, team.id, teammate.id, "sent"))
    await db.commit()

    db.add(_proposal(task.id, team.id, teammate.id, "reviewing"))
    with pytest.raises(IntegrityError):
        await db.commit()
    await db.rollback()


async def test_a_withdrawn_proposal_frees_the_slot(
    db: AsyncSession, catalogue: list[Task], teammate: Student
) -> None:
    task = catalogue[0]
    team = Team(name="Second Chance")
    db.add(team)
    await db.flush()

    db.add(_proposal(task.id, team.id, teammate.id, "withdrawn"))
    await db.commit()

    db.add(_proposal(task.id, team.id, teammate.id, "sent"))
    await db.commit()  # the partial index ignores withdrawn rows
    assert await db.scalar(select(Proposal.id).where(Proposal.status == "sent")) is not None
