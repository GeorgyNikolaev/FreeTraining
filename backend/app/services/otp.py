"""Одноразовые коды для подтверждения почты и восстановления пароля.

Эндпоинтов пока нет: это задел, покрытый тестами.
"""

import hashlib
import hmac
import secrets
from dataclasses import dataclass
from typing import Literal

from redis.asyncio import Redis

from app.config import settings

OtpPurpose = Literal["email_verify", "password_reset"]

CODE_TTL_SECONDS = 10 * 60
RESEND_COOLDOWN_SECONDS = 60
MAX_ATTEMPTS = 5


class OtpCooldownError(Exception):
    def __init__(self, retry_after: int) -> None:
        super().__init__(f"Повторить можно через {retry_after} с")
        self.retry_after = retry_after


@dataclass(frozen=True)
class OtpCheck:
    ok: bool
    attempts_left: int


def _code_key(purpose: OtpPurpose, subject: str) -> str:
    return f"otp:{purpose}:{subject}"


def _cooldown_key(purpose: OtpPurpose, subject: str) -> str:
    return f"otp:cooldown:{purpose}:{subject}"


def _hash(code: str) -> str:
    return hmac.new(settings.jwt_secret.encode(), code.encode(), hashlib.sha256).hexdigest()


async def issue_code(redis: Redis, purpose: OtpPurpose, subject: str) -> str:
    """Выдаёт новый код, прежний перестаёт действовать."""
    cooldown = await redis.ttl(_cooldown_key(purpose, subject))
    if cooldown > 0:
        raise OtpCooldownError(cooldown)

    code = f"{secrets.randbelow(1_000_000):06d}"
    key = _code_key(purpose, subject)
    async with redis.pipeline(transaction=True) as pipe:
        pipe.delete(key)
        pipe.hset(key, mapping={"hash": _hash(code), "attempts": 0})
        pipe.expire(key, CODE_TTL_SECONDS)
        pipe.set(_cooldown_key(purpose, subject), 1, ex=RESEND_COOLDOWN_SECONDS)
        await pipe.execute()
    return code


async def verify_code(redis: Redis, purpose: OtpPurpose, subject: str, code: str) -> OtpCheck:
    """Сверяет код. Верный код сгорает, после MAX_ATTEMPTS ошибок сгорает любой."""
    key = _code_key(purpose, subject)
    stored = await redis.hget(key, "hash")
    if stored is None:
        return OtpCheck(ok=False, attempts_left=0)

    if hmac.compare_digest(stored, _hash(code.strip())):
        await redis.delete(key)
        return OtpCheck(ok=True, attempts_left=0)

    attempts = await redis.hincrby(key, "attempts", 1)
    left = MAX_ATTEMPTS - attempts
    if left <= 0:
        await redis.delete(key)
    return OtpCheck(ok=False, attempts_left=max(left, 0))
