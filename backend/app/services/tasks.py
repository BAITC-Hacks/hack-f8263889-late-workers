"""Catalogue queries: browsing, the task page, and a student's saved tasks."""

import json
from typing import Any

from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.catalog_params import CatalogueQuery
from app.core import messages
from app.core.badges import badge_name
from app.core.catalog import (
    CATALOGUE_STATUSES,
    LEVEL_RANGES,
    PAGE_SIZE,
    level_for,
    need_excerpt,
    status_name,
)
from app.core.exceptions import NotFoundError
from app.models import SavedTask, Task, TaskView, User


def _code_name(code: str, name: str) -> dict[str, str]:
    return {"code": code, "name": name}


def _card(task: Task, *, is_saved: bool) -> dict[str, Any]:
    level_code, level_title = level_for(task.rating)
    return {
        "id": task.id,
        "title": task.title,
        "company_name": task.business.company_name,
        "industry": _code_name(task.industry.code, task.industry.name),
        "rating": task.rating,
        "level": _code_name(level_code, level_title),
        "status": _code_name(task.status, status_name(task.status)),
        "need_excerpt": need_excerpt(task.need),
        "responses_count": task.responses_count,
        "published_at": task.published_at,
        "is_saved": is_saved,
        "badges": [_code_name(code, badge_name(code)) for code in task.badges or []],
    }


def _business_card(task: Task) -> dict[str, Any]:
    level_code, level_title = level_for(task.rating)
    return {
        "id": task.id,
        "title": task.title,
        "status": _code_name(task.status, status_name(task.status)),
        "rating": task.rating,
        "level": _code_name(level_code, level_title),
        "responses_count": task.responses_count,
        "updated_at": task.updated_at,
    }


def _order_by(sort: str) -> list[Any]:
    """Each sort has an explicit tiebreaker, so pages never overlap or skip rows.

    `published_at` is NULL for tasks that were never published, and Postgres sorts
    NULLs first on DESC — without nullslast() such a task would head the catalogue.
    """
    if sort == "date":
        return [Task.published_at.desc().nullslast(), Task.id.desc()]
    if sort == "responses":
        return [Task.responses_count.desc(), Task.rating.desc(), Task.id.desc()]
    return [Task.rating.desc(), Task.published_at.desc().nullslast(), Task.id.desc()]


def _catalogue_filters(query: CatalogueQuery) -> list[Any]:
    filters: list[Any] = [Task.status.in_(CATALOGUE_STATUSES)]
    if query.industries:
        filters.append(Task.industry_code.in_(query.industries))
    if query.levels:
        # Each level is its own closed rating range; ORing them keeps the ranges
        # disjoint, where a single min..max span would swallow the levels between.
        ranges = [
            and_(Task.rating >= LEVEL_RANGES[code][0], Task.rating <= LEVEL_RANGES[code][1])
            for code in query.levels
        ]
        filters.append(or_(*ranges))
    # A task qualifies only when it carries every requested badge: one JSONB
    # containment per code, ANDed together.
    for code in query.badges:
        filters.append(Task.badges.op("@>")(json.dumps([code])))
    return filters


async def _saved_ids(db: AsyncSession, viewer: User, task_ids: list[int]) -> set[int]:
    """One query for the whole page — never one per card."""
    if viewer.student is None or not task_ids:
        return set()
    rows = await db.scalars(
        select(SavedTask.task_id).where(
            SavedTask.student_id == viewer.student.id, SavedTask.task_id.in_(task_ids)
        )
    )
    return set(rows)


async def _count(db: AsyncSession, statement: Select[Any]) -> int:
    return await db.scalar(select(func.count()).select_from(statement.subquery())) or 0


async def list_catalogue(
    db: AsyncSession, viewer: User, query: CatalogueQuery
) -> tuple[list[dict[str, Any]], int]:
    base = select(Task).where(*_catalogue_filters(query))
    total = await _count(db, base)
    tasks = list(
        await db.scalars(
            base.order_by(*_order_by(query.sort))
            .limit(PAGE_SIZE)
            .offset((query.page - 1) * PAGE_SIZE)
        )
    )
    saved = await _saved_ids(db, viewer, [task.id for task in tasks])
    return [_card(task, is_saved=task.id in saved) for task in tasks], total


async def get_task(db: AsyncSession, task_id: int, viewer: User) -> dict[str, Any]:
    """A task the viewer is allowed to see, or a 404.

    Anything outside the catalogue statuses belongs to its owner alone — and a
    stranger gets 404, not 403, so nobody learns that a draft exists.
    """
    task = await db.get(Task, task_id)
    is_owner = (
        task is not None and viewer.business is not None and task.business_id == viewer.business.id
    )
    if task is None or (task.status not in CATALOGUE_STATUSES and not is_owner):
        raise NotFoundError(messages.TASK_NOT_FOUND)

    await _record_view(db, task, viewer)
    saved = await _saved_ids(db, viewer, [task.id])
    card = _card(task, is_saved=task.id in saved)
    card.pop("need_excerpt")
    card["is_owner"] = is_owner
    card["fields"] = {
        "context": task.context,
        "need": task.need,
        "target_users": task.target_users,
        "data_materials": task.data_materials,
        "constraints": task.constraints,
        "expected_result": task.expected_result,
        "success_criteria": task.success_criteria,
        "contact": task.contact,
        "interaction_format": task.interaction_format,
    }
    return card


async def _record_view(db: AsyncSession, task: Task, viewer: User) -> None:
    """First-open bookkeeping: students only, catalogue statuses only, once ever."""
    if viewer.student is None or task.status not in CATALOGUE_STATUSES:
        return
    await db.execute(
        pg_insert(TaskView)
        .values(task_id=task.id, student_id=viewer.student.id)
        .on_conflict_do_nothing(index_elements=["task_id", "student_id"])
    )
    await db.commit()


async def save_task(db: AsyncSession, task_id: int, student_id: int) -> None:
    task = await db.get(Task, task_id)
    if task is None or task.status not in CATALOGUE_STATUSES:
        raise NotFoundError(messages.TASK_NOT_FOUND)
    # Saving twice is a no-op, not a conflict.
    await db.execute(
        pg_insert(SavedTask)
        .values(student_id=student_id, task_id=task_id)
        .on_conflict_do_nothing(index_elements=["student_id", "task_id"])
    )
    await db.commit()


async def unsave_task(db: AsyncSession, task_id: int, student_id: int) -> None:
    """Idempotent by contract: 204 whether or not a row was there."""
    saved = await db.get(SavedTask, (student_id, task_id))
    if saved is not None:
        await db.delete(saved)
        await db.commit()


async def list_saved(db: AsyncSession, student_id: int) -> list[dict[str, Any]]:
    tasks = list(
        await db.scalars(
            select(Task)
            .join(SavedTask, SavedTask.task_id == Task.id)
            .where(SavedTask.student_id == student_id, Task.status.in_(CATALOGUE_STATUSES))
            .order_by(SavedTask.created_at.desc(), Task.id.desc())
        )
    )
    return [_card(task, is_saved=True) for task in tasks]


async def list_business_tasks(db: AsyncSession, business_id: int) -> list[dict[str, Any]]:
    """Every task of this business, in every status."""
    tasks = await db.scalars(
        select(Task)
        .where(Task.business_id == business_id)
        .order_by(Task.updated_at.desc(), Task.id.desc())
    )
    return [_business_card(task) for task in tasks]
