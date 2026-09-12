from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


def get_content_dir() -> Path:
    return settings.content_dir


def get_user_id() -> str:
    return settings.user_id
