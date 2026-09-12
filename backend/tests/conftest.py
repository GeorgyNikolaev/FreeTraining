from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from httpx import ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

import app.models  # noqa: F401  регистрирует таблицы в метаданных
from app.config import settings
from app.deps import get_content_dir, get_session
from app.main import app

FIXTURES = Path(__file__).parent / "fixtures"


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
async def client(session: AsyncSession, content_dir: Path) -> AsyncIterator[httpx.AsyncClient]:
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_content_dir] = lambda: content_dir

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
