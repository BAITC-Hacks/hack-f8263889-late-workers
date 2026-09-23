"""Teams: creation, membership and the shared serializer."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import messages
from app.core.catalog import TEAM_MEMBERS_LIMIT
from app.core.exceptions import (
    CaptainCannotLeaveError,
    ForbiddenError,
    NotFoundError,
    TeamFullError,
    ValidationError,
)
from app.core.validation import dedupe_tags, normalize_text, validate_tag_fields
from app.models import Student, Team, TeamMember, User

NAME_MIN, NAME_MAX = 2, 60

# The serializer reads every member's student row and that student's user (for the
# email), so both hops are loaded up front — a lazy one would raise MissingGreenlet.
MEMBER_LOAD = selectinload(TeamMember.student).selectinload(Student.user)


def with_members(statement):
    return statement.options(selectinload(Team.members).options(MEMBER_LOAD))


TAG_FIELDS = {
    "interests": "interests",
    "own_skills": "ownSkills",
    "own_technologies": "ownTechnologies",
}


def _ordered_members(team: Team) -> list[TeamMember]:
    """Captain first, everyone else by join time."""
    return sorted(team.members, key=lambda m: (m.role != "captain", m.joined_at))


def _merged(team_values: list[str], members: list[TeamMember], attribute: str) -> list[str]:
    """The team's own tags, then its members', de-duplicated case-insensitively."""
    merged = list(team_values or [])
    for member in members:
        merged.extend(getattr(member.student, attribute) or [])
    return dedupe_tags(merged)


def member_of(team: Team, student_id: int | None) -> TeamMember | None:
    if student_id is None:
        return None
    return next((m for m in team.members if m.student_id == student_id), None)


def serialize_team(team: Team, viewer_student_id: int | None) -> dict[str, Any]:
    """The contract's `team` object.

    Emails are visible only to the team itself — an outsider sees the roster but
    not how to contact anyone on it.
    """
    members = _ordered_members(team)
    viewer = member_of(team, viewer_student_id)
    return {
        "id": team.id,
        "name": team.name,
        "interests": team.interests,
        "own_skills": team.own_skills,
        "own_technologies": team.own_technologies,
        "skills": _merged(team.own_skills, members, "skills"),
        "technologies": _merged(team.own_technologies, members, "technologies"),
        "points": team.points,
        "my_role": viewer.role if viewer else None,
        "members_limit": TEAM_MEMBERS_LIMIT,
        "members": [
            {
                "student_id": member.student_id,
                "name": member.student.name,
                "email": member.student.user.email if viewer else None,
                "role": member.role,
                "skills": member.student.skills,
                "technologies": member.student.technologies,
                "joined_at": member.joined_at,
            }
            for member in members
        ],
        "created_at": team.created_at,
    }


def summarize_team(team: Team, viewer_student_id: int) -> dict[str, Any]:
    members = _ordered_members(team)
    viewer = member_of(team, viewer_student_id)
    return {
        "id": team.id,
        "name": team.name,
        "my_role": viewer.role if viewer else None,
        "members_count": len(members),
        "members_limit": TEAM_MEMBERS_LIMIT,
        "skills": _merged(team.own_skills, members, "skills"),
        "technologies": _merged(team.own_technologies, members, "technologies"),
        "points": team.points,
    }


async def _validate(
    db: AsyncSession, payload: Any, *, exclude_team_id: int | None = None
) -> dict[str, str]:
    fields: dict[str, str] = {}
    name = normalize_text(payload.name, min_length=NAME_MIN, max_length=NAME_MAX)
    if name is None:
        fields["name"] = messages.TEAM_NAME
    else:
        taken = select(Team.id).where(func.lower(Team.name) == name.lower())
        if exclude_team_id is not None:
            taken = taken.where(Team.id != exclude_team_id)
        if await db.scalar(taken):
            fields["name"] = messages.TEAM_NAME_TAKEN
        else:
            payload.name = name
    validate_tag_fields(payload, fields, TAG_FIELDS)
    return fields


async def get_team(db: AsyncSession, team_id: int) -> Team:
    team = await db.scalar(with_members(select(Team).where(Team.id == team_id)))
    if team is None:
        raise NotFoundError(messages.TEAM_NOT_FOUND)
    return team


async def get_own_team(db: AsyncSession, team_id: int, student_id: int) -> Team:
    """A team the student belongs to, or a 404 — outsiders cannot probe team ids."""
    team = await get_team(db, team_id)
    if member_of(team, student_id) is None:
        raise NotFoundError(messages.TEAM_NOT_FOUND)
    return team


def require_captain(team: Team, student_id: int) -> None:
    member = member_of(team, student_id)
    if member is None or member.role != "captain":
        raise ForbiddenError()


async def reload(db: AsyncSession, team_id: int) -> Team:
    """Re-select so the members collection reflects the write (see app/services/builder.py)."""
    team = await db.scalar(
        with_members(select(Team).where(Team.id == team_id)).execution_options(
            populate_existing=True
        )
    )
    assert team is not None
    return team


async def create_team(db: AsyncSession, payload: Any, student_id: int) -> Team:
    fields = await _validate(db, payload)
    if fields:
        raise ValidationError(fields)

    team = Team(
        name=payload.name,
        interests=payload.interests,
        own_skills=payload.own_skills,
        own_technologies=payload.own_technologies,
        members=[TeamMember(student_id=student_id, role="captain")],
    )
    db.add(team)
    await db.commit()
    return await reload(db, team.id)


async def update_team(db: AsyncSession, team: Team, payload: Any) -> Team:
    fields = await _validate(db, payload, exclude_team_id=team.id)
    if fields:
        raise ValidationError(fields)

    team.name = payload.name
    team.interests = payload.interests
    team.own_skills = payload.own_skills
    team.own_technologies = payload.own_technologies
    await db.commit()
    return await reload(db, team.id)


async def list_my_teams(db: AsyncSession, student_id: int) -> list[Team]:
    """Teams the student is in, most recently joined first."""
    rows = await db.scalars(
        with_members(select(Team))
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.student_id == student_id)
        .order_by(TeamMember.joined_at.desc(), Team.id.desc())
    )
    return list(rows)


async def add_member(db: AsyncSession, team: Team, email: Any) -> Team:
    if len(team.members) >= TEAM_MEMBERS_LIMIT:
        raise TeamFullError()

    address = email.strip().lower() if isinstance(email, str) else ""
    student = await db.scalar(
        select(Student).join(User, User.id == Student.user_id).where(User.email == address)
    )
    if not address or student is None:
        raise ValidationError({"email": messages.STUDENT_NOT_FOUND})
    if member_of(team, student.id) is not None:
        raise ValidationError({"email": messages.STUDENT_ALREADY_IN_TEAM})

    db.add(TeamMember(team_id=team.id, student_id=student.id, role="member"))
    await db.commit()
    return await reload(db, team.id)


async def remove_member(db: AsyncSession, team: Team, student_id: int, viewer_id: int) -> None:
    target = member_of(team, student_id)
    if target is None:
        raise NotFoundError(messages.MEMBER_NOT_FOUND)
    if target.role == "captain":
        raise CaptainCannotLeaveError()
    # Leaving is always allowed; removing someone else is the captain's call.
    if student_id != viewer_id:
        require_captain(team, viewer_id)
    await db.delete(target)
    await db.commit()
