"""The seven quality blocks a task card is scored on.

Single source of truth: the AI prompts, the fallback heuristics, the rating and the
question bank all read the weights and codes from here.
"""

from decimal import ROUND_HALF_UP, Decimal

# (code, name, weight, card fields that make up the block)
BLOCKS: tuple[tuple[str, str, int, tuple[str, ...]], ...] = (
    ("context_need", "Контекст и потребность", 20, ("context", "need")),
    ("data", "Данные и материалы", 20, ("dataMaterials",)),
    ("result", "Ожидаемый результат", 15, ("expectedResult",)),
    ("success_criteria", "Критерии успеха", 15, ("successCriteria",)),
    ("constraints", "Ограничения", 10, ("constraints",)),
    ("users", "Пользователи", 10, ("targetUsers",)),
    ("business_link", "Связь с бизнесом", 10, ("contact", "interactionFormat")),
)

BLOCK_CODES: tuple[str, ...] = tuple(code for code, _, _, _ in BLOCKS)
BLOCK_NAMES: dict[str, str] = {code: name for code, name, _, _ in BLOCKS}
BLOCK_WEIGHTS: dict[str, int] = {code: weight for code, _, weight, _ in BLOCKS}
BLOCK_FIELDS: dict[str, tuple[str, ...]] = {code: fields for code, _, _, fields in BLOCKS}

# Labels used when a block's fields are joined into one text for assessment.
FIELD_LABELS: dict[str, str] = {
    "context": "Контекст",
    "need": "Потребность",
    "dataMaterials": "Данные",
    "expectedResult": "Результат",
    "successCriteria": "Критерии успеха",
    "constraints": "Ограничения",
    "targetUsers": "Пользователи",
    "contact": "Контакт",
    "interactionFormat": "Формат взаимодействия",
}

QUALITY_NAMES: dict[str, str] = {
    "missing": "Пусто",
    "formal": "Формально",
    "partial": "Неполно",
    "specific": "Конкретно",
}
QUALITY_SHARES: dict[str, float] = {
    "missing": 0.0,
    "formal": 0.4,
    "partial": 0.7,
    "specific": 1.0,
}
QUALITY_CODES: tuple[str, ...] = tuple(QUALITY_NAMES)
# Worst first: the order questions are asked in.
QUALITY_ORDER: dict[str, int] = {code: index for index, code in enumerate(QUALITY_CODES)}

# The nine card fields, in contract order.
CARD_FIELDS: tuple[str, ...] = (
    "context",
    "need",
    "targetUsers",
    "dataMaterials",
    "constraints",
    "expectedResult",
    "successCriteria",
    "contact",
    "interactionFormat",
)
# camelCase contract name -> snake_case column on Task.
FIELD_COLUMNS: dict[str, str] = {
    "context": "context",
    "need": "need",
    "targetUsers": "target_users",
    "dataMaterials": "data_materials",
    "constraints": "constraints",
    "expectedResult": "expected_result",
    "successCriteria": "success_criteria",
    "contact": "contact",
    "interactionFormat": "interaction_format",
}

MAX_ROUNDS = 3
QUESTIONS_PER_ROUND = 5
MIN_QUESTIONS_PER_ROUND = 3


def round_half_up(value: float) -> int:
    """Round .5 away from zero.

    Python's built-in round() is banker's rounding — round(0.5) is 0 — which would
    quietly cost a point on every half-value the spec expects to round up.
    """
    return int(Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
