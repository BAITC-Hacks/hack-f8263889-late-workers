"""Teams: creation, roster visibility and membership."""

from app.core import messages
from app.models import Student
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import SECOND_STUDENT, STUDENT, TEAM


async def test_creating_a_team_makes_the_author_captain(client: AsyncClient, student: dict) -> None:
    response = await client.post("/api/teams", json=TEAM)
    assert response.status_code == 201, response.text

    team = response.json()["team"]
    assert team["myRole"] == "captain"
    assert team["membersLimit"] == 5
    assert len(team["members"]) == 1
    assert team["members"][0]["role"] == "captain"
    # The team's own tags come first, then the members'.
    assert team["skills"] == TEAM["ownSkills"] + STUDENT["skills"]
    assert team["technologies"] == TEAM["ownTechnologies"] + STUDENT["technologies"]


async def test_a_name_is_taken_regardless_of_case(client: AsyncClient, team: dict) -> None:
    response = await client.post("/api/teams", json={**TEAM, "name": "data hawks"})
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["name"] == messages.TEAM_NAME_TAKEN


async def test_my_teams(client: AsyncClient, team: dict) -> None:
    response = await client.get("/api/teams/my")
    assert response.status_code == 200, response.text
    items = response.json()["items"]
    assert [item["id"] for item in items] == [team["id"]]
    assert items[0]["myRole"] == "captain"
    assert items[0]["membersCount"] == 1


async def test_a_business_cannot_create_a_team(client: AsyncClient, business: dict) -> None:
    assert (await client.post("/api/teams", json=TEAM)).status_code == 403


async def test_a_member_sees_emails_and_a_business_does_not(
    client: AsyncClient, team: dict, teammate: Student, business: dict
) -> None:
    """`business` logs in last, so this client is the outsider."""
    response = await client.get(f"/api/teams/{team['id']}")
    assert response.status_code == 200, response.text
    outsider = response.json()["team"]
    assert outsider["myRole"] is None
    assert [member["email"] for member in outsider["members"]] == [None]
    # The roster itself is still visible.
    assert outsider["members"][0]["name"] == STUDENT["name"]


async def test_the_team_itself_sees_emails(client: AsyncClient, team: dict) -> None:
    response = await client.get(f"/api/teams/{team['id']}")
    assert response.json()["team"]["members"][0]["email"] == STUDENT["email"]


async def test_adding_a_member_merges_their_tags(
    client: AsyncClient, team: dict, teammate: Student
) -> None:
    response = await client.post(
        f"/api/teams/{team['id']}/members", json={"email": SECOND_STUDENT["email"]}
    )
    assert response.status_code == 200, response.text

    updated = response.json()["team"]
    assert [member["role"] for member in updated["members"]] == ["captain", "member"]
    assert "Backend" in updated["skills"]
    assert "FastAPI" in updated["technologies"]


async def test_an_unknown_email_is_rejected(client: AsyncClient, team: dict) -> None:
    response = await client.post(
        f"/api/teams/{team['id']}/members", json={"email": "nobody@student.kz"}
    )
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["email"] == messages.STUDENT_NOT_FOUND


async def test_adding_the_same_student_twice(
    client: AsyncClient, team: dict, teammate: Student
) -> None:
    await client.post(f"/api/teams/{team['id']}/members", json={"email": SECOND_STUDENT["email"]})
    response = await client.post(
        f"/api/teams/{team['id']}/members", json={"email": SECOND_STUDENT["email"]}
    )
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["email"] == messages.STUDENT_ALREADY_IN_TEAM


async def test_a_sixth_member_is_refused(client: AsyncClient, team: dict, db: AsyncSession) -> None:
    from app.core.security import hash_password
    from app.models import TeamMember, User

    for index in range(4):
        user = User(
            email=f"extra{index}@student.kz",
            hashed_password=hash_password("extra2026"),
            role="student",
            student=Student(name=f"Студент {index}", skills=[], technologies=[]),
        )
        db.add(user)
        await db.flush()
        db.add(TeamMember(team_id=team["id"], student_id=user.student.id, role="member"))
    await db.commit()

    response = await client.post(
        f"/api/teams/{team['id']}/members", json={"email": "someone@student.kz"}
    )
    assert response.status_code == 409
    assert response.json()["error"] == {"code": "TEAM_FULL", "message": messages.TEAM_FULL}


async def test_the_captain_cannot_be_removed(client: AsyncClient, team: dict) -> None:
    captain_id = team["members"][0]["studentId"]
    response = await client.delete(f"/api/teams/{team['id']}/members/{captain_id}")
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CAPTAIN_CANNOT_LEAVE"


async def test_a_member_can_leave(
    client: AsyncClient, team: dict, teammate: Student, teammate_client: AsyncClient
) -> None:
    await client.post(f"/api/teams/{team['id']}/members", json={"email": SECOND_STUDENT["email"]})

    response = await teammate_client.delete(f"/api/teams/{team['id']}/members/{teammate.id}")
    assert response.status_code == 204
    assert (await teammate_client.get("/api/teams/my")).json()["items"] == []


async def test_a_member_cannot_edit_the_team(
    client: AsyncClient, team: dict, teammate: Student, teammate_client: AsyncClient
) -> None:
    await client.post(f"/api/teams/{team['id']}/members", json={"email": SECOND_STUDENT["email"]})
    response = await teammate_client.patch(f"/api/teams/{team['id']}", json=TEAM)
    assert response.status_code == 403


async def test_the_captain_edits_and_skills_are_recomputed(client: AsyncClient, team: dict) -> None:
    response = await client.patch(
        f"/api/teams/{team['id']}", json={**TEAM, "ownSkills": ["Компьютерное зрение"]}
    )
    assert response.status_code == 200, response.text
    assert response.json()["team"]["skills"][0] == "Компьютерное зрение"


async def test_an_outsider_gets_404_for_a_team_they_are_not_in(
    teammate_client: AsyncClient, team: dict
) -> None:
    """A stranger may read the roster but must not be able to edit or probe it."""
    assert (await teammate_client.patch(f"/api/teams/{team['id']}", json=TEAM)).status_code == 404
