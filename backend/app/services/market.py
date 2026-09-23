"""The market-interest indicator a business sees on its task."""

from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.blocks import BLOCK_CODES, BLOCK_NAMES, round_half_up
from app.core.catalog import CATALOGUE_STATUSES
from app.models import Proposal, SavedTask, Task, TaskView

HINT_MIN_VIEWS = 10


def conversion_of(responses: int, views: int) -> int | None:
    """responses / views as a whole percentage; undefined without views."""
    if views <= 0:
        return None
    return round_half_up(responses / views * 100)


def median(values: list[int | float]) -> float | int | None:
    """The spec's median: mean of the two middle values, one decimal place."""
    if not values:
        return None
    ordered = sorted(values)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        result = Decimal(str(ordered[middle]))
    else:
        result = (Decimal(str(ordered[middle - 1])) + Decimal(str(ordered[middle]))) / 2
    result = result.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)
    # 18, not 18.0 — the contract shows whole medians as integers.
    return int(result) if result == result.to_integral_value() else float(result)


def weakest_block(breakdown: list[dict[str, Any]] | None) -> dict[str, str] | None:
    """Lowest points/maxPoints; ties go to the heavier block, then reference order."""
    if not breakdown:
        return None
    order = {code: index for index, code in enumerate(BLOCK_CODES)}
    entry = min(
        breakdown,
        key=lambda e: (
            e["points"] / e["maxPoints"],
            -e["maxPoints"],
            order.get(e["block"], len(order)),
        ),
    )
    return {"block": entry["block"], "name": BLOCK_NAMES[entry["block"]]}


async def _view_counts(db: AsyncSession, task_ids: list[int]) -> dict[int, int]:
    if not task_ids:
        return {}
    rows = await db.execute(
        select(TaskView.task_id, func.count())
        .where(TaskView.task_id.in_(task_ids))
        .group_by(TaskView.task_id)
    )
    return dict(rows.all())


async def market_for(db: AsyncSession, task: Task) -> dict[str, Any]:
    views = (
        await db.scalar(
            select(func.count()).select_from(TaskView).where(TaskView.task_id == task.id)
        )
        or 0
    )
    saves = (
        await db.scalar(
            select(func.count()).select_from(SavedTask).where(SavedTask.task_id == task.id)
        )
        or 0
    )
    responses = task.responses_count
    conversion = conversion_of(responses, views)

    peers = list(
        await db.scalars(
            select(Task).where(
                Task.industry_code == task.industry_code,
                Task.status.in_(CATALOGUE_STATUSES),
                Task.id != task.id,
            )
        )
    )
    peer_views = await _view_counts(db, [peer.id for peer in peers])
    median_responses = median([peer.responses_count for peer in peers])
    peer_conversions = [
        conversion_of(peer.responses_count, peer_views.get(peer.id, 0))
        for peer in peers
        if peer_views.get(peer.id, 0) > 0
    ]
    median_conversion = median([value for value in peer_conversions if value is not None])

    since_update: dict[str, Any] | None = None
    if task.confirmed_at is not None:
        recent_views = (
            await db.scalar(
                select(func.count())
                .select_from(TaskView)
                .where(TaskView.task_id == task.id, TaskView.first_viewed_at > task.confirmed_at)
            )
            or 0
        )
        recent_responses = (
            await db.scalar(
                select(func.count())
                .select_from(Proposal)
                .where(
                    Proposal.task_id == task.id,
                    Proposal.status != "withdrawn",
                    Proposal.created_at > task.confirmed_at,
                )
            )
            or 0
        )
        since_update = {
            "since": task.confirmed_at,
            "views": recent_views,
            "responses": recent_responses,
        }

    hint: dict[str, str] | None = None
    if (
        views >= HINT_MIN_VIEWS
        and conversion is not None
        and median_conversion is not None
        and conversion < median_conversion
    ):
        hint = weakest_block(task.rating_breakdown)

    return {
        "views": views,
        "saves": saves,
        "responses": responses,
        "conversion": conversion,
        "industry_median_responses": median_responses,
        "industry_median_conversion": median_conversion,
        "since_update": since_update,
        "hint": hint,
    }
