import httpx
from httpx import ASGITransport

from app.main import app


async def test_ping_returns_ok():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/ping")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
