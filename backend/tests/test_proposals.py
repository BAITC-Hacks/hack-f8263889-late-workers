"""Proposals: sending, editing, withdrawing and the task's response counter."""

import pytest
from app.core import messages
from app.models import Student, Task
from app.services.rating import level_of
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import SECOND_STUDENT, TEAM

BODY = {
    "idea": "Модель прогноза спроса по продажам с учётом дня недели и праздников.",
    "plan": "Недели 1–2: анализ выгрузки. Недели 3–4: страница прогноза. Недели 5–6: пилот.",
    "durationWeeks": 6,
    "prototypeUrl": "https://github.com/data-hawks/forecast",
}


async def _send(client: AsyncClient, task_id: int, team_id: int, **overrides) -> AsyncClient:
    return await client.post(
        f"/api/tasks/{task_id}/proposals", json={**BODY, "teamId": team_id, **overrides}
    )


@pytest.fixture
async def open_task(catalogue: list[Task]) -> Task:
    return next(task for task in catalogue if task.status == "published")


async def test_sending_a_proposal(client: AsyncClient, team: dict, open_task: Task) -> None:
    response = await _send(client, open_task.id, team["id"])
    assert response.status_code == 201, response.text

    proposal = response.json()["proposal"]
    assert proposal["status"] == {"code": "sent", "name": "Отправлен"}
    assert proposal["canEdit"] is True
    assert proposal["team"] == {"id": team["id"], "name": TEAM["name"]}
    assert proposal["task"]["id"] == open_task.id
    assert proposal["task"]["level"] == level_of(open_task.rating)
    assert proposal["decidedAt"] is None
    assert proposal["businessComment"] is None


async def test_the_response_count_matches_the_live_proposals(
    client: AsyncClient, team: dict, open_task: Task
) -> None:
    """The counter is recomputed, not incremented: it always equals reality."""
    await _send(client, open_task.id, team["id"])
    listed = (await client.get("/api/tasks")).json()["items"]
    assert next(i for i in listed if i["id"] == open_task.id)["responsesCount"] == 1


async def test_a_second_proposal_reports_the_first(
    client: AsyncClient, team: dict, open_task: Task
) -> None:
    first = (await _send(client, open_task.id, team["id"])).json()["proposal"]
    response = await _send(client, open_task.id, team["id"])
    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "PROPOSAL_EXISTS",
        "message": messages.PROPOSAL_EXISTS,
        "proposalId": first["id"],
    }


async def test_only_a_captain_may_send(
    client: AsyncClient,
    team: dict,
    open_task: Task,
    teammate: Student,
    teammate_client: AsyncClient,
) -> None:
    await client.post(f"/api/teams/{team['id']}/members", json={"email": SECOND_STUDENT["email"]})
    response = await _send(teammate_client, open_task.id, team["id"])
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["teamId"] == messages.NOT_CAPTAIN


async def test_a_low_rated_task_still_accepts_proposals(
    client: AsyncClient, team: dict, catalogue: list[Task]
) -> None:
    """The spec is explicit: rating does not gate applying."""
    low = next(task for task in catalogue if task.rating == 35)
    assert (await _send(client, low.id, team["id"])).status_code == 201


async def test_a_draft_task_cannot_be_answered(
    client: AsyncClient, team: dict, catalogue: list[Task]
) -> None:
    draft = next(task for task in catalogue if task.status == "draft")
    assert (await _send(client, draft.id, team["id"])).status_code == 404


@pytest.mark.parametrize(
    ("override", "field"),
    [
        ({"idea": "коротко"}, "idea"),
        ({"plan": "коротко"}, "plan"),
        ({"durationWeeks": 0}, "durationWeeks"),
        ({"durationWeeks": 53}, "durationWeeks"),
        ({"durationWeeks": "шесть"}, "durationWeeks"),
        ({"prototypeUrl": "github.com/x"}, "prototypeUrl"),
        ({"prototypeUrl": "https://x.kz/" + "a" * 500}, "prototypeUrl"),
    ],
)
async def test_proposal_validation(
    client: AsyncClient, team: dict, open_task: Task, override: dict, field: str
) -> None:
    response = await _send(client, open_task.id, team["id"], **override)
    assert response.status_code == 422
    assert field in response.json()["error"]["fields"]


async def test_an_empty_prototype_url_becomes_null(
    client: AsyncClient, team: dict, open_task: Task
) -> None:
    response = await _send(client, open_task.id, team["id"], prototypeUrl="")
    assert response.status_code == 201, response.text
    assert response.json()["proposal"]["prototypeUrl"] is None


async def test_editing_a_proposal(client: AsyncClient, team: dict, open_task: Task) -> None:
    proposal = (await _send(client, open_task.id, team["id"])).json()["proposal"]
    response = await client.patch(
        f"/api/proposals/{proposal['id']}", json={**BODY, "durationWeeks": 5, "prototypeUrl": None}
    )
    assert response.status_code == 200, response.text
    updated = response.json()["proposal"]
    assert updated["durationWeeks"] == 5
    assert updated["prototypeUrl"] is None


async def test_withdrawing_frees_the_slot_and_the_counter(
    client: AsyncClient, team: dict, open_task: Task
) -> None:
    proposal = (await _send(client, open_task.id, team["id"])).json()["proposal"]
    before = (await client.get("/api/tasks")).json()["items"]
    with_proposal = next(i for i in before if i["id"] == open_task.id)["responsesCount"]
    assert with_proposal == 1

    response = await client.post(f"/api/proposals/{proposal['id']}/withdraw")
    assert response.status_code == 200, response.text
    assert response.json()["proposal"]["status"]["code"] == "withdrawn"
    assert response.json()["proposal"]["canEdit"] is False

    after = (await client.get("/api/tasks")).json()["items"]
    assert next(i for i in after if i["id"] == open_task.id)["responsesCount"] == with_proposal - 1

    # Withdrawing releases the one-live-proposal slot.
    assert (await _send(client, open_task.id, team["id"])).status_code == 201


async def test_a_withdrawn_proposal_cannot_be_edited(
    client: AsyncClient, team: dict, open_task: Task
) -> None:
    proposal = (await _send(client, open_task.id, team["id"])).json()["proposal"]
    await client.post(f"/api/proposals/{proposal['id']}/withdraw")

    response = await client.patch(f"/api/proposals/{proposal['id']}", json=BODY)
    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "INVALID_STATUS",
        "message": messages.PROPOSAL_INVALID_STATUS,
    }


async def test_a_member_sees_the_proposal_but_cannot_edit_it(
    client: AsyncClient,
    team: dict,
    open_task: Task,
    teammate: Student,
    teammate_client: AsyncClient,
) -> None:
    await client.post(f"/api/teams/{team['id']}/members", json={"email": SECOND_STUDENT["email"]})
    proposal = (await _send(client, open_task.id, team["id"])).json()["proposal"]

    seen = await teammate_client.get(f"/api/proposals/{proposal['id']}")
    assert seen.status_code == 200, seen.text
    assert seen.json()["proposal"]["canEdit"] is False
    assert (
        await teammate_client.patch(f"/api/proposals/{proposal['id']}", json=BODY)
    ).status_code == 403


async def test_an_outsider_gets_404(
    client: AsyncClient, team: dict, open_task: Task, teammate_client: AsyncClient
) -> None:
    proposal = (await _send(client, open_task.id, team["id"])).json()["proposal"]
    assert (await teammate_client.get(f"/api/proposals/{proposal['id']}")).status_code == 404


async def test_my_proposals_follows_membership(
    client: AsyncClient,
    team: dict,
    open_task: Task,
    teammate: Student,
    teammate_client: AsyncClient,
    db: AsyncSession,
) -> None:
    await client.post(f"/api/teams/{team['id']}/members", json={"email": SECOND_STUDENT["email"]})
    await _send(client, open_task.id, team["id"])

    listed = (await teammate_client.get("/api/me/proposals")).json()["items"]
    assert [item["canEdit"] for item in listed] == [False]

    await teammate_client.delete(f"/api/teams/{team['id']}/members/{teammate.id}")
    assert (await teammate_client.get("/api/me/proposals")).json()["items"] == []


async def test_my_proposals_for_one_task(
    client: AsyncClient, team: dict, catalogue: list[Task]
) -> None:
    answered = next(t for t in catalogue if t.status == "published")
    other = next(t for t in catalogue if t.status == "published" and t.id != answered.id)
    await _send(client, answered.id, team["id"])

    assert len((await client.get(f"/api/tasks/{answered.id}/my-proposals")).json()["items"]) == 1
    assert (await client.get(f"/api/tasks/{other.id}/my-proposals")).json()["items"] == []


async def test_a_students_proposal_carries_its_milestones(
    client: AsyncClient, team: dict, open_task: Task, db: AsyncSession
) -> None:
    from app.models import Milestone

    proposal = (await _send(client, open_task.id, team["id"])).json()["proposal"]
    assert proposal["milestones"] == []

    db.add(Milestone(proposal_id=proposal["id"], title="Первый этап", confirmed=True))
    await db.commit()

    mine = (await client.get("/api/me/proposals")).json()["items"]
    assert [m["title"] for m in mine[0]["milestones"]] == ["Первый этап"]
    assert mine[0]["milestones"][0]["confirmed"] is True
