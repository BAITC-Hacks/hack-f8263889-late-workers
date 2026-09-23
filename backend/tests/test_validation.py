"""Unit tests for the pure validation rules. No database, no HTTP."""

import pytest
from app.core.validation import (
    is_valid_password,
    normalize_email,
    normalize_phone,
    normalize_tags,
    normalize_text,
)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("  OWNER@Zerno.KZ  ", "owner@zerno.kz"),  # trimmed and fully lowercased
        ("arman@student.kz", "arman@student.kz"),
        ("nope", None),
        ("", None),
        (None, None),
        (123, None),
    ],
)
def test_normalize_email(value: object, expected: str | None) -> None:
    assert normalize_email(value) == expected


@pytest.mark.parametrize(
    ("value", "valid"),
    [
        ("abcdefg1", True),  # exactly 8, a letter and a digit
        ("coffee2026", True),
        ("парольь1", True),  # Cyrillic counts as letters
        ("abcdef1", False),  # 7 characters
        ("abcdefgh", False),  # no digit
        ("12345678", False),  # no letter
        (12345678, False),
        (None, False),
    ],
)
def test_is_valid_password(value: object, valid: bool) -> None:
    assert is_valid_password(value) is valid


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("+7 (701) 123-45-67", "+77011234567"),
        ("+7-701-123-45-67", "+77011234567"),
        ("87011234567", "87011234567"),
        ("123", None),  # too few digits
        ("+7701123456789012", None),  # too many digits
        ("", None),
        (None, None),
    ],
)
def test_normalize_phone(value: object, expected: str | None) -> None:
    assert normalize_phone(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ([" React ", "react", "Python"], ["React", "Python"]),  # trim, then case-insensitive dedup
        ([], []),
        (None, []),  # missing means "no tags"
        (["👍"], ["👍"]),
        (["  "], None),  # empty after trimming is an error, not a silent drop
        (["x" * 51], None),
        ([1], None),
        ("react", None),  # not a list
        (["tag"] * 21, ["tag"]),  # 21 raw entries, one after dedup
        ([f"tag{i}" for i in range(21)], None),  # 21 distinct tags exceeds the limit
    ],
)
def test_normalize_tags(value: object, expected: list[str] | None) -> None:
    assert normalize_tags(value) == expected


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        ("Кофейня «Зерно»", "Кофейня «Зерно»"),  # unicode, guillemets count toward length
        ("  Ab  ", "Ab"),
        ("   ", None),  # whitespace-only is too short once trimmed
        ("A", None),
        ("x" * 201, None),
        (None, None),
    ],
)
def test_normalize_text(value: object, expected: str | None) -> None:
    assert normalize_text(value, min_length=2, max_length=200) == expected
