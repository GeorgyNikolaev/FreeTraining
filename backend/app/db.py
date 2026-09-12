from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False, future=True)

session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def create_tables() -> None:
    import app.models  # noqa: F401  регистрирует таблицы в метаданных

    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)
