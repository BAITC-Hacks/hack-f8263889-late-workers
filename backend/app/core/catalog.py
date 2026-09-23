"""Reference data for the task catalogue: industries, statuses, levels.

Single source of truth. The migration seeds `industries` from `INDUSTRIES`, and the
test bootstrap (which builds the schema with `create_all`, not Alembic) inserts the
same rows — so the two can never drift.
"""

# Order matters: GET /api/industries returns them exactly like this.
INDUSTRIES: tuple[tuple[str, str], ...] = (
    ("retail", "Ритейл"),
    ("logistics", "Логистика"),
    ("finance", "Финансы"),
    ("education", "Образование"),
    ("healthcare", "Здравоохранение"),
    ("horeca", "HoReCa"),
    ("manufacturing", "Производство"),
    ("it", "IT"),
    ("government", "Госсектор"),
    ("other", "Другое"),
)

STATUS_NAMES: dict[str, str] = {
    "draft": "Черновик",
    "clarifying": "Уточнение",
    "review": "На проверке",
    "published": "Опубликована",
    "in_progress": "В работе",
    "unpublished": "Снята с публикации",
    "completed": "Завершена",
}

# The only statuses the catalogue shows, and the only ones a student may save.
CATALOGUE_STATUSES: tuple[str, ...] = ("published", "in_progress")

# (code, name, min_rating, max_rating) — bounds inclusive, covering 0..100 with no gaps.
LEVELS: tuple[tuple[str, str, int, int], ...] = (
    ("needs_clarification", "Требует уточнения", 0, 39),
    ("working", "Рабочая", 40, 69),
    ("ready", "Готовая", 70, 89),
    ("priority", "Приоритетная", 90, 100),
)

LEVEL_CODES: tuple[str, ...] = tuple(code for code, _, _, _ in LEVELS)
LEVEL_RANGES: dict[str, tuple[int, int]] = {code: (low, high) for code, _, low, high in LEVELS}

SORT_OPTIONS: tuple[str, ...] = ("rating", "date", "responses")
PAGE_SIZE = 20
NEED_EXCERPT_LENGTH = 200


def level_for(rating: int) -> tuple[str, str]:
    """The level a rating falls into, as (code, name).

    Never stored — derived on every response, and the same table drives the
    `level` query filter, so the two can't disagree.
    """
    for code, name, low, high in LEVELS:
        if low <= rating <= high:
            return code, name
    # Out of the 0..100 range the spec promises; clamp rather than raise, so one bad
    # row can't take down a whole page of the catalogue.
    return (LEVELS[0][0], LEVELS[0][1]) if rating < 0 else (LEVELS[-1][0], LEVELS[-1][1])


def status_name(code: str) -> str:
    return STATUS_NAMES.get(code, code)


def need_excerpt(need: str | None) -> str:
    """`need`, trimmed, cut to 200 characters with a single-character ellipsis."""
    text = (need or "").strip()
    if len(text) <= NEED_EXCERPT_LENGTH:
        return text
    return text[:NEED_EXCERPT_LENGTH] + "…"
