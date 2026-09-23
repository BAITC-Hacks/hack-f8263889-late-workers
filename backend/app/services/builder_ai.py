"""The three AI operations and their post-processing.

Each one returns the same shape whether it came from the model or from the fallback,
so the caller never branches on availability — only `mode` differs.
"""

import logging
import re
from typing import Any

from pydantic import BaseModel

from app.core.blocks import (
    BLOCK_CODES,
    BLOCK_NAMES,
    CARD_FIELDS,
    MIN_QUESTIONS_PER_ROUND,
    QUALITY_CODES,
    QUALITY_NAMES,
    QUESTIONS_PER_ROUND,
)
from app.services import prompts
from app.services.ai_client import AIResponseInvalid, AIUnavailable, call_structured
from app.services.fallback import (
    block_order,
    fallback_assessment,
    fallback_title,
    heuristic_quality,
    normalize_question,
    pick_bank_questions,
)

logger = logging.getLogger(__name__)

REASON_LIMIT = 200
QUESTION_LIMIT = 300
TITLE_LIMIT = 120
FIELD_LIMIT = 2000

# A number the model may not invent: digits with an optional decimal part.
_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")

# The nine card fields minus `contact`, which always comes from the profile.
EXTRACT_FIELDS = tuple(field for field in CARD_FIELDS if field != "contact")


# --- Model schemas -----------------------------------------------------------
# Every field is required (Structured Outputs demands it); "no value" is null.


class BlockAssessment(BaseModel):
    block: str
    quality: str
    reason: str


class DraftQuestion(BaseModel):
    block: str
    text: str


class AnalyzeOut(BaseModel):
    assessment: list[BlockAssessment]
    questions: list[DraftQuestion]


class ExtractedField(BaseModel):
    value: str | None
    sources: list[str]


class ExtractFields(BaseModel):
    """Explicit fields, not a dict: strict Structured Outputs rejects open maps."""

    context: ExtractedField
    need: ExtractedField
    targetUsers: ExtractedField
    dataMaterials: ExtractedField
    constraints: ExtractedField
    expectedResult: ExtractedField
    successCriteria: ExtractedField
    interactionFormat: ExtractedField


class ExtractOut(BaseModel):
    title: ExtractedField
    fields: ExtractFields


class AssessOut(BaseModel):
    blocks: list[BlockAssessment]


# --- Validators --------------------------------------------------------------


def _validate_analyze(out: AnalyzeOut) -> None:
    seen = [entry.block for entry in out.assessment]
    if sorted(seen) != sorted(BLOCK_CODES):
        raise AIResponseInvalid("нужны ровно семь блоков, каждый по одному разу")
    for entry in out.assessment:
        if entry.quality not in QUALITY_CODES:
            raise AIResponseInvalid(f"неизвестное качество: {entry.quality}")
        if len(entry.reason) > REASON_LIMIT:
            raise AIResponseInvalid(f"reason длиннее {REASON_LIMIT} символов")
    for question in out.questions:
        if question.block not in BLOCK_CODES:
            raise AIResponseInvalid(f"неизвестный блок: {question.block}")
        if len(question.text) > QUESTION_LIMIT:
            raise AIResponseInvalid(f"вопрос длиннее {QUESTION_LIMIT} символов")


def _validate_extract(out: ExtractOut) -> None:
    if out.title.value is not None and len(out.title.value) > TITLE_LIMIT:
        raise AIResponseInvalid(f"title длиннее {TITLE_LIMIT} символов")
    for name in EXTRACT_FIELDS:
        field = getattr(out.fields, name)
        if field.value is not None and len(field.value) > FIELD_LIMIT:
            raise AIResponseInvalid(f"поле {name} длиннее {FIELD_LIMIT} символов")


def _validate_assess(expected: set[str]):
    def validate(out: AssessOut) -> None:
        seen = [entry.block for entry in out.blocks]
        if sorted(seen) != sorted(expected):
            raise AIResponseInvalid("оценены не те блоки, что переданы")
        for entry in out.blocks:
            if entry.quality not in QUALITY_CODES:
                raise AIResponseInvalid(f"неизвестное качество: {entry.quality}")
            if len(entry.reason) > REASON_LIMIT:
                raise AIResponseInvalid(f"reason длиннее {REASON_LIMIT} символов")

    return validate


# --- analyze -----------------------------------------------------------------


def _order_questions(
    questions: list[tuple[str, str]], assessment: list[dict[str, Any]]
) -> list[tuple[str, str]]:
    quality_by_block = {entry["block"]: entry["quality"]["code"] for entry in assessment}
    ranking = {block: index for index, block in enumerate(block_order(quality_by_block))}
    return sorted(questions, key=lambda item: ranking.get(item[0], len(ranking)))


async def analyze(
    *,
    draft_text: str,
    industry_name: str,
    history: list[dict[str, Any]],
    asked: set[str],
    task_id: int,
    business_id: int,
) -> tuple[str, list[dict[str, Any]], list[tuple[str, str]]]:
    """Assess the draft and pick this round's questions.

    Returns (mode, assessment, [(block, question)]).
    """
    answered_blocks = {entry["block"] for entry in history if entry.get("answer")}
    try:
        out = await call_structured(
            operation="analyze",
            prompt_version=prompts.ANALYZE_VERSION,
            system_prompt=prompts.ANALYZE_PROMPT,
            user_payload={
                "draft_text": draft_text,
                "industry": industry_name,
                "previous_questions": history,
            },
            response_model=AnalyzeOut,
            validate=_validate_analyze,
            task_id=task_id,
            business_id=business_id,
        )
    except AIUnavailable as exc:
        logger.info("analyze falling back: %s", exc)
        assessment = fallback_assessment(answered_blocks, bool(draft_text))
        return "fallback", assessment, pick_bank_questions(assessment, set(asked))

    assessment = [
        {
            "block": entry.block,
            "name": BLOCK_NAMES[entry.block],
            "quality": {"code": entry.quality, "name": QUALITY_NAMES[entry.quality]},
            "reason": entry.reason,
        }
        for entry in out.assessment
    ]
    # Drop anything already asked, order worst-block-first, keep five.
    fresh: list[tuple[str, str]] = []
    seen = set(asked)
    for question in out.questions:
        key = normalize_question(question.text)
        if key not in seen:
            seen.add(key)
            fresh.append((question.block, question.text))
    picked = _order_questions(fresh, assessment)[:QUESTIONS_PER_ROUND]

    if len(picked) < MIN_QUESTIONS_PER_ROUND:
        # Top up from the bank rather than send the business a thin round.
        picked += pick_bank_questions(assessment, seen, limit=QUESTIONS_PER_ROUND - len(picked))
    return "ai", assessment, picked[:QUESTIONS_PER_ROUND]


# --- extract -----------------------------------------------------------------


def _numbers(text: str) -> set[str]:
    return {match.group().replace(",", ".") for match in _NUMBER.finditer(text)}


def check_sources(value: str | None, sources: list[str], fragments: dict[str, str]) -> str | None:
    """Why this extracted value must be dropped, or None when it may stay.

    This is the guard against invented facts: a value may only carry numbers that
    actually appear in the fragments it cites.
    """
    if value is None or not value.strip():
        return None
    unknown = [source for source in sources if source not in fragments]
    if unknown:
        return f"источник не из фрагментов: {unknown[0]}"
    if not sources:
        return "непустое значение без источников"
    cited = " ".join(fragments[source] for source in sources)
    invented = _numbers(value) - _numbers(cited)
    if invented:
        return f"число {sorted(invented)[0]} отсутствует в источниках"
    return None


def _fallback_card(
    draft_text: str, fragments: dict[str, str], answers: list[dict[str, Any]]
) -> tuple[dict[str, Any], list[str]]:
    """Assemble the card verbatim: the draft becomes the need, answers fill their blocks."""
    draft_ids = [key for key in fragments if key.startswith("D")]
    card: dict[str, Any] = {field: {"value": None, "sources": []} for field in EXTRACT_FIELDS}
    card["need"] = {"value": draft_text.strip() or None, "sources": draft_ids}
    title = {"value": fallback_title(draft_text), "sources": draft_ids[:1]}

    by_field: dict[str, list[tuple[str, str]]] = {}
    for answer in answers:
        field = _BLOCK_TO_FIELD.get(answer["block"])
        if field and answer.get("text"):
            by_field.setdefault(field, []).append((answer["id"], answer["text"]))
    for field, entries in by_field.items():
        card[field] = {
            "value": "\n\n".join(text for _, text in entries),
            "sources": [fragment_id for fragment_id, _ in entries],
        }
    return {"title": title, "fields": card}, draft_ids


# Which card field an answer about a block lands in when there is no model.
_BLOCK_TO_FIELD: dict[str, str] = {
    "context_need": "context",
    "data": "dataMaterials",
    "result": "expectedResult",
    "success_criteria": "successCriteria",
    "constraints": "constraints",
    "users": "targetUsers",
    "business_link": "interactionFormat",
}


async def extract_card(
    *,
    draft_text: str,
    fragments: dict[str, str],
    answers: list[dict[str, Any]],
    task_id: int,
    business_id: int,
) -> tuple[str, dict[str, Any], list[str]]:
    """Build the card from the fragments. Returns (mode, card, violations)."""
    payload = {
        "fragments": [
            {"id": key, "text": text, "question": _question_for(key, answers)}
            for key, text in fragments.items()
        ]
    }
    try:
        out = await call_structured(
            operation="extract",
            prompt_version=prompts.EXTRACT_VERSION,
            system_prompt=prompts.EXTRACT_PROMPT,
            user_payload=payload,
            response_model=ExtractOut,
            validate=_validate_extract,
            task_id=task_id,
            business_id=business_id,
        )
    except AIUnavailable as exc:
        logger.info("extract falling back: %s", exc)
        card, _ = _fallback_card(draft_text, fragments, answers)
        return "fallback", card, []

    violations: list[str] = []

    def keep(name: str, field: ExtractedField) -> dict[str, Any]:
        problem = check_sources(field.value, field.sources, fragments)
        if problem is not None:
            violations.append(f"{name}: {problem}")
            return {"value": None, "sources": []}
        return {"value": (field.value or None), "sources": field.sources}

    card = {
        "title": keep("title", out.title),
        "fields": {name: keep(name, getattr(out.fields, name)) for name in EXTRACT_FIELDS},
    }
    return "ai", card, violations


def _question_for(fragment_id: str, answers: list[dict[str, Any]]) -> str | None:
    """An answer fragment carries its question as context; a draft sentence has none."""
    for answer in answers:
        if answer["id"] == fragment_id:
            return answer.get("question")
    return None


async def assess_blocks(
    *, texts: dict[str, str], task_id: int, business_id: int
) -> dict[str, tuple[str, str, str]]:
    """Grade the non-empty blocks. Empty ones never reach the model."""
    filled = {block: text for block, text in texts.items() if text.strip()}
    result: dict[str, tuple[str, str, str]] = {
        block: ("missing", "Поле не заполнено", "ai") for block in texts if block not in filled
    }
    if not filled:
        return result

    try:
        out = await call_structured(
            operation="assess",
            prompt_version=prompts.ASSESS_VERSION,
            system_prompt=prompts.ASSESS_PROMPT,
            user_payload={"blocks": [{"block": b, "text": t} for b, t in filled.items()]},
            response_model=AssessOut,
            validate=_validate_assess(set(filled)),
            task_id=task_id,
            business_id=business_id,
        )
    except AIUnavailable as exc:
        logger.info("assess falling back: %s", exc)
        for block, text in filled.items():
            quality, reason = heuristic_quality(text)
            result[block] = (quality, reason, "fallback")
        return result

    for entry in out.blocks:
        result[entry.block] = (entry.quality, entry.reason, "ai")
    return result
