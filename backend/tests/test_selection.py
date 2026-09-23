"""The business's view of proposals: listing and deciding."""

import pytest
from app.core import messages
from app.models import Proposal, Student, Task
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import CATALOGUE_OWNER, TEAM

BODY = {
    "idea": "Модель прогноза спроса по продажам с учётом дня недели и праздников.",
    "plan": "Недели 1–2: анализ выгрузки. Недели 3–4: страница прогноза. Недели 5–6: пилот.",
    "durationWeeks": 6,
    "prototypeUrl": None,
}


@pytest.fixture
async def sent_proposal(client: AsyncClient, team: dict, catalogue: list[Task]) -> dict:
    """A proposal from the signed-in student's team, after which the client becomes
    the business that owns the catalogue — one cookie jar, so the order matters."""
    published = next(t for t in catalogue if t.status == "published")
    response = await client.post(
        f"/api/tasks/{published.id}/proposals", json={**BODY, "teamId": team["id"]}
    )
    assert response.status_code == 201, response.text
    login = await client.post("/api/auth/login", json=CATALOGUE_OWNER)
    assert login.status_code == 200
    return response.json()["proposal"]


async def test_opening_the_list_moves_sent_to_reviewing(
    client: AsyncClient, sent_proposal: dict, db: AsyncSession
) -> None:
    task_id = sent_proposal["task"]["id"]
    response = await client.get(f"/api/business/tasks/{task_id}/proposals")
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["task"]["id"] == task_id
    item = body["items"][0]
    assert item["status"] == {"code": "reviewing", "name": "Рассматривается"}
    assert "author" not in item
    assert "canEdit" not in item
    assert set(item["team"]) == {
        "id",
        "name",
        "membersCount",
        "skills",
        "technologies",
        "points",
    }
    assert item["team"]["name"] == TEAM["name"]
    # And it is persisted, not just displayed.
    assert await db.scalar(select(Proposal.status)) == "reviewing"


async def test_a_withdrawn_proposal_is_not_listed(
    client: AsyncClient, sent_proposal: dict, db: AsyncSession
) -> None:
    proposal = await db.scalar(select(Proposal))
    proposal.status = "withdrawn"
    await db.commit()

    response = await client.get(f"/api/business/tasks/{sent_proposal['task']['id']}/proposals")
    assert response.json()["items"] == []


async def test_another_business_gets_404(
    client: AsyncClient, sent_proposal: dict, business: dict
) -> None:
    """`business` logs a different business in on the same client."""
    task_id = sent_proposal["task"]["id"]
    assert (await client.get(f"/api/business/tasks/{task_id}/proposals")).status_code == 404


async def test_a_student_gets_403(client: AsyncClient, student: dict) -> None:
    assert (await client.get("/api/business/tasks/1/proposals")).status_code == 403


async def test_selecting_moves_the_task_in_progress(
    client: AsyncClient, sent_proposal: dict
) -> None:
    response = await client.post(
        f"/api/business/proposals/{sent_proposal['id']}/select",
        json={"comment": "Нравится план."},
    )
    assert response.status_code == 200, response.text

    body = response.json()
    assert body["proposal"]["status"] == {"code": "selected", "name": "Выбран"}
    assert body["proposal"]["businessComment"] == "Нравится план."
    assert body["proposal"]["decidedAt"] is not None
    assert body["taskStatus"] == {"code": "in_progress", "name": "В работе"}


async def test_rejecting_with_an_empty_comment_stores_null(
    client: AsyncClient, sent_proposal: dict
) -> None:
    response = await client.post(
        f"/api/business/proposals/{sent_proposal['id']}/reject", json={"comment": "  "}
    )
    assert response.status_code == 200, response.text
    assert response.json()["proposal"]["status"]["code"] == "rejected"
    assert response.json()["proposal"]["businessComment"] is None
    # Rejecting never moves the task.
    assert response.json()["taskStatus"]["code"] == "published"


async def test_a_decision_is_final(client: AsyncClient, sent_proposal: dict) -> None:
    await client.post(f"/api/business/proposals/{sent_proposal['id']}/select", json={})
    response = await client.post(f"/api/business/proposals/{sent_proposal['id']}/reject", json={})
    assert response.status_code == 409
    assert response.json()["error"] == {
        "code": "INVALID_STATUS",
        "message": messages.DECISION_TAKEN,
    }


async def test_an_overlong_comment_is_rejected(client: AsyncClient, sent_proposal: dict) -> None:
    response = await client.post(
        f"/api/business/proposals/{sent_proposal['id']}/select", json={"comment": "х" * 1001}
    )
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["comment"] == messages.COMMENT_LONG


async def test_selecting_a_second_proposal_keeps_both_selected(
    client: AsyncClient, sent_proposal: dict, db: AsyncSession, teammate: Student
) -> None:
    """Several teams may be selected for one task; the task moves once."""
    from app.models import Team, TeamMember

    other = Team(name="Second Crew")
    db.add(other)
    await db.flush()
    db.add(TeamMember(team_id=other.id, student_id=teammate.id, role="captain"))
    db.add(
        Proposal(
            task_id=sent_proposal["task"]["id"],
            team_id=other.id,
            author_student_id=teammate.id,
            idea=BODY["idea"],
            plan=BODY["plan"],
            duration_weeks=4,
            status="sent",
        )
    )
    await db.commit()

    first = await client.post(f"/api/business/proposals/{sent_proposal['id']}/select", json={})
    assert first.status_code == 200
    second_id = await db.scalar(select(Proposal.id).where(Proposal.team_id == other.id))
    second = await client.post(f"/api/business/proposals/{second_id}/select", json={})
    assert second.status_code == 200
    assert second.json()["proposal"]["status"]["code"] == "selected"
    assert second.json()["taskStatus"]["code"] == "in_progress"

    statuses = set(await db.scalars(select(Proposal.status)))
    assert statuses == {"selected"}
