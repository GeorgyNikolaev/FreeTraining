from fastapi.concurrency import run_in_threadpool
from pwdlib import PasswordHash

_hasher = PasswordHash.recommended()  # Argon2id

# Хеш, с которым сверяется пароль несуществующей почты: время ответа
# не должно выдавать, зарегистрирована ли почта.
_DUMMY_HASH = _hasher.hash("dummy-password-for-timing")


async def hash_password(password: str) -> str:
    return await run_in_threadpool(_hasher.hash, password)


async def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        await run_in_threadpool(_hasher.verify, password, _DUMMY_HASH)
        return False
    return await run_in_threadpool(_hasher.verify, password, password_hash)
