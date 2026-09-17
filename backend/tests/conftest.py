from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from httpx import ASGITransport
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

import app.models  # noqa: F401  регистрирует таблицы в метаданных
from app.config import settings
from app.deps import get_content_dir, get_redis, get_session
from app.main import app

FIXTURES = Path(__file__).parent / "fixtures"

settings.jwt_secret = settings.jwt_secret or "test-secret-" + "x" * 40


@pytest.fixture
def content_dir() -> Path:
    return FIXTURES / "content"


@pytest.fixture
async def engine():
    engine = create_async_engine(settings.test_database_url, future=True)
    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.drop_all)
        await connection.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def session(engine) -> AsyncIterator[AsyncSession]:
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session


@pytest.fixture
async def redis() -> AsyncIterator[Redis]:
    client = Redis.from_url(settings.test_redis_url, decode_responses=True)
    await client.flushdb()
    yield client
    await client.flushdb()
    await client.aclose()


@pytest.fixture
async def client(
    session: AsyncSession, redis: Redis, content_dir: Path
) -> AsyncIterator[httpx.AsyncClient]:
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_content_dir] = lambda: content_dir
    app.dependency_overrides[get_redis] = lambda: redis

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


async def register_user(
    client: httpx.AsyncClient,
    email: str = "anna@example.com",
    password: str = "correct-horse",
    name: str = "Анна",
) -> dict:
    """Регистрирует пользователя и выставляет клиенту заголовок авторизации."""
    response = await client.post(
        "/api/auth/register", json={"name": name, "email": email, "password": password}
    )
    assert response.status_code == 201, response.text
    data = response.json()
    client.headers["Authorization"] = f"Bearer {data['access_token']}"
    return data


@pytest.fixture
async def user_id(client: httpx.AsyncClient) -> str:
    """id вошедшего пользователя: клиент уже авторизован."""
    return (await register_user(client))["user"]["id"]
