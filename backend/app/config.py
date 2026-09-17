from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Значения ниже — запасные для локальной работы. Переменные окружения и
    backend/.env их перекрывают; файл ищется от папки бэкенда, а не от текущей
    папки процесса, поэтому запуск из IDE или из корня репозитория его видит."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str = (
        "postgresql+asyncpg://freetraining:freetraining@localhost:5433/freetraining"
    )
    test_database_url: str = (
        "postgresql+asyncpg://freetraining:freetraining@localhost:5433/freetraining_test"
    )
    redis_url: str = "redis://localhost:6380/0"
    test_redis_url: str = "redis://localhost:6380/15"
    content_dir: Path = REPO_ROOT / "content"
    cors_origins: list[str] = ["http://localhost:5173"]

    jwt_secret: str = ""
    access_token_ttl_seconds: int = 15 * 60
    refresh_token_ttl_seconds: int = 30 * 24 * 60 * 60
    cookie_secure: bool = False


settings = Settings()

JWT_SECRET_HINT = (
    "Не задана переменная JWT_SECRET. Добавьте её в backend/.env, например: "
    'JWT_SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(48))")'
)
