"""Badges over HTTP: the reference, the constructor and the catalogue."""

from app.core.badges import BADGES
from httpx import AsyncClient

from tests.conftest import DRAFT_TEXT

CARD_FIELDS = {
    "context": "Сеть из 4 кофеен в Астане, выпечку готовим сами каждое утро.",
    "need": "Каждый день списываем до 15% выпечки, нужен прогноз на завтра.",
    "targetUsers": None,
    "dataMaterials": "Выгрузка продаж по позициям за 12 месяцев в CSV.",
    "constraints": "Срок — 6 недель. Решение работает в браузере.",
    "expectedResult": "Веб-страница с прогнозом на завтра по каждой позиции.",
    "successCriteria": "Списания снижаются до 8% за месяц пилота.",
    "contact": "Айгерим Нурланова, +77011234567",
    "interactionFormat": None,
}
# The contract's worked example: partial/specific/specific/specific/specific/missing/specific.
CONTRACT_QUALITIES = {
    "context_need": "partial",
    "data": "specific",
    "result": "specific",
    "success_criteria": "specific",
    "constraints": "specific",
    "users": "missing",
    "business_link": "specific",
}


async def test_the_badge_reference(client: AsyncClient, student: dict) -> None:
    response = await client.get("/api/badges")
    assert response.status_code == 200, response.text
    assert response.json()["items"] == [
        {"code": code, "name": name, "condition": condition} for code, name, condition in BADGES
    ]


async def test_the_reference_requires_a_session(client: AsyncClient) -> None:
    assert (await client.get("/api/badges")).status_code == 401


async def _confirmed_task(client: AsyncClient, ai_answers, fields: dict) -> dict:
    from app.services.builder_ai import AssessOut, BlockAssessment

    from tests.test_builder import ANALYZE, _extract

    def contract_assess(payload: dict) -> AssessOut:
        return AssessOut(
            blocks=[
                BlockAssessment(
                    block=entry["block"],
                    quality=CONTRACT_QUALITIES[entry["block"]],
                    reason="Оценка примера",
                )
                for entry in payload.get("blocks", [])
            ]
        )

    ai_answers(analyze=ANALYZE, extract=_extract(), assess=contract_assess)
    draft = await client.post(
        "/api/business/tasks", json={"draftText": DRAFT_TEXT, "industryCode": "horeca"}
    )
    task = draft.json()["task"]
    rounds = await client.post(f"/api/business/tasks/{task['id']}/rounds")
    assert rounds.status_code == 201, rounds.text
    answers = [
        {"questionId": q["id"], "answer": None}
        for q in rounds.json()["task"]["rounds"][0]["questions"]
    ]
    answered = await client.put(
        f"/api/business/tasks/{task['id']}/rounds/1/answers", json={"answers": answers}
    )
    assert answered.status_code == 200, answered.text
    built = await client.post(f"/api/business/tasks/{task['id']}/card/build")
    assert built.status_code == 200, built.text
    assert built.json()["task"]["badges"] == []  # not confirmed yet

    confirmed = await client.put(
        f"/api/business/tasks/{task['id']}/card",
        json={"industryCode": "horeca", "title": "Прогноз спроса", "fields": fields},
    )
    assert confirmed.status_code == 200, confirmed.text
    return confirmed.json()["task"]


async def test_the_contract_example_earns_four_badges(
    client: AsyncClient, business: dict, ai_answers
) -> None:
    task = await _confirmed_task(client, ai_answers, CARD_FIELDS)
    assert [b["code"] for b in task["badges"]] == [
        "has_data",
        "measurable",
        "clear_scope",
        "open_dialog",
    ]


async def test_removing_the_deadline_drops_clear_scope(
    client: AsyncClient, business: dict, ai_answers
) -> None:
    task = await _confirmed_task(client, ai_answers, CARD_FIELDS)
    reconfirmed = await client.put(
        f"/api/business/tasks/{task['id']}/card",
        json={
            "industryCode": "horeca",
            "title": "Прогноз спроса",
            "fields": {**CARD_FIELDS, "constraints": "Решение работает в браузере"},
        },
    )
    assert reconfirmed.status_code == 200, reconfirmed.text
    codes = [b["code"] for b in reconfirmed.json()["task"]["badges"]]
    assert "clear_scope" not in codes
    assert "has_data" in codes  # the rest survive


async def test_catalogue_cards_carry_badges_and_filter(
    client: AsyncClient, student: dict, catalogue, db
) -> None:

    task = next(t for t in catalogue if t.status == "published")
    task.badges = ["has_data", "measurable"]
    await db.commit()

    items = (await client.get("/api/tasks")).json()["items"]
    tagged = next(i for i in items if i["id"] == task.id)
    assert tagged["badges"] == [
        {"code": "has_data", "name": "Есть данные"},
        {"code": "measurable", "name": "Измеримый результат"},
    ]

    both = (await client.get("/api/tasks?badge=has_data,measurable")).json()
    assert [i["id"] for i in both["items"]] == [task.id]
    assert both["total"] == 1

    none = (await client.get("/api/tasks?badge=has_data,complete")).json()
    assert none["total"] == 0

    bad = await client.get("/api/tasks?badge=fast")
    assert bad.status_code == 422
    assert bad.json()["error"]["fields"]["badge"] == "Неизвестный бейдж: fast"

    detail = (await client.get(f"/api/tasks/{task.id}")).json()["task"]
    assert [b["code"] for b in detail["badges"]] == ["has_data", "measurable"]
