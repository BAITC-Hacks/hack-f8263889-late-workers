"""recalc_badges and the deadline detector, rule by rule."""

import pytest
from app.core.badges import BADGE_CODES, BADGES, has_deadline, recalc_badges

ALL_SPECIFIC = [
    {"block": block, "quality": {"code": "specific"}}
    for block in (
        "context_need",
        "data",
        "result",
        "success_criteria",
        "constraints",
        "users",
        "business_link",
    )
]


def with_quality(**overrides: str) -> list[dict]:
    return [
        {"block": e["block"], "quality": {"code": overrides.get(e["block"], "specific")}}
        for e in ALL_SPECIFIC
    ]


def test_a_perfect_card_earns_everything() -> None:
    assert recalc_badges(True, ALL_SPECIFIC, "Срок — 6 недель") == list(BADGE_CODES)


def test_an_unconfirmed_card_earns_nothing() -> None:
    assert recalc_badges(False, ALL_SPECIFIC, "Срок — 6 недель") == []
    assert recalc_badges(True, None, "Срок — 6 недель") == []


def test_complete_requires_every_block_at_least_partial() -> None:
    assert "complete" in recalc_badges(True, with_quality(users="partial"), "")
    assert "complete" not in recalc_badges(True, with_quality(users="formal"), "")
    assert "complete" not in recalc_badges(True, with_quality(users="missing"), "")


@pytest.mark.parametrize(
    ("badge", "block"),
    [("has_data", "data"), ("measurable", "success_criteria"), ("open_dialog", "business_link")],
)
def test_specific_only_badges(badge: str, block: str) -> None:
    assert badge in recalc_badges(True, ALL_SPECIFIC, "")
    assert badge not in recalc_badges(True, with_quality(**{block: "partial"}), "")


def test_clear_scope_needs_both_quality_and_a_deadline() -> None:
    assert "clear_scope" in recalc_badges(True, with_quality(constraints="partial"), "6 недель")
    assert "clear_scope" not in recalc_badges(True, with_quality(constraints="formal"), "6 недель")
    assert "clear_scope" not in recalc_badges(True, ALL_SPECIFIC, "Решение работает в браузере")


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("Срок — 6 недель", True),
        ("сделать за 30 ДНЕЙ", True),  # case-insensitive
        ("до 15.03", True),
        ("к 01.12.2026", True),
        ("готово в марте", True),
        ("нужно к маю", True),
        ("Решение работает в браузере", False),
        ("", False),
    ],
)
def test_deadline_detection(text: str, expected: bool) -> None:
    assert has_deadline(text) is expected


def test_badges_keep_reference_order() -> None:
    earned = recalc_badges(True, ALL_SPECIFIC, "Срок — 6 недель")
    assert earned == [code for code, _, _ in BADGES]
