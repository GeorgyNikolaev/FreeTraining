from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+asyncpg://freetraining:freetraining@localhost:5433/freetraining"
    )
    test_database_url: str = (
        "postgresql+asyncpg://freetraining:freetraining@localhost:5433/freetraining_test"
    )
    content_dir: Path = REPO_ROOT / "content"
    user_id: str = "local"
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
