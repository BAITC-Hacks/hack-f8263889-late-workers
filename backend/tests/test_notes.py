from httpx import AsyncClient


async def test_notes_crud(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    response = await client.post(
        "/api/v1/notes", json={"title": "First", "content": "hello"}, headers=auth_headers
    )
    assert response.status_code == 201
    note = response.json()
    assert note["title"] == "First"

    response = await client.get(f"/api/v1/notes/{note['id']}", headers=auth_headers)
    assert response.status_code == 200

    response = await client.patch(
        f"/api/v1/notes/{note['id']}", json={"title": "Renamed"}, headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Renamed"
    assert response.json()["content"] == "hello"

    response = await client.delete(f"/api/v1/notes/{note['id']}", headers=auth_headers)
    assert response.status_code == 204

    response = await client.get(f"/api/v1/notes/{note['id']}", headers=auth_headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


async def test_notes_pagination(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    for i in range(5):
        await client.post("/api/v1/notes", json={"title": f"n{i}"}, headers=auth_headers)

    response = await client.get("/api/v1/notes?limit=2&offset=0", headers=auth_headers)
    assert response.status_code == 200
    page = response.json()
    assert page["total"] == 5
    assert len(page["items"]) == 2
    assert page["items"][0]["title"] == "n4"  # newest first


async def test_notes_are_scoped_to_owner(client: AsyncClient, auth_headers: dict[str, str]) -> None:
    response = await client.post("/api/v1/notes", json={"title": "mine"}, headers=auth_headers)
    note_id = response.json()["id"]

    other = {"email": "bob@example.com", "password": "password123"}
    await client.post("/api/v1/auth/register", json=other)
    response = await client.post("/api/v1/auth/login/json", json=other)
    other_headers = {"Authorization": f"Bearer {response.json()['access_token']}"}

    response = await client.get(f"/api/v1/notes/{note_id}", headers=other_headers)
    assert response.status_code == 404


async def test_notes_require_auth(client: AsyncClient) -> None:
    response = await client.get("/api/v1/notes")
    assert response.status_code == 401
