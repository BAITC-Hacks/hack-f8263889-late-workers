"""Card builder: draft -> clarification rounds -> card -> rating -> publication."""

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import messages
from app.core.badges import badge_name, recalc_badges
from app.core.blocks import CARD_FIELDS, FIELD_COLUMNS, MAX_ROUNDS
from app.core.catalog import CATALOGUE_STATUSES, status_name
from app.core.exceptions import (
    CardNotConfirmedError,
    InvalidStatusError,
    NotFoundError,
    RoundLimitReachedError,
    RoundNotAnsweredError,
    ValidationError,
)
from app.models import ClarificationRound, RoundQuestion, Task
from app.services import builder_ai
from app.services import rating as rating_service
from app.services.fallback import split_sentences

DRAFT_MIN, DRAFT_MAX = 50, 3000
ANSWER_MAX = 1000
TITLE_MAX = 120
FIELD_MAX = 2000

EMPTY_META: dict[str, Any] = {"value": None, "source": None, "confirmed": False, "sources": []}


def _code_name(code: str, name: str) -> dict[str, str]:
    return {"code": code, "name": name}


def _now() -> datetime:
    return datetime.now(UTC)


async def reload(db: AsyncSession, task_id: int) -> Task:
    """Re-select the task after a write.

    Not `db.refresh`: it expires the relationships, and the next attribute access
    would lazy-load inside the async response path and raise MissingGreenlet.
    """
    # populate_existing: the task is already in the identity map with its old
    # relationship contents, and a plain select would hand that stale object back.
    task = await db.scalar(
        select(Task).where(Task.id == task_id).execution_options(populate_existing=True)
    )
    assert task is not None
    return task


# --- Fragments ---------------------------------------------------------------


def draft_fragments(task: Task) -> list[dict[str, Any]]:
    return [
        {"id": f"D{index}", "text": sentence, "question_id": None}
        for index, sentence in enumerate(split_sentences(task.draft_text or ""), start=1)
    ]


def answer_fragments(task: Task) -> list[dict[str, Any]]:
    """Answers become A1..Am in round then question order. Skipped ones are not fragments."""
    fragments: list[dict[str, Any]] = []
    for round_ in sorted(task.rounds, key=lambda r: r.number):
        for question in sorted(round_.questions, key=lambda q: q.position):
            if question.answer and not question.skipped:
                fragments.append(
                    {
                        "id": f"A{len(fragments) + 1}",
                        "text": question.answer,
                        "question_id": question.id,
                        "block": question.block,
                        "question": question.text,
                    }
                )
    return fragments


def all_fragments(task: Task) -> list[dict[str, Any]]:
    return draft_fragments(task) + answer_fragments(task)


def fragment_texts(task: Task) -> dict[str, str]:
    return {fragment["id"]: fragment["text"] for fragment in all_fragments(task)}


# --- Card ---------------------------------------------------------------------


def card_values(task: Task) -> dict[str, str | None]:
    return {field: getattr(task, FIELD_COLUMNS[field]) for field in CARD_FIELDS}


def _meta(task: Task, key: str) -> dict[str, Any]:
    stored = (task.field_meta or {}).get(key) or {}
    return {
        "source": stored.get("source"),
        "confirmed": bool(stored.get("confirmed", False)),
        "sources": list(stored.get("sources") or []),
    }


def serialize_card(task: Task) -> dict[str, Any] | None:
    """The card, or None while the task is still a bare draft."""
    meta = task.field_meta or {}
    if not meta:
        return None
    values = card_values(task)
    return {
        "mode": meta.get("mode", "ai"),
        "title": {"value": task.title or None, **_meta(task, "title")},
        "fields": {field: {"value": values[field], **_meta(task, field)} for field in CARD_FIELDS},
    }


def serialize(task: Task) -> dict[str, Any]:
    """The contract's `task` object, one shape for every builder endpoint."""
    rounds = [
        {
            "number": round_.number,
            "mode": round_.mode,
            "assessment": round_.assessment,
            "questions": [
                {
                    "id": question.id,
                    "block": question.block,
                    "text": question.text,
                    "answer": question.answer,
                    "skipped": question.skipped,
                }
                for question in sorted(round_.questions, key=lambda q: q.position)
            ],
            "created_at": round_.created_at,
            "answered_at": round_.answered_at,
        }
        for round_ in sorted(task.rounds, key=lambda r: r.number)
    ]
    # Rating only exists once the business has confirmed the card.
    confirmed = task.confirmed_at is not None
    return {
        "id": task.id,
        "status": _code_name(task.status, status_name(task.status)),
        "industry": _code_name(task.industry.code, task.industry.name),
        "draft_text": task.draft_text,
        "rounds": rounds,
        "rounds_left": MAX_ROUNDS - len(rounds),
        "fragments": [
            {k: v for k, v in fragment.items() if k in {"id", "text", "question_id"}}
            for fragment in all_fragments(task)
        ],
        "card": serialize_card(task),
        "badges": [{"code": code, "name": badge_name(code)} for code in task.badges or []],
        "rating": task.rating if confirmed else None,
        "level": rating_service.level_of(task.rating) if confirmed else None,
        "rating_breakdown": rating_service.public_breakdown(task.rating_breakdown)
        if confirmed
        else None,
        "confirmed_at": task.confirmed_at,
        "published_at": task.published_at,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


# --- Draft --------------------------------------------------------------------


async def create_draft(
    db: AsyncSession, business_id: int, draft_text: Any, industry_code: Any, known: set[str]
) -> Task:
    fields: dict[str, str] = {}
    text = draft_text.strip() if isinstance(draft_text, str) else ""
    if not DRAFT_MIN <= len(text) <= DRAFT_MAX:
        fields["draftText"] = messages.DRAFT_TEXT
    code = industry_code.strip().lower() if isinstance(industry_code, str) else ""
    if code not in known:
        fields["industryCode"] = messages.unknown_industry(code or "—")
    if fields:
        raise ValidationError(fields)

    task = Task(
        business_id=business_id,
        industry_code=code,
        status="draft",
        title="",
        draft_text=text,
        rating=0,
        field_meta={},
    )
    db.add(task)
    await db.commit()
    return await reload(db, task.id)


# --- Rounds -------------------------------------------------------------------


def _question_history(task: Task) -> list[dict[str, Any]]:
    return [
        {
            "block": question.block,
            "question": question.text,
            "answer": question.answer if not question.skipped else "пропущен",
        }
        for round_ in sorted(task.rounds, key=lambda r: r.number)
        for question in sorted(round_.questions, key=lambda q: q.position)
    ]


async def start_round(db: AsyncSession, task: Task, business_id: int) -> Task:
    if task.status not in {"draft", "clarifying"}:
        raise InvalidStatusError()
    if len(task.rounds) >= MAX_ROUNDS:
        raise RoundLimitReachedError()
    if task.rounds and task.rounds[-1].answered_at is None:
        raise RoundNotAnsweredError()

    history = _question_history(task)
    asked = {builder_ai.normalize_question(entry["question"]) for entry in history}
    mode, assessment, questions = await builder_ai.analyze(
        draft_text=task.draft_text or "",
        industry_name=task.industry.name,
        history=history,
        asked=asked,
        task_id=task.id,
        business_id=business_id,
    )

    round_ = ClarificationRound(
        task_id=task.id,
        number=len(task.rounds) + 1,
        mode=mode,
        assessment=assessment,
        questions=[
            RoundQuestion(position=position, block=block, text=text)
            for position, (block, text) in enumerate(questions, start=1)
        ],
    )
    db.add(round_)
    task.status = "clarifying"
    await db.commit()
    return await reload(db, task.id)


async def save_answers(db: AsyncSession, task: Task, number: int, answers: list[Any]) -> Task:
    round_ = next((r for r in task.rounds if r.number == number), None)
    if round_ is None:
        raise NotFoundError(messages.TASK_NOT_FOUND)
    if task.status != "clarifying" or round_.number != len(task.rounds):
        raise InvalidStatusError()

    by_id = {question.id: question for question in round_.questions}
    provided = [answer for answer in answers if isinstance(answer.question_id, int)]
    if sorted(answer.question_id for answer in provided) != sorted(by_id):
        raise ValidationError({"answers": messages.ANSWERS_INCOMPLETE})

    fields: dict[str, str] = {}
    cleaned: dict[int, str | None] = {}
    for answer in provided:
        text = answer.answer.strip() if isinstance(answer.answer, str) else ""
        if len(text) > ANSWER_MAX:
            fields[f"answers.{answer.question_id}"] = messages.ANSWER_TOO_LONG
        cleaned[answer.question_id] = text or None
    if fields:
        raise ValidationError(fields)

    for question_id, text in cleaned.items():
        question = by_id[question_id]
        question.answer = text
        question.skipped = text is None
    round_.answered_at = _now()
    await db.commit()
    return await reload(db, task.id)


# --- Card build and confirmation ----------------------------------------------


async def build_card(db: AsyncSession, task: Task, business_id: int) -> Task:
    if task.status != "clarifying":
        raise InvalidStatusError()
    if task.rounds and task.rounds[-1].answered_at is None:
        raise RoundNotAnsweredError()

    fragments = fragment_texts(task)
    answers = answer_fragments(task)
    mode, card, violations = await builder_ai.extract_card(
        draft_text=task.draft_text or "",
        fragments=fragments,
        answers=answers,
        task_id=task.id,
        business_id=business_id,
    )
    if violations:
        await _note_violations(task.id, violations)

    meta: dict[str, Any] = {"mode": mode}
    task.title = card["title"]["value"] or ""
    meta["title"] = {
        "source": "ai" if card["title"]["value"] else None,
        "confirmed": False,
        "sources": card["title"]["sources"],
    }
    for field in CARD_FIELDS:
        if field == "contact":
            # Always the business's own profile, never the model's guess.
            contact = f"{task.business.contact_name}, {task.business.contact_phone}"
            setattr(task, FIELD_COLUMNS[field], contact)
            meta[field] = {"source": "profile", "confirmed": False, "sources": []}
            continue
        extracted = card["fields"].get(field, {"value": None, "sources": []})
        setattr(task, FIELD_COLUMNS[field], extracted["value"])
        meta[field] = {
            "source": "ai" if extracted["value"] else None,
            "confirmed": False,
            "sources": extracted["sources"],
        }
    task.field_meta = meta
    task.status = "review"
    await db.commit()
    return await reload(db, task.id)


async def _note_violations(task_id: int, violations: list[str]) -> None:
    """Record dropped fields against the most recent extract call."""
    from sqlalchemy import select

    from app.db.session import SessionLocal
    from app.models import AiCall

    async with SessionLocal() as db:
        call = await db.scalar(
            select(AiCall)
            .where(AiCall.task_id == task_id, AiCall.operation == "extract")
            .order_by(AiCall.id.desc())
            .limit(1)
        )
        if call is not None:
            existing = f"{call.error}\n" if call.error else ""
            call.error = existing + "; ".join(violations)
            await db.commit()


async def update_card(
    db: AsyncSession, task: Task, payload: Any, known: set[str], business_id: int
) -> Task:
    """Apply the business's edits, confirm the card and recalculate the rating."""
    editable = {"review", "published", "in_progress", "unpublished"}
    if task.status not in editable:
        raise InvalidStatusError()

    fields: dict[str, str] = {}
    code = payload.industry_code.strip().lower() if isinstance(payload.industry_code, str) else ""
    if code not in known:
        fields["industryCode"] = messages.unknown_industry(code or "—")

    title = payload.title.strip() if isinstance(payload.title, str) else ""
    if len(title) > TITLE_MAX:
        fields["title"] = messages.TITLE_TOO_LONG

    incoming: dict[str, str | None] = {}
    for field in CARD_FIELDS:
        raw = getattr(payload.fields, FIELD_COLUMNS[field], None)
        text = raw.strip() if isinstance(raw, str) else ""
        if len(text) > FIELD_MAX:
            fields[f"fields.{field}"] = messages.FIELD_TOO_LONG
        incoming[field] = text or None

    # A published task must stay publishable.
    if task.status in {"published", "in_progress"}:
        if not title:
            fields["title"] = messages.TITLE_REQUIRED
        if not incoming["need"]:
            fields["fields.need"] = messages.NEED_REQUIRED
    if fields:
        raise ValidationError(fields)

    meta = dict(task.field_meta or {})
    meta.setdefault("mode", "ai")
    previous = card_values(task)

    meta["title"] = _apply_edit(meta.get("title"), task.title or None, title or None)
    task.title = title
    task.industry_code = code

    for field in CARD_FIELDS:
        meta[field] = _apply_edit(meta.get(field), previous[field], incoming[field])
        setattr(task, FIELD_COLUMNS[field], incoming[field])
    task.field_meta = meta

    await _recalculate(task, business_id)
    task.confirmed_at = _now()
    await db.commit()
    return await reload(db, task.id)


def _apply_edit(stored: dict[str, Any] | None, old: str | None, new: str | None) -> dict[str, Any]:
    """Edited values become the business's own; untouched ones keep their provenance."""
    if not new:
        return dict(EMPTY_META)
    if stored is not None and (old or None) == new:
        return {
            "source": stored.get("source"),
            "confirmed": True,
            "sources": list(stored.get("sources") or []),
        }
    return {"source": "human", "confirmed": True, "sources": []}


async def _recalculate(task: Task, business_id: int) -> None:
    """Grade only the blocks whose text changed, then score all seven."""
    texts = rating_service.block_texts(card_values(task))
    carried = rating_service.reuse_assessments(texts, task.rating_breakdown)
    pending = {block: text for block, text in texts.items() if block not in carried}
    if pending:
        graded = await builder_ai.assess_blocks(
            texts=pending, task_id=task.id, business_id=business_id
        )
        carried.update(graded)
    task.rating, task.rating_breakdown = rating_service.build_breakdown(texts, carried)
    # Badges follow the rating everywhere: confirmation and post-publication edits alike.
    task.badges = recalc_badges(True, task.rating_breakdown, task.constraints)


# --- Publication ---------------------------------------------------------------


async def publish(db: AsyncSession, task: Task) -> Task:
    if task.status not in {"review", "unpublished"}:
        raise InvalidStatusError()
    if task.confirmed_at is None:
        raise CardNotConfirmedError()

    fields: dict[str, str] = {}
    if not (task.title or "").strip():
        fields["title"] = messages.TITLE_REQUIRED
    if not (task.need or "").strip():
        fields["fields.need"] = messages.NEED_REQUIRED
    if fields:
        raise ValidationError(fields)

    task.status = "published"
    task.published_at = _now()
    await db.commit()
    return await reload(db, task.id)


async def unpublish(db: AsyncSession, task: Task) -> Task:
    if task.status not in CATALOGUE_STATUSES:
        raise InvalidStatusError()
    task.status = "unpublished"
    await db.commit()
    return await reload(db, task.id)
