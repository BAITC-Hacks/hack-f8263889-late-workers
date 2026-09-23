"""Milestones: creation, deletion, confirmation and team points."""

import pytest
from app.core import messages
from app.models import Milestone, Proposal, Task, Team
from app.services.proposals import recalc_team_points
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import CATALOGUE_OWNER

BODY = {
    "idea": "Модель прогноза спроса по продажам с учётом дня недели и праздников.",
    "plan": "Недели 1–2: анализ выгрузки. Недели 3–4: страница прогноза. Недели 5–6: пилот.",
    "durationWeeks": 6,
    "prototypeUrl": None,
}


@pytest.fixture
async def selected(client: AsyncClient, team: dict, catalogue: list[Task]) -> dict:
    """A selected proposal; the client ends up signed in as the owning business."""
    published = next(t for t in catalogue if t.status == "published")
    sent = await client.post(
        f"/api/tasks/{published.id}/proposals", json={**BODY, "teamId": team["id"]}
    )
    assert sent.status_code == 201, sent.text
    assert (await client.post("/api/auth/login", json=CATALOGUE_OWNER)).status_code == 200

    proposal_id = sent.json()["proposal"]["id"]
    decided = await client.post(f"/api/business/proposals/{proposal_id}/select", json={})
    assert decided.status_code == 200, decided.text
    return decided.json()["proposal"]


async def test_adding_a_milestone(client: AsyncClient, selected: dict) -> None:
    response = await client.post(
        f"/api/business/proposals/{selected['id']}/milestones",
        json={"title": "Базовая модель на данных за 12 месяцев"},
    )
    assert response.status_code == 201, response.text
    milestone = response.json()["proposal"]["milestones"][0]
    assert milestone["confirmed"] is False
    assert milestone["points"] == 10
    assert milestone["confirmedAt"] is None


async def test_milestones_need_a_selected_proposal(
    client: AsyncClient, selected: dict, db: AsyncSession
) -> None:
    proposal = await db.get(Proposal, selected["id"])
    proposal.status = "reviewing"
    await db.commit()

    response = await client.post(
        f"/api/business/proposals/{selected['id']}/milestones", json={"title": "Этап"}
    )
    assert response.status_code == 409
    assert response.json()["error"]["message"] == messages.MILESTONES_ONLY_SELECTED


async def test_a_short_title_is_rejected(client: AsyncClient, selected: dict) -> None:
    response = await client.post(
        f"/api/business/proposals/{selected['id']}/milestones", json={"title": "Эт"}
    )
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["title"] == messages.MILESTONE_TITLE


async def _add(client: AsyncClient, proposal_id: int, title: str) -> dict:
    response = await client.post(
        f"/api/business/proposals/{proposal_id}/milestones", json={"title": title}
    )
    assert response.status_code == 201, response.text
    return response.json()["proposal"]["milestones"][-1]


async def test_confirming_awards_the_points(
    client: AsyncClient, selected: dict, db: AsyncSession
) -> None:
    first = await _add(client, selected["id"], "Базовая модель")
    await _add(client, selected["id"], "Страница прогноза")

    response = await client.post(f"/api/business/milestones/{first['id']}/confirm")
    assert response.status_code == 200, response.text

    proposal = response.json()["proposal"]
    assert proposal["milestones"][0]["confirmed"] is True
    assert proposal["milestones"][0]["confirmedAt"] is not None
    assert proposal["milestones"][1]["confirmed"] is False
    assert proposal["team"]["points"] == 10  # one of two confirmed

    # Visible on the public team card too.
    team = (await client.get(f"/api/teams/{proposal['team']['id']}")).json()["team"]
    assert team["points"] == 10


async def test_confirmation_is_irreversible(
    client: AsyncClient, selected: dict, db: AsyncSession
) -> None:
    milestone = await _add(client, selected["id"], "Базовая модель")
    await client.post(f"/api/business/milestones/{milestone['id']}/confirm")

    again = await client.post(f"/api/business/milestones/{milestone['id']}/confirm")
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "ALREADY_CONFIRMED"
    assert await db.scalar(select(Team.points).where(Team.id == selected["team"]["id"])) == 10

    delete = await client.delete(f"/api/business/milestones/{milestone['id']}")
    assert delete.status_code == 409


async def test_deleting_an_unconfirmed_milestone(client: AsyncClient, selected: dict) -> None:
    milestone = await _add(client, selected["id"], "Черновой этап")
    assert (await client.delete(f"/api/business/milestones/{milestone['id']}")).status_code == 204
    # And a second delete of the same id is a 404, not a 500.
    assert (await client.delete(f"/api/business/milestones/{milestone['id']}")).status_code == 404


async def test_a_foreign_milestone_is_404(
    client: AsyncClient, selected: dict, business: dict
) -> None:
    """`business` signs a different business in."""
    milestone_id = 999
    assert (
        await client.post(f"/api/business/milestones/{milestone_id}/confirm")
    ).status_code == 404


async def test_recalc_team_points_sums_confirmed_only(
    client: AsyncClient, selected: dict, db: AsyncSession
) -> None:
    db.add_all(
        [
            Milestone(proposal_id=selected["id"], title="Первый", confirmed=True),
            Milestone(proposal_id=selected["id"], title="Второй", confirmed=False),
        ]
    )
    await db.flush()
    await recalc_team_points(db, selected["team"]["id"])
    await db.commit()
    assert await db.scalar(select(Team.points).where(Team.id == selected["team"]["id"])) == 10
