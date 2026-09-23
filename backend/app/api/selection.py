"""The business's side of proposals: compare, decide, set and confirm milestones."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.api.builder import OwnedTask
from app.api.deps import BusinessUser, DbSession
from app.core.catalog import status_name
from app.models import Milestone, Proposal
from app.schemas.selection import (
    BusinessProposalResponse,
    BusinessProposalsPage,
    DecisionRequest,
    DecisionResponse,
    MilestoneRequest,
)
from app.services import proposals as proposals_service
from app.services.rating import level_of

router = APIRouter(prefix="/business", tags=["selection"])


async def business_proposal(proposal_id: int, user: BusinessUser, db: DbSession) -> Proposal:
    return await proposals_service.get_business_proposal(db, proposal_id, user.business.id)


async def business_milestone(milestone_id: int, user: BusinessUser, db: DbSession) -> Milestone:
    return await proposals_service.get_business_milestone(db, milestone_id, user.business.id)


BusinessProposal = Annotated[Proposal, Depends(business_proposal)]
BusinessMilestone = Annotated[Milestone, Depends(business_milestone)]


@router.get("/tasks/{task_id}/proposals", response_model=BusinessProposalsPage)
async def list_task_proposals(task: OwnedTask, db: DbSession):
    proposals = await proposals_service.list_business_proposals(db, task)
    return {
        "task": {
            "id": task.id,
            "title": task.title,
            "status": {"code": task.status, "name": status_name(task.status)},
            "rating": task.rating,
            "level": level_of(task.rating),
        },
        "items": [proposals_service.serialize_business_proposal(p) for p in proposals],
    }


async def _decision(db: DbSession, proposal: Proposal, verdict: str, comment) -> dict:
    proposal, task = await proposals_service.decide(db, proposal, verdict, comment)
    return {
        "proposal": proposals_service.serialize_business_proposal(proposal),
        "task_status": {"code": task.status, "name": status_name(task.status)},
    }


@router.post("/proposals/{proposal_id}/select", response_model=DecisionResponse)
async def select_proposal(payload: DecisionRequest, proposal: BusinessProposal, db: DbSession):
    return await _decision(db, proposal, "selected", payload.comment)


@router.post("/proposals/{proposal_id}/reject", response_model=DecisionResponse)
async def reject_proposal(payload: DecisionRequest, proposal: BusinessProposal, db: DbSession):
    return await _decision(db, proposal, "rejected", payload.comment)


@router.post(
    "/proposals/{proposal_id}/milestones",
    response_model=BusinessProposalResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_milestone(payload: MilestoneRequest, proposal: BusinessProposal, db: DbSession):
    updated = await proposals_service.add_milestone(db, proposal, payload.title)
    return {"proposal": proposals_service.serialize_business_proposal(updated)}


@router.delete(
    "/milestones/{milestone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_milestone(milestone: BusinessMilestone, db: DbSession) -> None:
    await proposals_service.delete_milestone(db, milestone)


@router.post("/milestones/{milestone_id}/confirm", response_model=BusinessProposalResponse)
async def confirm_milestone(milestone: BusinessMilestone, db: DbSession):
    proposal = await proposals_service.confirm_milestone(db, milestone)
    return {"proposal": proposals_service.serialize_business_proposal(proposal)}
