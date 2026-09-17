from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.deps import (
    Identity,
    clear_guest_cookie,
    get_redis,
    get_session,
    read_guest_id,
    require_user,
)
from app.models import UserAccount
from app.schemas import (
    AuthSession,
    GuestProgress,
    LoginInput,
    Me,
    RegisterInput,
    UserOut,
)
from app.services.guests import count_progress, delete_progress, merge_progress
from app.services.passwords import hash_password, verify_password
from app.services.rate_limit import is_limited, register_hit
from app.services.sessions import (
    IssuedSession,
    RefreshError,
    create_session,
    revoke_session_by_refresh_token,
    rotate_refresh_token,
)
from app.services.tokens import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
RedisDep = Annotated[Redis, Depends(get_redis)]
UserDep = Annotated[Identity, Depends(require_user)]

REFRESH_COOKIE = "ft_refresh"
REFRESH_COOKIE_PATH = "/api/auth"

LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 15 * 60
REGISTRATIONS_PER_IP = 10
REGISTER_WINDOW_SECONDS = 60 * 60

INVALID_CREDENTIALS = "Неверная почта или пароль"


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=settings.refresh_token_ttl_seconds,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        REFRESH_COOKIE,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
    )


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def to_user_out(user: UserAccount) -> UserOut:
    return UserOut(
        id=str(user.id),
        name=user.name,
        email=user.email,
        email_verified=user.email_verified_at is not None,
    )


async def load_guest_progress(session: AsyncSession, request: Request) -> GuestProgress | None:
    guest_id = read_guest_id(request)
    if guest_id is None:
        return None
    counts = await count_progress(session, guest_id)
    if counts is None:
        return None
    return GuestProgress(courses=counts.courses, lessons=counts.lessons, attempts=counts.attempts)


async def get_account(session: AsyncSession, user_id: str) -> UserAccount:
    try:
        user = await session.get(UserAccount, UUID(user_id))
    except ValueError:
        user = None
    if user is None:
        raise HTTPException(status_code=401, detail="Аккаунт не найден")
    return user


async def build_auth_session(
    session: AsyncSession,
    request: Request,
    response: Response,
    user: UserAccount,
    issued: IssuedSession,
) -> AuthSession:
    set_refresh_cookie(response, issued.refresh_token)
    return AuthSession(
        access_token=create_access_token(issued.user_id, issued.session_id),
        expires_in=settings.access_token_ttl_seconds,
        user=to_user_out(user),
        guest_progress=await load_guest_progress(session, request),
    )


def too_many(retry_after: int, what: str) -> HTTPException:
    minutes = max(1, -(-retry_after // 60))
    return HTTPException(
        status_code=429,
        detail=f"Слишком много попыток {what}. Попробуйте через {minutes} мин.",
        headers={"Retry-After": str(retry_after)},
    )


@router.post("/register", response_model=AuthSession, status_code=201)
async def register(
    payload: RegisterInput,
    request: Request,
    response: Response,
    session: SessionDep,
    redis: RedisDep,
) -> AuthSession:
    limit_key = f"auth:rl:register:{client_ip(request)}"
    retry_after = await is_limited(redis, limit_key, REGISTRATIONS_PER_IP)
    if retry_after is not None:
        raise too_many(retry_after, "регистрации")

    exists = await session.scalar(select(UserAccount.id).where(UserAccount.email == payload.email))
    if exists is not None:
        raise HTTPException(status_code=409, detail="Эта почта уже зарегистрирована")

    user = UserAccount(
        email=payload.email,
        name=payload.name,
        password_hash=await hash_password(payload.password),
    )
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="Эта почта уже зарегистрирована") from exc

    guest_id = read_guest_id(request)
    if guest_id is not None:
        await merge_progress(session, guest_id, str(user.id))
        clear_guest_cookie(response)
    await session.commit()
    await register_hit(redis, limit_key, REGISTER_WINDOW_SECONDS)

    issued = await create_session(
        redis, str(user.id), request.headers.get("user-agent", ""), client_ip(request)
    )
    result = await build_auth_session(session, request, response, user, issued)
    # Гостевой прогресс уже перенесён, хотя cookie в этом запросе ещё пришла
    result.guest_progress = None
    return result


@router.post("/login", response_model=AuthSession)
async def login(
    payload: LoginInput,
    request: Request,
    response: Response,
    session: SessionDep,
    redis: RedisDep,
) -> AuthSession:
    limit_key = f"auth:rl:login:{payload.email}"
    retry_after = await is_limited(redis, limit_key, LOGIN_ATTEMPTS)
    if retry_after is not None:
        raise too_many(retry_after, "входа")

    user = (
        await session.execute(select(UserAccount).where(UserAccount.email == payload.email))
    ).scalar_one_or_none()
    if not await verify_password(payload.password, user.password_hash if user else None):
        await register_hit(redis, limit_key, LOGIN_WINDOW_SECONDS)
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS)
    assert user is not None

    await redis.delete(limit_key)
    issued = await create_session(
        redis, str(user.id), request.headers.get("user-agent", ""), client_ip(request)
    )
    return await build_auth_session(session, request, response, user, issued)


@router.post("/refresh", response_model=AuthSession)
async def refresh(
    request: Request, response: Response, session: SessionDep, redis: RedisDep
) -> AuthSession | JSONResponse:
    token = request.cookies.get(REFRESH_COOKIE)
    try:
        if not token:
            raise RefreshError
        issued = await rotate_refresh_token(redis, token)
        user = await get_account(session, issued.user_id)
    except (RefreshError, HTTPException):
        expired = JSONResponse(status_code=401, content={"detail": "Сессия истекла, войдите снова"})
        clear_refresh_cookie(expired)
        return expired
    return await build_auth_session(session, request, response, user, issued)


@router.post("/logout", response_model=dict[str, str])
async def logout(request: Request, response: Response, redis: RedisDep) -> dict[str, str]:
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        await revoke_session_by_refresh_token(redis, token)
    clear_refresh_cookie(response)
    return {"status": "ok"}


@router.get("/me", response_model=Me)
async def me(request: Request, identity: UserDep, session: SessionDep) -> Me:
    user = await get_account(session, identity.user_id)
    return Me(user=to_user_out(user), guest_progress=await load_guest_progress(session, request))


@router.post("/guest/merge", response_model=dict[str, str])
async def merge_guest(
    request: Request, response: Response, identity: UserDep, session: SessionDep
) -> dict[str, str]:
    guest_id = read_guest_id(request)
    if guest_id is not None:
        await merge_progress(session, guest_id, identity.user_id)
        await session.commit()
    clear_guest_cookie(response)
    return {"status": "ok"}


@router.post("/guest/discard", response_model=dict[str, str])
async def discard_guest(
    request: Request, response: Response, identity: UserDep, session: SessionDep
) -> dict[str, str]:
    guest_id = read_guest_id(request)
    if guest_id is not None:
        await delete_progress(session, guest_id)
        await session.commit()
    clear_guest_cookie(response)
    return {"status": "ok"}
