from collections.abc import AsyncIterator
from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

from fastapi import Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import session_factory
from app.redis_client import redis_client
from app.services.guests import is_guest_id, new_guest_id
from app.services.sessions import session_user_id
from app.services.tokens import decode_access_token

GUEST_COOKIE = "ft_guest"
GUEST_COOKIE_MAX_AGE = 365 * 24 * 60 * 60


async def get_session() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


def get_content_dir() -> Path:
    return settings.content_dir


def get_redis() -> Redis:
    return redis_client


@dataclass(frozen=True)
class Identity:
    user_id: str
    is_guest: bool
    # Гость без cookie: id сгенерирован, но ещё нигде не сохранён
    is_new_guest: bool = False


bearer_scheme = HTTPBearer(auto_error=False)


def set_guest_cookie(response: Response, guest_id: str) -> None:
    response.set_cookie(
        GUEST_COOKIE,
        guest_id,
        max_age=GUEST_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/api",
    )


def clear_guest_cookie(response: Response) -> None:
    response.delete_cookie(
        GUEST_COOKIE, path="/api", httponly=True, secure=settings.cookie_secure, samesite="lax"
    )


def read_guest_id(request: Request) -> str | None:
    value = request.cookies.get(GUEST_COOKIE)
    return value if is_guest_id(value) else None


async def get_identity(
    request: Request,
    redis: Annotated[Redis, Depends(get_redis)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> Identity:
    """Пользователь по access-токену, иначе гость.

    Недействительный токен — 401, а не гость: клиент должен обновить токен.
    """
    if credentials is not None:
        claims = decode_access_token(credentials.credentials)
        if claims is None or await session_user_id(redis, claims.session_id) != claims.user_id:
            raise HTTPException(
                status_code=401,
                detail="Сессия истекла, войдите снова",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return Identity(user_id=claims.user_id, is_guest=False)

    guest_id = read_guest_id(request)
    if guest_id is not None:
        return Identity(user_id=guest_id, is_guest=True)
    return Identity(user_id=new_guest_id(), is_guest=True, is_new_guest=True)


async def get_writer_identity(
    response: Response, identity: Annotated[Identity, Depends(get_identity)]
) -> Identity:
    """Как get_identity, но новому гостю выставляет cookie, чтобы прогресс не потерялся."""
    if identity.is_new_guest:
        set_guest_cookie(response, identity.user_id)
    return identity


async def require_user(identity: Annotated[Identity, Depends(get_identity)]) -> Identity:
    if identity.is_guest:
        raise HTTPException(
            status_code=401,
            detail="Войдите в аккаунт",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return identity


async def get_user_id(identity: Annotated[Identity, Depends(get_identity)]) -> str:
    """id для чтения прогресса: пользователь или гость."""
    return identity.user_id


async def get_writer_user_id(identity: Annotated[Identity, Depends(get_writer_identity)]) -> str:
    """id для записи прогресса: новый гость получает cookie."""
    return identity.user_id
