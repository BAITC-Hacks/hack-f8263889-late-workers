"""Teams, membership and proposals: `/api/teams`, `/api/proposals`, `/api/student`."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.deps import CurrentUser, DbSession, StudentUser
from app.core import messages
from app.core.exceptions import ValidationError
from app.core.validation import normalize_text, validate_tag_fields
from app.models import Team
from app.schemas.account import AuthResponse
from app.schemas.proposal import (
    ProposalList,
    ProposalResponse,
    ProposalUpdateRequest,
)
from app.schemas.team import (
    MemberRequest,
    StudentProfileRequest,
    TeamList,
    TeamRequest,
    TeamResponse,
)
from app.services import proposals as proposals_service
from app.services import teams as teams_service

teams_router = APIRouter(prefix="/teams", tags=["teams"])
proposals_router = APIRouter(prefix="/proposals", tags=["teams"])
student_router = APIRouter(prefix="/student", tags=["teams"])


async def own_team(team_id: int, user: StudentUser, db: DbSession) -> Team:
    """A team the caller belongs to, or a 404 — team ids are not probeable."""
    return await teams_service.get_own_team(db, team_id, user.student.id)


OwnTeam = Annotated[Team, Depends(own_team)]


@student_router.put("/profile", response_model=AuthResponse)
async def update_profile(payload: StudentProfileRequest, user: StudentUser, db: DbSession):
    """Same validation and the same response body as student registration."""
    fields: dict[str, str] = {}
    name = normalize_text(payload.name, min_length=2, max_length=100)
    if name is None:
        fields["name"] = messages.NAME
    validate_tag_fields(payload, fields, {"skills": "skills", "technologies": "technologies"})
    if fields:
        raise ValidationError(fields)

    user.student.name = name
    user.student.skills = payload.skills
    user.student.technologies = payload.technologies
    await db.commit()
    await db.refresh(user)
    return {"user": user}


@teams_router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(payload: TeamRequest, user: StudentUser, db: DbSession):
    team = await teams_service.create_team(db, payload, user.student.id)
    return {"team": teams_service.serialize_team(team, user.student.id)}


@teams_router.get("/my", response_model=TeamList)
async def list_my_teams(user: StudentUser, db: DbSession):
    teams = await teams_service.list_my_teams(db, user.student.id)
    return {"items": [teams_service.summarize_team(team, user.student.id) for team in teams]}


@teams_router.get("/{team_id}", response_model=TeamResponse)
async def get_team(team_id: int, user: CurrentUser, db: DbSession):
    """Open to any signed-in user, including businesses looking at a roster."""
    team = await teams_service.get_team(db, team_id)
    viewer = user.student.id if user.student else None
    return {"team": teams_service.serialize_team(team, viewer)}


@teams_router.patch("/{team_id}", response_model=TeamResponse)
async def update_team(payload: TeamRequest, team: OwnTeam, user: StudentUser, db: DbSession):
    teams_service.require_captain(team, user.student.id)
    team = await teams_service.update_team(db, team, payload)
    return {"team": teams_service.serialize_team(team, user.student.id)}


@teams_router.post("/{team_id}/members", response_model=TeamResponse)
async def add_member(payload: MemberRequest, team: OwnTeam, user: StudentUser, db: DbSession):
    teams_service.require_captain(team, user.student.id)
    team = await teams_service.add_member(db, team, payload.email)
    return {"team": teams_service.serialize_team(team, user.student.id)}


@teams_router.delete(
    "/{team_id}/members/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def remove_member(student_id: int, team: OwnTeam, user: StudentUser, db: DbSession) -> None:
    await teams_service.remove_member(db, team, student_id, user.student.id)


@proposals_router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: int, user: StudentUser, db: DbSession):
    proposal = await proposals_service.get_own_proposal(db, proposal_id, user.student.id)
    captains = await proposals_service.captain_of(db, user.student.id)
    return {"proposal": proposals_service.serialize_proposal(proposal, user.student.id, captains)}


@proposals_router.patch("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(
    proposal_id: int, payload: ProposalUpdateRequest, user: StudentUser, db: DbSession
):
    proposal = await proposals_service.get_own_proposal(db, proposal_id, user.student.id)
    proposal = await proposals_service.update_proposal(db, proposal, payload, user.student.id)
    captains = await proposals_service.captain_of(db, user.student.id)
    return {"proposal": proposals_service.serialize_proposal(proposal, user.student.id, captains)}


@proposals_router.post("/{proposal_id}/withdraw", response_model=ProposalResponse)
async def withdraw_proposal(proposal_id: int, user: StudentUser, db: DbSession):
    proposal = await proposals_service.get_own_proposal(db, proposal_id, user.student.id)
    proposal = await proposals_service.withdraw_proposal(db, proposal, user.student.id)
    captains = await proposals_service.captain_of(db, user.student.id)
    return {"proposal": proposals_service.serialize_proposal(proposal, user.student.id, captains)}


__all__ = ["ProposalList", "proposals_router", "student_router", "teams_router"]
