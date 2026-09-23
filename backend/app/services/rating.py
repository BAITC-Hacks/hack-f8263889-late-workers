"""Rating: block texts, their hashes, and the 0-100 score.

The rating must be stable: confirming an unchanged card twice may not move it, and
must not re-ask the model about blocks whose text did not change.
"""

import hashlib
from typing import Any

from app.core.blocks import (
    BLOCK_CODES,
    BLOCK_FIELDS,
    BLOCK_NAMES,
    BLOCK_WEIGHTS,
    FIELD_LABELS,
    QUALITY_NAMES,
    QUALITY_SHARES,
    round_half_up,
)
from app.core.catalog import level_for

EMPTY_REASON = "Поле не заполнено"


def block_text(values: dict[str, str | None], block: str) -> str:
    """The block's non-empty fields, labelled, one per line."""
    lines = [
        f"{FIELD_LABELS[field]}: {values[field].strip()}"
        for field in BLOCK_FIELDS[block]
        if (values.get(field) or "").strip()
    ]
    return "\n".join(lines)


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def block_texts(values: dict[str, str | None]) -> dict[str, str]:
    return {block: block_text(values, block) for block in BLOCK_CODES}


def changed_blocks(texts: dict[str, str], previous: list[dict[str, Any]] | None) -> list[str]:
    """Blocks whose text differs from the last rating — the only ones worth re-assessing."""
    known = {entry["block"]: entry.get("textHash") for entry in previous or []}
    return [block for block, text in texts.items() if known.get(block) != text_hash(text)]


def reuse_assessments(
    texts: dict[str, str], previous: list[dict[str, Any]] | None
) -> dict[str, tuple[str, str, str]]:
    """Assessments carried over from the previous rating, keyed by block."""
    known = {entry["block"]: entry for entry in previous or []}
    carried: dict[str, tuple[str, str, str]] = {}
    for block, text in texts.items():
        entry = known.get(block)
        if entry is not None and entry.get("textHash") == text_hash(text):
            carried[block] = (entry["quality"]["code"], entry["reason"], entry["mode"])
    return carried


def build_breakdown(
    texts: dict[str, str], assessments: dict[str, tuple[str, str, str]]
) -> tuple[int, list[dict[str, Any]]]:
    """Score every block and return (rating, breakdown).

    `textHash` is stored so the next confirmation can skip unchanged blocks; it is
    stripped before the breakdown reaches the API.
    """
    breakdown: list[dict[str, Any]] = []
    rating = 0
    for block in BLOCK_CODES:
        quality, reason, mode = assessments.get(block, ("missing", EMPTY_REASON, "fallback"))
        weight = BLOCK_WEIGHTS[block]
        points = round_half_up(weight * QUALITY_SHARES[quality])
        rating += points
        breakdown.append(
            {
                "block": block,
                "name": BLOCK_NAMES[block],
                "quality": {"code": quality, "name": QUALITY_NAMES[quality]},
                "points": points,
                "maxPoints": weight,
                "reason": reason,
                "mode": mode,
                "textHash": text_hash(texts[block]),
            }
        )
    return rating, breakdown


def public_breakdown(breakdown: list[dict[str, Any]] | None) -> list[dict[str, Any]] | None:
    """The stored breakdown without `textHash`, which is an implementation detail."""
    if breakdown is None:
        return None
    return [{k: v for k, v in entry.items() if k != "textHash"} for entry in breakdown]


def level_of(rating: int) -> dict[str, str]:
    code, name = level_for(rating)
    return {"code": code, "name": name}
