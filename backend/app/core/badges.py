"""Badges: the catalogue's shorthand for a card's strong sides.

Awarded from the confirmed card only — `rating_breakdown` (block qualities) plus,
for `clear_scope`, the literal text of the constraints field. Pure functions, no DB.
"""

import re
from typing import Any

# (code, name, condition) — the order is the contract's and every response keeps it.
BADGES: tuple[tuple[str, str, str], ...] = (
    (
        "complete",
        "Всё заполнено",
        "Все 7 блоков карточки заполнены хотя бы на 70%",
    ),
    (
        "has_data",
        "Есть данные",
        "Блок «Данные и материалы» заполнен конкретно: что за данные, объём, формат",
    ),
    (
        "measurable",
        "Измеримый результат",
        "Критерии успеха содержат показатель и целевое значение",
    ),
    (
        "clear_scope",
        "Понятные рамки",
        "Блок «Ограничения» заполнен хотя бы на 70% и в нём указан срок",
    ),
    (
        "open_dialog",
        "Открыт к диалогу",
        "Указаны контакт и формат консультаций и обратной связи",
    ),
)

BADGE_CODES: tuple[str, ...] = tuple(code for code, _, _ in BADGES)
BADGE_NAMES: dict[str, str] = {code: name for code, name, _ in BADGES}

# "at least 70%" in quality terms: partial (0.7) or specific (1.0).
_AT_LEAST_PARTIAL = {"partial", "specific"}

# A deadline in free text: an amount of days/weeks/months, a numeric date, or a
# Russian month name.
_DEADLINE = re.compile(
    r"\d+\s*(дн|день|дня|дней|нед|месяц|мес)"
    r"|\d{1,2}\.\d{1,2}(\.\d{2,4})?"
    r"|январ|феврал|март|апрел|ма[йея]|июн|июл|август|сентябр|октябр|ноябр|декабр",
    re.IGNORECASE,
)


def badge_name(code: str) -> str:
    return BADGE_NAMES.get(code, code)


def has_deadline(text: str) -> bool:
    return _DEADLINE.search(text) is not None


def recalc_badges(
    confirmed: bool,
    breakdown: list[dict[str, Any]] | None,
    constraints_text: str | None,
) -> list[str]:
    """The task's badge codes, in reference order. Unconfirmed cards earn nothing."""
    if not confirmed or not breakdown:
        return []
    quality = {entry["block"]: entry["quality"]["code"] for entry in breakdown}

    earned: list[str] = []
    if all(quality.get(block) in _AT_LEAST_PARTIAL for block in quality) and len(quality) == 7:
        earned.append("complete")
    if quality.get("data") == "specific":
        earned.append("has_data")
    if quality.get("success_criteria") == "specific":
        earned.append("measurable")
    if quality.get("constraints") in _AT_LEAST_PARTIAL and has_deadline(constraints_text or ""):
        earned.append("clear_scope")
    if quality.get("business_link") == "specific":
        earned.append("open_dialog")
    return earned
