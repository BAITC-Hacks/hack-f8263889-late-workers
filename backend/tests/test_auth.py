from httpx import AsyncClient

from tests.conftest import USER


async def test_register_and_login_flow(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/register", json=USER)
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == USER["email"]
    assert "hashed_password" not in body

    response = await client.post(
        "/api/v1/auth/login/json", json={"email": USER["email"], "password": USER["password"]}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]

    response = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == USER["email"]


async def test_register_duplicate_email_conflicts(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json=USER)
    response = await client.post("/api/v1/auth/register", json=USER)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "CONFLICT"


async def test_register_validation_error_shape(client: AsyncClient) -> None:
    response = await client.post("/api/v1/auth/register", json={"email": "nope", "password": "x"})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert isinstance(error["fields"], dict)


async def test_login_wrong_password(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/register", json=USER)
    response = await client.post(
        "/api/v1/auth/login", data={"username": USER["email"], "password": "wrong-password"}
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


async def test_me_without_token(client: AsyncClient) -> None:
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


async def test_me_with_garbage_token(client: AsyncClient) -> None:
    response = await client.get("/api/v1/users/me", headers={"Authorization": "Bearer nope"})
    assert response.status_code == 401
