"""Сессии входа в Redis.

Refresh-токен — случайная строка, в Redis хранится только её SHA-256. Каждое
обновление выдаёт новый токен; повтор уже сменённого токена позже окна
ROTATION_GRACE_SECONDS означает кражу, и сессия отзывается.
"""

import hashlib
import secrets
import time
from dataclasses import dataclass

from redis.asyncio import Redis

from app.config import settings

ROTATION_GRACE_SECONDS = 20


@dataclass(frozen=True)
class IssuedSession:
    session_id: str
    user_id: str
    refresh_token: str


class RefreshError(Exception):
    """Refresh-токен недействителен."""


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def session_key(session_id: str) -> str:
    return f"auth:session:{session_id}"


def _refresh_key(token_hash: str) -> str:
    return f"auth:refresh:{token_hash}"


def _used_key(token_hash: str) -> str:
    return f"auth:used:{token_hash}"


def _user_sessions_key(user_id: str) -> str:
    return f"auth:user_sessions:{user_id}"


async def create_session(
    redis: Redis, user_id: str, user_agent: str = "", ip: str = ""
) -> IssuedSession:
    session_id = secrets.token_urlsafe(16)
    token = secrets.token_urlsafe(32)
    ttl = settings.refresh_token_ttl_seconds
    async with redis.pipeline(transaction=True) as pipe:
        pipe.hset(
            session_key(session_id),
            mapping={
                "user_id": user_id,
                "refresh_hash": _hash(token),
                "created_at": str(int(time.time())),
                "user_agent": user_agent[:256],
                "ip": ip,
            },
        )
        pipe.expire(session_key(session_id), ttl)
        pipe.set(_refresh_key(_hash(token)), session_id, ex=ttl)
        pipe.sadd(_user_sessions_key(user_id), session_id)
        pipe.expire(_user_sessions_key(user_id), ttl)
        await pipe.execute()
    return IssuedSession(session_id=session_id, user_id=user_id, refresh_token=token)


async def _rotate(redis: Redis, session_id: str, user_id: str, old_hash: str) -> IssuedSession:
    token = secrets.token_urlsafe(32)
    ttl = settings.refresh_token_ttl_seconds
    async with redis.pipeline(transaction=True) as pipe:
        pipe.delete(_refresh_key(old_hash))
        pipe.set(_used_key(old_hash), f"{session_id}|{int(time.time())}", ex=ttl)
        pipe.set(_refresh_key(_hash(token)), session_id, ex=ttl)
        pipe.hset(session_key(session_id), "refresh_hash", _hash(token))
        pipe.expire(session_key(session_id), ttl)
        pipe.expire(_user_sessions_key(user_id), ttl)
        await pipe.execute()
    return IssuedSession(session_id=session_id, user_id=user_id, refresh_token=token)


async def rotate_refresh_token(redis: Redis, token: str) -> IssuedSession:
    token_hash = _hash(token)

    session_id = await redis.getdel(_refresh_key(token_hash))
    if session_id is not None:
        user_id = await redis.hget(session_key(session_id), "user_id")
        if user_id is None:
            raise RefreshError
        return await _rotate(redis, session_id, user_id, token_hash)

    used = await redis.get(_used_key(token_hash))
    if used is None:
        raise RefreshError
    session_id, rotated_at = used.split("|")
    user_id = await redis.hget(session_key(session_id), "user_id")
    if user_id is None:
        raise RefreshError
    if time.time() - int(rotated_at) <= ROTATION_GRACE_SECONDS:
        return await _rotate(redis, session_id, user_id, token_hash)

    await revoke_session(redis, session_id)
    raise RefreshError


async def session_user_id(redis: Redis, session_id: str) -> str | None:
    return await redis.hget(session_key(session_id), "user_id")


async def revoke_session(redis: Redis, session_id: str) -> None:
    data = await redis.hgetall(session_key(session_id))
    if not data:
        return
    async with redis.pipeline(transaction=True) as pipe:
        pipe.delete(session_key(session_id))
        pipe.delete(_refresh_key(data["refresh_hash"]))
        pipe.srem(_user_sessions_key(data["user_id"]), session_id)
        await pipe.execute()


async def revoke_session_by_refresh_token(redis: Redis, token: str) -> None:
    session_id = await redis.get(_refresh_key(_hash(token)))
    if session_id is not None:
        await revoke_session(redis, session_id)


async def revoke_all_sessions(redis: Redis, user_id: str) -> None:
    """Отзывает все сессии пользователя. Понадобится при сбросе пароля."""
    for session_id in await redis.smembers(_user_sessions_key(user_id)):
        await revoke_session(redis, session_id)
    await redis.delete(_user_sessions_key(user_id))
