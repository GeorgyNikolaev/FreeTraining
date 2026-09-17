from app.services import sessions
from tests.conftest import register_user

REFRESH = "ft_refresh"


def use_refresh_cookie(client, token: str) -> None:
    client.cookies.clear()
    client.cookies.set(REFRESH, token, path="/api/auth")


async def test_register_login_refresh_logout(client, redis):
    registered = await register_user(client, email="  Anna@Example.com ")
    assert registered["user"]["email"] == "anna@example.com"
    assert registered["user"]["email_verified"] is False
    assert registered["guest_progress"] is None
    assert client.cookies.get(REFRESH)

    me = await client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["user"]["name"] == "Анна"

    del client.headers["Authorization"]
    assert (await client.get("/api/auth/me")).status_code == 401

    login = await client.post(
        "/api/auth/login", json={"email": "ANNA@example.com", "password": "correct-horse"}
    )
    assert login.status_code == 200
    first_refresh = client.cookies.get(REFRESH)

    refreshed = await client.post("/api/auth/refresh")
    assert refreshed.status_code == 200
    assert client.cookies.get(REFRESH) != first_refresh
    client.headers["Authorization"] = f"Bearer {refreshed.json()['access_token']}"
    assert (await client.get("/api/auth/me")).status_code == 200

    assert (await client.post("/api/auth/logout")).status_code == 200
    assert (await client.get("/api/auth/me")).status_code == 401
    assert (await client.post("/api/auth/refresh")).status_code == 401


async def test_reused_refresh_token_revokes_session(client, monkeypatch):
    await register_user(client)
    stolen = client.cookies.get(REFRESH)
    assert (await client.post("/api/auth/refresh")).status_code == 200
    fresh = client.cookies.get(REFRESH)

    # В пределах окна повтор прощается — так переживаются одновременные запросы
    use_refresh_cookie(client, stolen)
    assert (await client.post("/api/auth/refresh")).status_code == 200

    monkeypatch.setattr(sessions, "ROTATION_GRACE_SECONDS", -1)
    use_refresh_cookie(client, stolen)
    assert (await client.post("/api/auth/refresh")).status_code == 401
    assert (await client.get("/api/auth/me")).status_code == 401

    use_refresh_cookie(client, fresh)
    assert (await client.post("/api/auth/refresh")).status_code == 401


async def test_wrong_password_and_unknown_email_look_the_same(client):
    await register_user(client)
    client.headers.pop("Authorization")

    wrong = await client.post(
        "/api/auth/login", json={"email": "anna@example.com", "password": "wrong-password"}
    )
    unknown = await client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "wrong-password"}
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Неверная почта или пароль"}


async def test_duplicate_email_is_rejected(client):
    await register_user(client)
    response = await client.post(
        "/api/auth/register",
        json={"name": "Другая", "email": "ANNA@example.com", "password": "another-pass"},
    )
    assert response.status_code == 409


async def test_invalid_registration_data(client):
    for payload in (
        {"name": "Анна", "email": "not-an-email", "password": "correct-horse"},
        {"name": "Анна", "email": "anna@example.com", "password": "short"},
        {"name": "   ", "email": "anna@example.com", "password": "correct-horse"},
        {"name": "А" * 51, "email": "anna@example.com", "password": "correct-horse"},
    ):
        response = await client.post("/api/auth/register", json=payload)
        assert response.status_code == 422, payload


async def test_login_is_rate_limited(client):
    await register_user(client)
    client.headers.pop("Authorization")
    payload = {"email": "anna@example.com", "password": "wrong-password"}

    for _ in range(5):
        assert (await client.post("/api/auth/login", json=payload)).status_code == 401

    payload["password"] = "correct-horse"
    limited = await client.post("/api/auth/login", json=payload)
    assert limited.status_code == 429
    assert "Слишком много попыток входа" in limited.json()["detail"]


async def test_garbage_token_is_unauthorized(client):
    client.headers["Authorization"] = "Bearer not-a-jwt"
    assert (await client.get("/api/courses")).status_code == 401
