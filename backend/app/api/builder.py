"""The card builder: `/api/business/tasks/*`, business-owner only."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select

from app.api.deps import BusinessUser, DbSession
from app.core import messages
from app.core.exceptions import NotFoundError
from app.models import Industry, Task
from app.schemas.builder import (
    AnswersRequest,
    BuilderTaskResponse,
    CreateDraftRequest,
    UpdateCardRequest,
)
from app.services import builder as builder_service

router = APIRouter(prefix="/business/tasks", tags=["builder"])


async def known_industries(db: DbSession) -> set[str]:
    return set(await db.scalars(select(Industry.code)))


KnownIndustries = Annotated[set[str], Depends(known_industries)]


async def owned_task(task_id: int, user: BusinessUser, db: DbSession) -> Task:
    """The caller's own task, or a 404.

    Never 403 for someone else's task: the owner of a draft is the only one who
    should be able to tell that it exists.
    """
    task = await db.get(Task, task_id)
    if task is None or user.business is None or task.business_id != user.business.id:
        raise NotFoundError(messages.TASK_NOT_FOUND)
    return task


OwnedTask = Annotated[Task, Depends(owned_task)]


@router.post("", response_model=BuilderTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_draft(
    payload: CreateDraftRequest, user: BusinessUser, db: DbSession, known: KnownIndustries
):
    task = await builder_service.create_draft(
        db, user.business.id, payload.draft_text, payload.industry_code, known
    )
    return {"task": builder_service.serialize(task)}


@router.get("/{task_id}", response_model=BuilderTaskResponse)
async def get_task(task: OwnedTask):
    return {"task": builder_service.serialize(task)}


@router.post("/{task_id}/rounds", response_model=BuilderTaskResponse, status_code=201)
async def start_round(task: OwnedTask, user: BusinessUser, db: DbSession):
    task = await builder_service.start_round(db, task, user.business.id)
    return {"task": builder_service.serialize(task)}


@router.put("/{task_id}/rounds/{number}/answers", response_model=BuilderTaskResponse)
async def save_answers(number: int, payload: AnswersRequest, task: OwnedTask, db: DbSession):
    task = await builder_service.save_answers(db, task, number, payload.answers)
    return {"task": builder_service.serialize(task)}


@router.post("/{task_id}/card/build", response_model=BuilderTaskResponse)
async def build_card(task: OwnedTask, user: BusinessUser, db: DbSession):
    task = await builder_service.build_card(db, task, user.business.id)
    return {"task": builder_service.serialize(task)}


@router.put("/{task_id}/card", response_model=BuilderTaskResponse)
async def update_card(
    payload: UpdateCardRequest,
    task: OwnedTask,
    user: BusinessUser,
    db: DbSession,
    known: KnownIndustries,
):
    task = await builder_service.update_card(db, task, payload, known, user.business.id)
    return {"task": builder_service.serialize(task)}


@router.post("/{task_id}/publish", response_model=BuilderTaskResponse)
async def publish(task: OwnedTask, db: DbSession):
    task = await builder_service.publish(db, task)
    return {"task": builder_service.serialize(task)}


@router.post("/{task_id}/unpublish", response_model=BuilderTaskResponse)
async def unpublish(task: OwnedTask, db: DbSession):
    task = await builder_service.unpublish(db, task)
    return {"task": builder_service.serialize(task)}


__all__ = ["Response", "router"]
