"""The offline half of the builder.

Everything here is deterministic and never calls a model, so the constructor keeps
working end to end when OpenAI is unavailable — just with blunter questions and a
card assembled verbatim from what the business typed.
"""

import re
from typing import Any

from app.core.blocks import (
    BLOCK_CODES,
    BLOCK_NAMES,
    BLOCK_WEIGHTS,
    QUALITY_NAMES,
    QUALITY_ORDER,
    QUESTIONS_PER_ROUND,
)

# Three questions per block, in the order the spec lists them.
QUESTION_BANK: dict[str, tuple[str, ...]] = {
    "context_need": (
        "Что происходит сейчас и почему это проблема?",
        "Что должно измениться после работы команды?",
        "Как задача решается сейчас и что в этом не устраивает?",
    ),
    "data": (
        "Какие данные, примеры или документы вы можете передать команде?",
        "За какой период есть данные и в каком формате?",
        "Какие данные команде придётся собрать самостоятельно?",
    ),
    "result": (
        "Что команда должна передать вам в конце: отчёт, прототип, модель, сайт?",
        "Как вы будете пользоваться результатом после сдачи?",
        "Какой минимальный результат вас устроит?",
    ),
    "success_criteria": (
        "По какому измеримому признаку вы примете решение?",
        "Какие показатели должны измениться и до каких значений?",
        "Кто и как будет проверять результат?",
    ),
    "constraints": (
        "К какому сроку нужен результат?",
        "Есть ли требования к технологиям или платформе?",
        "Какие доступы или согласования понадобятся команде?",
    ),
    "users": (
        "Кто будет пользоваться решением?",
        "Сколько человек будут пользоваться решением и как часто?",
        "Как эти люди решают задачу сейчас?",
    ),
    "business_link": (
        "Как часто вы готовы созваниваться с командой?",
        "В каком канале и за какое время вы отвечаете на вопросы команды?",
        "Кто со стороны бизнеса принимает результат?",
    ),
}

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?…])\s+|\n+")
_LIST_ITEM = re.compile(r"^\s*([-•]|\d+\.)", re.MULTILINE)
_TITLE_LIMIT = 80


def normalize_question(text: str) -> str:
    """Questions are compared ignoring case and surrounding whitespace."""
    return " ".join(text.split()).casefold()


def split_sentences(text: str) -> list[str]:
    """Sentences by ., !, ?, … followed by space, and by newlines. Empties dropped."""
    return [part.strip() for part in _SENTENCE_SPLIT.split(text or "") if part.strip()]


def block_order(assessment: dict[str, str]) -> list[str]:
    """Worst quality first; within a quality, the heaviest block first."""
    return sorted(
        BLOCK_CODES,
        key=lambda block: (
            QUALITY_ORDER.get(assessment.get(block, "missing"), 0),
            -BLOCK_WEIGHTS[block],
        ),
    )


def fallback_assessment(answered_blocks: set[str], has_draft: bool) -> list[dict[str, Any]]:
    """What can be said about a draft without a model."""
    entries: list[dict[str, Any]] = []
    for block in BLOCK_CODES:
        if block in answered_blocks:
            quality, reason = "partial", "Есть ответ на уточняющий вопрос"
        elif block == "context_need" and has_draft:
            quality, reason = "partial", "Есть исходное описание"
        elif block == "business_link":
            quality, reason = "partial", "Контакт взят из профиля"
        else:
            quality, reason = "missing", "Сведения не найдены"
        entries.append(
            {
                "block": block,
                "name": BLOCK_NAMES[block],
                "quality": {"code": quality, "name": QUALITY_NAMES[quality]},
                "reason": reason,
            }
        )
    return entries


def pick_bank_questions(
    assessment: list[dict[str, Any]], asked: set[str], limit: int = QUESTIONS_PER_ROUND
) -> list[tuple[str, str]]:
    """Questions from the bank, worst blocks first, skipping anything already asked."""
    quality_by_block = {entry["block"]: entry["quality"]["code"] for entry in assessment}
    picked: list[tuple[str, str]] = []
    for block in block_order(quality_by_block):
        for question in QUESTION_BANK[block]:
            if len(picked) >= limit:
                return picked
            if normalize_question(question) not in asked:
                picked.append((block, question))
                asked.add(normalize_question(question))
                break  # one question per block per round, then move on
    # Not enough distinct blocks left: take further questions from the same blocks.
    for block in block_order(quality_by_block):
        for question in QUESTION_BANK[block]:
            if len(picked) >= limit:
                return picked
            if normalize_question(question) not in asked:
                picked.append((block, question))
                asked.add(normalize_question(question))
    return picked


def fallback_title(draft_text: str) -> str:
    """The first sentence, cut to 80 characters on a word boundary."""
    sentences = split_sentences(draft_text)
    title = sentences[0] if sentences else (draft_text or "").strip()
    if len(title) <= _TITLE_LIMIT:
        return title
    cut = title[:_TITLE_LIMIT]
    if " " in cut:
        cut = cut[: cut.rindex(" ")]
    return cut + "…"


def heuristic_quality(text: str) -> tuple[str, str]:
    """Stand-in for the model's judgement of one block."""
    stripped = text.strip()
    if not stripped:
        return "missing", "Поле не заполнено"
    if len(stripped) < 40:
        return "formal", "Оценено по эвристике: короткий текст"
    has_digit = any(char.isdigit() for char in stripped)
    has_link = "http" in stripped
    has_list = len(_LIST_ITEM.findall(stripped)) >= 2
    if len(stripped) >= 80 and (has_digit or has_link or has_list):
        return "specific", "Оценено по эвристике: подробный текст с деталями"
    return "partial", "Оценено по эвристике: текст без проверяемых деталей"
