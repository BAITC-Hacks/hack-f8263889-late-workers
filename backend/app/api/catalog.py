"""The task catalogue: `/api/industries`, `/api/tasks`, `/api/me`, `/api/business`."""

from fastapi import APIRouter, Response, status
from sqlalchemy import select

from app.api.catalog_params import CatalogueQueryDep
from app.api.deps import BusinessUser, CurrentUser, DbSession, StudentUser
from app.core.catalog import PAGE_SIZE
from app.models import Industry
from app.schemas.proposal import ProposalList, ProposalRequest, ProposalResponse
from app.schemas.task import (
    BusinessTaskList,
    IndustryList,
    TaskDetailResponse,
    TaskList,
    TaskPage,
)
from app.services import proposals as proposals_service
from app.services import tasks as tasks_service

industries_router = APIRouter(prefix="/industries", tags=["catalog"])
tasks_router = APIRouter(prefix="/tasks", tags=["catalog"])
me_router = APIRouter(prefix="/me", tags=["catalog"])
business_router = APIRouter(prefix="/business", tags=["catalog"])


@industries_router.get("", response_model=IndustryList)
async def list_industries(user: CurrentUser, db: DbSession):
    items = await db.scalars(select(Industry))
    return {"items": list(items)}


@tasks_router.get("", response_model=TaskPage)
async def list_tasks(user: CurrentUser, db: DbSession, query: CatalogueQueryDep):
    items, total = await tasks_service.list_catalogue(db, user, query)
    return {"items": items, "page": query.page, "page_size": PAGE_SIZE, "total": total}


@tasks_router.get("/{task_id}", response_model=TaskDetailResponse)
async def get_task(task_id: int, user: CurrentUser, db: DbSession):
    return {"task": await tasks_service.get_task(db, task_id, user)}


@tasks_router.post(
    "/{task_id}/save", status_code=status.HTTP_204_NO_CONTENT, response_class=Response
)
async def save_task(task_id: int, user: StudentUser, db: DbSession) -> None:
    await tasks_service.save_task(db, task_id, user.student.id)


@tasks_router.delete(
    "/{task_id}/save", status_code=status.HTTP_204_NO_CONTENT, response_class=Response
)
async def unsave_task(task_id: int, user: StudentUser, db: DbSession) -> None:
    await tasks_service.unsave_task(db, task_id, user.student.id)


@tasks_router.post(
    "/{task_id}/proposals", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED
)
async def create_proposal(task_id: int, payload: ProposalRequest, user: StudentUser, db: DbSession):
    proposal = await proposals_service.create_proposal(db, task_id, payload, user.student.id)
    captains = await proposals_service.captain_of(db, user.student.id)
    return {"proposal": proposals_service.serialize_proposal(proposal, user.student.id, captains)}


@tasks_router.get("/{task_id}/my-proposals", response_model=ProposalList)
async def list_task_proposals(task_id: int, user: StudentUser, db: DbSession):
    await tasks_service.get_task(db, task_id, user)  # 404 for a task outside the catalogue
    proposals = await proposals_service.list_proposals(db, user.student.id, task_id)
    captains = await proposals_service.captain_of(db, user.student.id)
    return {
        "items": [
            proposals_service.serialize_proposal(p, user.student.id, captains) for p in proposals
        ]
    }


@me_router.get("/proposals", response_model=ProposalList)
async def list_my_proposals(user: StudentUser, db: DbSession):
    proposals = await proposals_service.list_proposals(db, user.student.id)
    captains = await proposals_service.captain_of(db, user.student.id)
    return {
        "items": [
            proposals_service.serialize_proposal(p, user.student.id, captains) for p in proposals
        ]
    }


@me_router.get("/saved-tasks", response_model=TaskList)
async def list_saved_tasks(user: StudentUser, db: DbSession):
    return {"items": await tasks_service.list_saved(db, user.student.id)}


@business_router.get("/tasks", response_model=BusinessTaskList)
async def list_business_tasks(user: BusinessUser, db: DbSession):
    return {"items": await tasks_service.list_business_tasks(db, user.business.id)}
