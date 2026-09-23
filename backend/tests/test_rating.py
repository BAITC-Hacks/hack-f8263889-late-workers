"""Rating arithmetic and the reuse of unchanged assessments."""

from app.core.blocks import BLOCK_CODES
from app.services.rating import (
    block_text,
    block_texts,
    build_breakdown,
    changed_blocks,
    public_breakdown,
    reuse_assessments,
)

# The worked example from the contract: 14 + 20 + 15 + 15 + 10 + 0 + 10 = 84.
CONTRACT_ASSESSMENTS = {
    "context_need": ("partial", "Ситуация описана, объём списаний не указан", "ai"),
    "data": ("specific", "Указаны источник, период и формат данных", "ai"),
    "result": ("specific", "Назван результат и его содержание", "ai"),
    "success_criteria": ("specific", "Есть измеримый порог: с 15% до 8%", "ai"),
    "constraints": ("specific", "Указаны срок и платформа", "ai"),
    "users": ("missing", "Поле не заполнено", "ai"),
    "business_link": ("specific", "Есть контакт и формат связи", "ai"),
}

FILLED = {
    "context": "4 кофейни в Астане.",
    "need": "Списывается много выпечки.",
    "targetUsers": None,
    "dataMaterials": "Выгрузка продаж за 12 месяцев.",
    "constraints": "Срок 6 недель.",
    "expectedResult": "Веб-страница с прогнозом.",
    "successCriteria": "Списания с 15% до 8%.",
    "contact": "Айгерим, +77011234567",
    "interactionFormat": "Созвон раз в неделю.",
}


def test_the_contract_example_scores_84_and_reads_as_ready() -> None:
    rating, breakdown = build_breakdown(block_texts(FILLED), CONTRACT_ASSESSMENTS)
    assert rating == 84
    points = {entry["block"]: entry["points"] for entry in breakdown}
    assert points == {
        "context_need": 14,
        "data": 20,
        "result": 15,
        "success_criteria": 15,
        "constraints": 10,
        "users": 0,
        "business_link": 10,
    }


def test_an_empty_card_scores_zero() -> None:
    empty = dict.fromkeys(FILLED, None)
    rating, breakdown = build_breakdown(block_texts(empty), {})
    assert rating == 0
    assert {entry["quality"]["code"] for entry in breakdown} == {"missing"}


def test_block_text_labels_and_skips_empty_fields() -> None:
    assert block_text(FILLED, "context_need") == (
        "Контекст: 4 кофейни в Астане.\nПотребность: Списывается много выпечки."
    )
    assert block_text(FILLED, "users") == ""


def test_unchanged_blocks_are_not_reassessed() -> None:
    texts = block_texts(FILLED)
    _, breakdown = build_breakdown(texts, CONTRACT_ASSESSMENTS)

    assert changed_blocks(texts, breakdown) == []
    assert set(reuse_assessments(texts, breakdown)) == set(BLOCK_CODES)

    edited = {**FILLED, "constraints": "Срок 4 недели."}
    edited_texts = block_texts(edited)
    assert changed_blocks(edited_texts, breakdown) == ["constraints"]
    assert "constraints" not in reuse_assessments(edited_texts, breakdown)


def test_rating_is_stable_when_nothing_changes() -> None:
    texts = block_texts(FILLED)
    first, breakdown = build_breakdown(texts, CONTRACT_ASSESSMENTS)
    second, _ = build_breakdown(texts, reuse_assessments(texts, breakdown))
    assert first == second == 84


def test_text_hash_is_not_exposed() -> None:
    _, breakdown = build_breakdown(block_texts(FILLED), CONTRACT_ASSESSMENTS)
    assert all("textHash" in entry for entry in breakdown)
    assert all("textHash" not in entry for entry in public_breakdown(breakdown))
