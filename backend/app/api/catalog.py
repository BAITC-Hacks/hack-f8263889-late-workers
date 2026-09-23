"""The task catalogue: `/api/industries`, `/api/tasks`, `/api/me`, `/api/business`."""

from fastapi import APIRouter, Response, status
from sqlalchemy import select

from app.api.catalog_params import CatalogueQueryDep
from app.api.deps import BusinessUser, CurrentUser, DbSession, StudentUser
from app.core.catalog import PAGE_SIZE
from app.models import Industry
from app.schemas.task import (
    BusinessTaskList,
    IndustryList,
    TaskDetailResponse,
    TaskList,
    TaskPage,
)
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


@me_router.get("/saved-tasks", response_model=TaskList)
async def list_saved_tasks(user: StudentUser, db: DbSession):
    return {"items": await tasks_service.list_saved(db, user.student.id)}


@business_router.get("/tasks", response_model=BusinessTaskList)
async def list_business_tasks(user: BusinessUser, db: DbSession):
    return {"items": await tasks_service.list_business_tasks(db, user.business.id)}
