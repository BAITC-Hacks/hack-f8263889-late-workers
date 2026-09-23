"""The block table and its rounding rule."""

import pytest
from app.core.blocks import BLOCK_WEIGHTS, QUALITY_SHARES, round_half_up


def test_block_weights_sum_to_100() -> None:
    assert sum(BLOCK_WEIGHTS.values()) == 100


def test_every_quality_has_a_share() -> None:
    assert QUALITY_SHARES == {"missing": 0.0, "formal": 0.4, "partial": 0.7, "specific": 1.0}


@pytest.mark.parametrize(
    ("value", "expected"),
    [(0.5, 1), (1.5, 2), (2.5, 3), (13.999, 14), (14.0, 14), (0.4, 0), (7.0, 7)],
)
def test_round_half_up(value: float, expected: int) -> None:
    """Python's round() would give 0, 2, 2 for the first three — banker's rounding."""
    assert round_half_up(value) == expected
