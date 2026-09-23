"""The card constructor end to end, with canned model answers."""

import pytest
from app.core import messages
from app.services.builder_ai import (
    AnalyzeOut,
    AssessOut,
    BlockAssessment,
    DraftQuestion,
    ExtractFields,
    ExtractOut,
)
from app.services.builder_ai import (
    ExtractedField as Field,
)
from httpx import AsyncClient

from tests.conftest import DRAFT_TEXT

ANALYZE = AnalyzeOut(
    assessment=[
        BlockAssessment(block="context_need", quality="partial", reason="Ситуация описана"),
        BlockAssessment(block="data", quality="missing", reason="Нет данных"),
        BlockAssessment(block="result", quality="formal", reason="Общими словами"),
        BlockAssessment(block="success_criteria", quality="missing", reason="Нет критериев"),
        BlockAssessment(block="constraints", quality="missing", reason="Нет сроков"),
        BlockAssessment(block="users", quality="missing", reason="Нет пользователей"),
        BlockAssessment(block="business_link", quality="partial", reason="Контакт есть"),
    ],
    questions=[
        DraftQuestion(block="data", text="Какие данные вы можете передать?"),
        DraftQuestion(block="success_criteria", text="По какому признаку поймёте успех?"),
        DraftQuestion(block="constraints", text="Есть ли сроки?"),
        DraftQuestion(block="users", text="Кто будет пользоваться?"),
        DraftQuestion(block="result", text="Что должна сдать команда?"),
    ],
)


def _extract(**overrides: Field) -> ExtractOut:
    empty = Field(value=None, sources=[])
    fields = {name: empty for name in ExtractFields.model_fields}
    fields.update(overrides)
    return ExtractOut(
        title=Field(value="Прогноз спроса на выпечку", sources=["D1"]),
        fields=ExtractFields(**fields),
    )


def assess_all_specific(payload: dict) -> AssessOut:
    """Grade whatever blocks were sent as `specific`."""
    return AssessOut(
        blocks=[
            BlockAssessment(block=entry["block"], quality="specific", reason="Есть детали")
            for entry in payload.get("blocks", [])
        ]
    )


# --- Draft --------------------------------------------------------------------


async def test_creating_a_draft(client: AsyncClient, business: dict) -> None:
    response = await client.post(
        "/api/business/tasks", json={"draftText": DRAFT_TEXT, "industryCode": "horeca"}
    )
    assert response.status_code == 201, response.text
    task = response.json()["task"]
    assert task["status"] == {"code": "draft", "name": "Черновик"}
    assert task["rounds"] == []
    assert task["roundsLeft"] == 3
    assert [f["id"] for f in task["fragments"]] == ["D1", "D2"]
    assert task["card"] is None
    assert task["rating"] is None


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"draftText": "x" * 49, "industryCode": "horeca"}, "draftText"),
        ({"draftText": DRAFT_TEXT, "industryCode": "farm"}, "industryCode"),
    ],
)
async def test_draft_validation(
    client: AsyncClient, business: dict, payload: dict, field: str
) -> None:
    response = await client.post("/api/business/tasks", json=payload)
    assert response.status_code == 422
    assert field in response.json()["error"]["fields"]


async def test_a_student_cannot_create_a_draft(client: AsyncClient, student: dict) -> None:
    response = await client.post(
        "/api/business/tasks", json={"draftText": DRAFT_TEXT, "industryCode": "horeca"}
    )
    assert response.status_code == 403


async def test_another_business_gets_404(client: AsyncClient, business: dict, draft: dict) -> None:
    """The draft belongs to the fixture's business; a second one must not see it."""
    from tests.conftest import BUSINESS

    await client.post("/api/auth/logout")
    other = await client.post(
        "/api/auth/register/business", json={**BUSINESS, "email": "other@zerno.kz"}
    )
    assert other.status_code == 201, other.text
    assert (await client.get(f"/api/business/tasks/{draft['id']}")).status_code == 404


# --- Rounds -------------------------------------------------------------------


async def test_a_round_asks_the_models_questions(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(analyze=ANALYZE)
    response = await client.post(f"/api/business/tasks/{draft['id']}/rounds")
    assert response.status_code == 201, response.text

    task = response.json()["task"]
    assert task["status"] == {"code": "clarifying", "name": "Уточнение"}
    assert task["roundsLeft"] == 2
    round_ = task["rounds"][0]
    assert round_["mode"] == "ai"
    assert len(round_["assessment"]) == 7
    assert len(round_["questions"]) == 5
    # Worst blocks first, heaviest block first within a quality; equal weights keep
    # the order of the block table, so constraints precedes users.
    assert [q["block"] for q in round_["questions"]] == [
        "data",
        "success_criteria",
        "constraints",
        "users",
        "result",
    ]


async def test_a_thin_model_answer_is_topped_up_from_the_bank(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    thin = ANALYZE.model_copy(update={"questions": ANALYZE.questions[:1]})
    ai_answers(analyze=thin)
    response = await client.post(f"/api/business/tasks/{draft['id']}/rounds")
    questions = response.json()["task"]["rounds"][0]["questions"]
    assert len(questions) >= 3
    assert questions[0]["text"] == "Какие данные вы можете передать?"


async def test_a_round_without_ai_falls_back(
    client: AsyncClient, draft: dict, ai_off: None
) -> None:
    response = await client.post(f"/api/business/tasks/{draft['id']}/rounds")
    assert response.status_code == 201, response.text
    round_ = response.json()["task"]["rounds"][0]
    assert round_["mode"] == "fallback"
    assert len(round_["questions"]) == 5


async def test_a_second_round_needs_the_first_answered(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(analyze=ANALYZE)
    await client.post(f"/api/business/tasks/{draft['id']}/rounds")
    response = await client.post(f"/api/business/tasks/{draft['id']}/rounds")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ROUND_NOT_ANSWERED"


async def _answer_round(client: AsyncClient, task: dict, skip_from: int = 3) -> dict:
    round_ = task["rounds"][-1]
    answers = [
        {"questionId": q["id"], "answer": f"Ответ {index}" if index < skip_from else None}
        for index, q in enumerate(round_["questions"])
    ]
    response = await client.put(
        f"/api/business/tasks/{task['id']}/rounds/{round_['number']}/answers",
        json={"answers": answers},
    )
    assert response.status_code == 200, response.text
    return response.json()["task"]


async def test_the_round_limit(client: AsyncClient, draft: dict, ai_answers) -> None:
    ai_answers(analyze=ANALYZE)
    task = draft
    for _ in range(3):
        task = (await client.post(f"/api/business/tasks/{task['id']}/rounds")).json()["task"]
        task = await _answer_round(client, task)
    response = await client.post(f"/api/business/tasks/{task['id']}/rounds")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ROUND_LIMIT_REACHED"


# --- Answers ------------------------------------------------------------------


async def test_answers_become_fragments_and_skips(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(analyze=ANALYZE)
    task = (await client.post(f"/api/business/tasks/{draft['id']}/rounds")).json()["task"]
    task = await _answer_round(client, task)

    questions = task["rounds"][0]["questions"]
    assert [q["skipped"] for q in questions] == [False, False, False, True, True]
    assert [f["id"] for f in task["fragments"]] == ["D1", "D2", "A1", "A2", "A3"]
    assert task["fragments"][2]["questionId"] == questions[0]["id"]
    assert task["rounds"][0]["answeredAt"] is not None


async def test_a_blank_answer_counts_as_skipped(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(analyze=ANALYZE)
    task = (await client.post(f"/api/business/tasks/{draft['id']}/rounds")).json()["task"]
    answers = [{"questionId": q["id"], "answer": "   "} for q in task["rounds"][0]["questions"]]
    response = await client.put(
        f"/api/business/tasks/{task['id']}/rounds/1/answers", json={"answers": answers}
    )
    assert response.status_code == 200, response.text
    assert all(q["skipped"] for q in response.json()["task"]["rounds"][0]["questions"])


async def test_answers_must_cover_every_question(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(analyze=ANALYZE)
    task = (await client.post(f"/api/business/tasks/{draft['id']}/rounds")).json()["task"]
    answers = [
        {"questionId": q["id"], "answer": "Ответ"} for q in task["rounds"][0]["questions"][:2]
    ]
    response = await client.put(
        f"/api/business/tasks/{task['id']}/rounds/1/answers", json={"answers": answers}
    )
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["answers"] == messages.ANSWERS_INCOMPLETE


async def test_an_overlong_answer_is_rejected(client: AsyncClient, draft: dict, ai_answers) -> None:
    ai_answers(analyze=ANALYZE)
    task = (await client.post(f"/api/business/tasks/{draft['id']}/rounds")).json()["task"]
    questions = task["rounds"][0]["questions"]
    answers = [{"questionId": q["id"], "answer": "Ответ"} for q in questions]
    answers[0]["answer"] = "x" * 1001
    response = await client.put(
        f"/api/business/tasks/{task['id']}/rounds/1/answers", json={"answers": answers}
    )
    assert response.status_code == 422
    assert response.json()["error"]["fields"][f"answers.{questions[0]['id']}"] == (
        messages.ANSWER_TOO_LONG
    )


# --- Card ---------------------------------------------------------------------


async def _ready_for_card(client: AsyncClient, draft: dict) -> dict:
    task = (await client.post(f"/api/business/tasks/{draft['id']}/rounds")).json()["task"]
    return await _answer_round(client, task, skip_from=5)


async def test_building_the_card(client: AsyncClient, draft: dict, ai_answers) -> None:
    ai_answers(
        analyze=ANALYZE,
        extract=_extract(
            need=Field(value="Списываем выпечку", sources=["D2"]),
            dataMaterials=Field(value="Ответ 0", sources=["A1"]),
        ),
    )
    task = await _ready_for_card(client, draft)
    response = await client.post(f"/api/business/tasks/{task['id']}/card/build")
    assert response.status_code == 200, response.text

    task = response.json()["task"]
    assert task["status"] == {"code": "review", "name": "На проверке"}
    card = task["card"]
    assert card["mode"] == "ai"
    assert card["fields"]["need"]["value"] == "Списываем выпечку"
    assert card["fields"]["need"]["source"] == "ai"
    assert card["fields"]["need"]["confirmed"] is False
    # The contact is the business's own, never the model's guess.
    assert card["fields"]["contact"]["source"] == "profile"
    assert card["fields"]["contact"]["value"].startswith("Айгерим")
    assert task["rating"] is None  # no rating until the card is confirmed


async def test_a_value_citing_an_unknown_fragment_is_dropped(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(
        analyze=ANALYZE,
        extract=_extract(need=Field(value="Выдумка", sources=["D9"])),
    )
    task = await _ready_for_card(client, draft)
    response = await client.post(f"/api/business/tasks/{task['id']}/card/build")
    assert response.json()["task"]["card"]["fields"]["need"]["value"] is None


async def test_a_value_with_an_invented_number_is_dropped(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    """D2 mentions 15%; a value claiming 40% cites a number nobody wrote."""
    ai_answers(
        analyze=ANALYZE,
        extract=_extract(need=Field(value="Списываем 40% выпечки", sources=["D2"])),
    )
    task = await _ready_for_card(client, draft)
    response = await client.post(f"/api/business/tasks/{task['id']}/card/build")
    assert response.json()["task"]["card"]["fields"]["need"]["value"] is None


async def test_building_the_card_without_ai_falls_back(
    client: AsyncClient, draft: dict, ai_off: None
) -> None:
    task = await _ready_for_card(client, draft)
    response = await client.post(f"/api/business/tasks/{task['id']}/card/build")
    assert response.status_code == 200, response.text
    card = response.json()["task"]["card"]
    assert card["mode"] == "fallback"
    # Verbatim assembly: the whole draft becomes the need.
    assert card["fields"]["need"]["value"] == DRAFT_TEXT
    assert card["title"]["value"].startswith("У нас 4 кофейни")


async def test_building_the_card_needs_the_round_answered(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(analyze=ANALYZE)
    await client.post(f"/api/business/tasks/{draft['id']}/rounds")
    response = await client.post(f"/api/business/tasks/{draft['id']}/card/build")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ROUND_NOT_ANSWERED"


# --- Confirmation and rating ---------------------------------------------------


def _card_payload(task: dict, **overrides: object) -> dict:
    fields = {name: field["value"] for name, field in task["card"]["fields"].items()}
    fields.update(overrides)
    return {
        "industryCode": "horeca",
        "title": task["card"]["title"]["value"] or "Прогноз спроса",
        "fields": fields,
    }


async def _built_card(client: AsyncClient, draft: dict) -> dict:
    task = await _ready_for_card(client, draft)
    return (await client.post(f"/api/business/tasks/{task['id']}/card/build")).json()["task"]


async def test_confirming_the_card_rates_it(client: AsyncClient, draft: dict, ai_answers) -> None:
    calls = ai_answers(
        analyze=ANALYZE,
        extract=_extract(need=Field(value="Списываем выпечку", sources=["D2"])),
        assess=assess_all_specific,
    )
    task = await _built_card(client, draft)
    payload = _card_payload(task, interactionFormat="Созвон раз в неделю.")

    response = await client.put(f"/api/business/tasks/{task['id']}/card", json=payload)
    assert response.status_code == 200, response.text
    task = response.json()["task"]

    assert task["confirmedAt"] is not None
    assert task["rating"] is not None
    assert task["level"]["code"] in {"needs_clarification", "working", "ready", "priority"}
    assert len(task["ratingBreakdown"]) == 7
    assert all("textHash" not in entry for entry in task["ratingBreakdown"])
    # An edited value becomes the business's own; untouched ones keep their source.
    assert task["card"]["fields"]["interactionFormat"]["source"] == "human"
    assert task["card"]["fields"]["need"]["source"] == "ai"
    assert task["card"]["fields"]["need"]["confirmed"] is True
    assert calls.count("assess") == 1


async def test_reconfirming_an_unchanged_card_does_not_call_the_model(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    calls = ai_answers(
        analyze=ANALYZE,
        extract=_extract(need=Field(value="Списываем выпечку", sources=["D2"])),
        assess=assess_all_specific,
    )
    task = await _built_card(client, draft)
    payload = _card_payload(task)

    first = (await client.put(f"/api/business/tasks/{task['id']}/card", json=payload)).json()
    assessed_once = calls.count("assess")
    second = (await client.put(f"/api/business/tasks/{task['id']}/card", json=payload)).json()

    assert first["task"]["rating"] == second["task"]["rating"]
    assert calls.count("assess") == assessed_once  # nothing changed, nothing re-graded


async def test_clearing_a_field_drops_its_provenance(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(
        analyze=ANALYZE,
        extract=_extract(need=Field(value="Списываем выпечку", sources=["D2"])),
        assess=assess_all_specific,
    )
    task = await _built_card(client, draft)
    response = await client.put(
        f"/api/business/tasks/{task['id']}/card", json=_card_payload(task, need=None)
    )
    need = response.json()["task"]["card"]["fields"]["need"]
    assert need == {"value": None, "source": None, "confirmed": False, "sources": []}


async def test_an_overlong_title_is_rejected(client: AsyncClient, draft: dict, ai_answers) -> None:
    ai_answers(analyze=ANALYZE, extract=_extract(), assess=assess_all_specific)
    task = await _built_card(client, draft)
    response = await client.put(
        f"/api/business/tasks/{task['id']}/card",
        json=_card_payload(task, **{}) | {"title": "x" * 121},
    )
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["title"] == messages.TITLE_TOO_LONG


# --- Publication ---------------------------------------------------------------


async def test_publishing_puts_the_task_in_the_catalogue(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(
        analyze=ANALYZE,
        extract=_extract(need=Field(value="Списываем выпечку", sources=["D2"])),
        assess=assess_all_specific,
    )
    task = await _built_card(client, draft)
    task = (
        await client.put(f"/api/business/tasks/{task['id']}/card", json=_card_payload(task))
    ).json()["task"]

    response = await client.post(f"/api/business/tasks/{task['id']}/publish")
    assert response.status_code == 200, response.text
    published = response.json()["task"]
    assert published["status"] == {"code": "published", "name": "Опубликована"}
    assert published["publishedAt"] is not None

    catalogue = (await client.get("/api/tasks")).json()
    assert any(item["id"] == task["id"] for item in catalogue["items"])


async def test_publishing_before_confirmation_is_rejected(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(analyze=ANALYZE, extract=_extract())
    task = await _built_card(client, draft)
    response = await client.post(f"/api/business/tasks/{task['id']}/publish")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CARD_NOT_CONFIRMED"


async def test_publishing_without_a_need_is_rejected(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(analyze=ANALYZE, extract=_extract(), assess=assess_all_specific)
    task = await _built_card(client, draft)
    task = (
        await client.put(
            f"/api/business/tasks/{task['id']}/card", json=_card_payload(task, need=None)
        )
    ).json()["task"]

    response = await client.post(f"/api/business/tasks/{task['id']}/publish")
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["fields.need"] == messages.NEED_REQUIRED


async def test_unpublishing_removes_it_from_the_catalogue(
    client: AsyncClient, draft: dict, ai_answers
) -> None:
    ai_answers(
        analyze=ANALYZE,
        extract=_extract(need=Field(value="Списываем выпечку", sources=["D2"])),
        assess=assess_all_specific,
    )
    task = await _built_card(client, draft)
    task = (
        await client.put(f"/api/business/tasks/{task['id']}/card", json=_card_payload(task))
    ).json()["task"]
    await client.post(f"/api/business/tasks/{task['id']}/publish")

    response = await client.post(f"/api/business/tasks/{task['id']}/unpublish")
    assert response.status_code == 200, response.text
    assert response.json()["task"]["status"]["code"] == "unpublished"
    catalogue = (await client.get("/api/tasks")).json()
    assert not any(item["id"] == task["id"] for item in catalogue["items"])


async def test_the_whole_flow_works_without_ai(
    client: AsyncClient, draft: dict, ai_off: None
) -> None:
    """The constructor must be usable end to end with OpenAI unavailable."""
    task = await _built_card(client, draft)
    assert task["card"]["mode"] == "fallback"

    task = (
        await client.put(f"/api/business/tasks/{task['id']}/card", json=_card_payload(task))
    ).json()["task"]
    assert task["rating"] is not None
    assert {entry["mode"] for entry in task["ratingBreakdown"]} <= {"fallback", "ai"}

    published = await client.post(f"/api/business/tasks/{task['id']}/publish")
    assert published.status_code == 200, published.text
