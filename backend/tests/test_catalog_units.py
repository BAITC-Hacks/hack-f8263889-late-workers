"""Pure catalogue rules: level boundaries and the need excerpt."""

import pytest
from app.api.catalog_params import parse_page, split_codes
from app.core.catalog import level_for, need_excerpt


@pytest.mark.parametrize(
    ("rating", "code"),
    [
        (0, "needs_clarification"),
        (39, "needs_clarification"),
        (40, "working"),
        (69, "working"),
        (70, "ready"),
        (89, "ready"),
        (90, "priority"),
        (100, "priority"),
    ],
)
def test_level_for(rating: int, code: str) -> None:
    assert level_for(rating)[0] == code


def test_level_for_out_of_range_clamps() -> None:
    assert level_for(-5)[0] == "needs_clarification"
    assert level_for(500)[0] == "priority"


def test_need_excerpt_trims_and_cuts() -> None:
    assert need_excerpt("  краткое описание  ") == "краткое описание"
    assert need_excerpt(None) == ""
    assert need_excerpt("я" * 200) == "я" * 200  # exactly at the limit, no ellipsis
    cut = need_excerpt("я" * 201)
    assert cut.endswith("…") and len(cut) == 201  # 200 characters plus one ellipsis


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("horeca,it", ["horeca", "it"]),
        (" HoReCa , IT ", ["horeca", "it"]),
        ("horeca,,it,", ["horeca", "it"]),
        ("horeca,horeca", ["horeca"]),
        ("", []),
        (None, []),
    ],
)
def test_split_codes(raw: str | None, expected: list[str]) -> None:
    assert split_codes(raw) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [(None, 1), ("1", 1), (" 3 ", 3), ("0", None), ("-1", None), ("abc", None), ("1.5", None)],
)
def test_parse_page(raw: str | None, expected: int | None) -> None:
    assert parse_page(raw) == expected
