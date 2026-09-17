from dataclasses import dataclass
from datetime import timedelta

import jwt

from app.config import settings
from app.models import utcnow

ALGORITHM = "HS256"


@dataclass(frozen=True)
class AccessClaims:
    user_id: str
    session_id: str


def create_access_token(user_id: str, session_id: str) -> str:
    now = utcnow()
    payload = {
        "sub": user_id,
        "sid": session_id,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(seconds=settings.access_token_ttl_seconds),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> AccessClaims | None:
    """Проверяет подпись, срок и тип. Недействительный токен — None."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[ALGORITHM],
            options={"require": ["sub", "sid", "type", "exp", "iat"]},
        )
    except jwt.PyJWTError:
        return None
    if payload["type"] != "access":
        return None
    return AccessClaims(user_id=str(payload["sub"]), session_id=str(payload["sid"]))
