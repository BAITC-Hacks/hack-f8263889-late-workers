"""Proposals: a team's answer to a task, plus the task's response counter."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import messages
from app.core.catalog import (
    ACTIVE_PROPOSAL_STATUSES,
    CATALOGUE_STATUSES,
    EDITABLE_PROPOSAL_STATUSES,
    proposal_status_name,
)
from app.core.exceptions import (
    ForbiddenError,
    InvalidStatusError,
    NotFoundError,
    ProposalExistsError,
    ValidationError,
)
from app.core.validation import as_text, normalize_text
from app.models import Proposal, Task, Team, TeamMember
from app.services import teams as teams_service
from app.services.rating import level_of

IDEA_MIN, IDEA_MAX = 20, 2000
PLAN_MIN, PLAN_MAX = 20, 3000
WEEKS_MIN, WEEKS_MAX = 1, 52
URL_MAX = 500


def serialize_proposal(proposal: Proposal, viewer_student_id: int, captain_of: set[int]) -> dict:
    """The contract's `proposal` object.

    `canEdit` is the viewer's own view of it: only the captain of the proposing team
    may still change it, and only while the business has not decided.
    """
    task = proposal.task
    can_edit = proposal.team_id in captain_of and proposal.status in EDITABLE_PROPOSAL_STATUSES
    return {
        "id": proposal.id,
        "task": {
            "id": task.id,
            "title": task.title,
            "company_name": task.business.company_name,
            "rating": task.rating,
            "level": level_of(task.rating),
        },
        "team": {"id": proposal.team.id, "name": proposal.team.name},
        "author": {"student_id": proposal.author.id, "name": proposal.author.name},
        "status": {
            "code": proposal.status,
            "name": proposal_status_name(proposal.status),
        },
        "idea": proposal.idea,
        "plan": proposal.plan,
        "duration_weeks": proposal.duration_weeks,
        "prototype_url": proposal.prototype_url,
        "business_comment": proposal.business_comment,
        "can_edit": can_edit,
        "created_at": proposal.created_at,
        "updated_at": proposal.updated_at,
        "decided_at": proposal.decided_at,
    }


async def captain_of(db: AsyncSession, student_id: int) -> set[int]:
    rows = await db.scalars(
        select(TeamMember.team_id).where(
            TeamMember.student_id == student_id, TeamMember.role == "captain"
        )
    )
    return set(rows)


async def member_of(db: AsyncSession, student_id: int) -> set[int]:
    rows = await db.scalars(select(TeamMember.team_id).where(TeamMember.student_id == student_id))
    return set(rows)


async def recalc_responses_count(db: AsyncSession, task_id: int) -> None:
    """A task counts every proposal that was not withdrawn."""
    total = (
        select(func.count())
        .select_from(Proposal)
        .where(Proposal.task_id == task_id, Proposal.status != "withdrawn")
    )
    await db.execute(
        update(Task).where(Task.id == task_id).values(responses_count=total.scalar_subquery())
    )


def _validate_body(payload: Any) -> tuple[dict[str, str], dict[str, Any]]:
    fields: dict[str, str] = {}
    values: dict[str, Any] = {}

    idea = normalize_text(payload.idea, min_length=IDEA_MIN, max_length=IDEA_MAX)
    if idea is None:
        fields["idea"] = messages.IDEA
    else:
        values["idea"] = idea

    plan = normalize_text(payload.plan, min_length=PLAN_MIN, max_length=PLAN_MAX)
    if plan is None:
        fields["plan"] = messages.PLAN
    else:
        values["plan"] = plan

    weeks = payload.duration_weeks
    # bool is an int in Python, and True would otherwise pass as "1 week".
    if isinstance(weeks, bool) or not isinstance(weeks, int) or not WEEKS_MIN <= weeks <= WEEKS_MAX:
        fields["durationWeeks"] = messages.DURATION_WEEKS
    else:
        values["duration_weeks"] = weeks

    url = (as_text(payload.prototype_url) or "").strip()
    if not url:
        values["prototype_url"] = None
    elif not url.startswith(("http://", "https://")):
        fields["prototypeUrl"] = messages.PROTOTYPE_URL
    elif len(url) > URL_MAX:
        fields["prototypeUrl"] = messages.PROTOTYPE_URL_LONG
    else:
        values["prototype_url"] = url

    return fields, values


async def _open_task(db: AsyncSession, task_id: int) -> Task:
    task = await db.get(Task, task_id)
    if task is None or task.status not in CATALOGUE_STATUSES:
        raise NotFoundError(messages.TASK_NOT_FOUND)
    return task


async def create_proposal(
    db: AsyncSession, task_id: int, payload: Any, student_id: int
) -> Proposal:
    task = await _open_task(db, task_id)

    fields, values = _validate_body(payload)
    team_id = payload.team_id
    if not isinstance(team_id, int) or team_id not in await captain_of(db, student_id):
        fields["teamId"] = messages.NOT_CAPTAIN
    if fields:
        raise ValidationError(fields)

    existing = await db.scalar(
        select(Proposal.id).where(
            Proposal.task_id == task.id,
            Proposal.team_id == team_id,
            Proposal.status.in_(ACTIVE_PROPOSAL_STATUSES),
        )
    )
    if existing is not None:
        raise ProposalExistsError(existing)

    proposal = Proposal(
        task_id=task.id,
        team_id=team_id,
        author_student_id=student_id,
        status="sent",
        **values,
    )
    db.add(proposal)
    await db.flush()
    await recalc_responses_count(db, task.id)
    await db.commit()
    return await reload(db, proposal.id)


async def reload(db: AsyncSession, proposal_id: int) -> Proposal:
    proposal = await db.scalar(
        select(Proposal).where(Proposal.id == proposal_id).execution_options(populate_existing=True)
    )
    assert proposal is not None
    return proposal


async def get_own_proposal(db: AsyncSession, proposal_id: int, student_id: int) -> Proposal:
    """A proposal of one of the student's teams, or a 404."""
    proposal = await db.scalar(select(Proposal).where(Proposal.id == proposal_id))
    if proposal is None or proposal.team_id not in await member_of(db, student_id):
        raise NotFoundError(messages.PROPOSAL_NOT_FOUND)
    return proposal


def _require_editable(proposal: Proposal, student_id: int, captains: set[int]) -> None:
    if proposal.team_id not in captains:
        raise ForbiddenError()
    if proposal.status not in EDITABLE_PROPOSAL_STATUSES:
        raise InvalidStatusError(messages.PROPOSAL_INVALID_STATUS)


async def update_proposal(
    db: AsyncSession, proposal: Proposal, payload: Any, student_id: int
) -> Proposal:
    _require_editable(proposal, student_id, await captain_of(db, student_id))
    fields, values = _validate_body(payload)
    if fields:
        raise ValidationError(fields)

    for name, value in values.items():
        setattr(proposal, name, value)
    proposal.updated_at = datetime.now(UTC)
    await db.commit()
    return await reload(db, proposal.id)


async def withdraw_proposal(db: AsyncSession, proposal: Proposal, student_id: int) -> Proposal:
    _require_editable(proposal, student_id, await captain_of(db, student_id))
    proposal.status = "withdrawn"
    await db.flush()
    await recalc_responses_count(db, proposal.task_id)
    await db.commit()
    return await reload(db, proposal.id)


async def list_proposals(
    db: AsyncSession, student_id: int, task_id: int | None = None
) -> list[Proposal]:
    """Proposals of every team the student is in right now, newest first."""
    teams = await member_of(db, student_id)
    if not teams:
        return []
    statement = select(Proposal).where(Proposal.team_id.in_(teams))
    if task_id is not None:
        statement = statement.where(Proposal.task_id == task_id)
    rows = await db.scalars(statement.order_by(Proposal.created_at.desc(), Proposal.id.desc()))
    return list(rows)


async def team_for_student(db: AsyncSession, team_id: int, student_id: int) -> Team:
    return await teams_service.get_own_team(db, team_id, student_id)
