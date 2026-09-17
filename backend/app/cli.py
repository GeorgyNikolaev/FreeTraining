"""Служебные команды.

    uv run python -m app.cli claim-local --email you@example.com
"""

import argparse
import asyncio

from sqlalchemy import select

from app.db import create_tables, engine, session_factory
from app.models import UserAccount
from app.schemas import normalize_email
from app.services.guests import count_progress, merge_progress

LEGACY_USER_ID = "local"


async def claim_local(email: str) -> int:
    await create_tables()
    async with session_factory() as session:
        user = (
            await session.execute(
                select(UserAccount).where(UserAccount.email == normalize_email(email))
            )
        ).scalar_one_or_none()
        if user is None:
            print(f"Аккаунт {email} не найден. Сначала зарегистрируйтесь.")
            return 1

        counts = await count_progress(session, LEGACY_USER_ID)
        if counts is None:
            print("Прогресса пользователя local нет — переносить нечего.")
            return 0

        await merge_progress(session, LEGACY_USER_ID, str(user.id))
        await session.commit()
        print(
            f"Перенесено в {user.email}: курсов {counts.courses}, "
            f"уроков {counts.lessons}, попыток тестов {counts.attempts}."
        )
    await engine.dispose()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    claim = commands.add_parser(
        "claim-local", help="перенести прогресс пользователя local в аккаунт"
    )
    claim.add_argument("--email", required=True)
    args = parser.parse_args()

    if args.command == "claim-local":
        return asyncio.run(claim_local(args.email))
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
