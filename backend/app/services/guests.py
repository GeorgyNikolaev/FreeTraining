"""Гостевой прогресс и его перенос в аккаунт."""

import re
import secrets
from dataclasses import dataclass

from sqlalchemy import delete, func, literal, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CourseReview, LastPosition, LessonProgress, QuizAttempt

GUEST_PREFIX = "guest:"
_GUEST_RE = re.compile(r"^guest:[A-Za-z0-9_-]{32}$")


def new_guest_id() -> str:
    return GUEST_PREFIX + secrets.token_urlsafe(24)


def is_guest_id(value: str | None) -> bool:
    return value is not None and _GUEST_RE.fullmatch(value) is not None


@dataclass(frozen=True)
class ProgressCounts:
    courses: int
    lessons: int
    attempts: int


async def count_progress(session: AsyncSession, user_id: str) -> ProgressCounts | None:
    """Сколько прогресса накоплено. None, если ничего."""
    lessons = await session.scalar(
        select(func.count()).select_from(LessonProgress).where(LessonProgress.user_id == user_id)
    )
    attempts = await session.scalar(
        select(func.count()).select_from(QuizAttempt).where(QuizAttempt.user_id == user_id)
    )
    course_ids = select(LessonProgress.course_id).where(LessonProgress.user_id == user_id).union(
        select(QuizAttempt.course_id).where(QuizAttempt.user_id == user_id),
        select(LastPosition.course_id).where(LastPosition.user_id == user_id),
    )
    courses = await session.scalar(select(func.count()).select_from(course_ids.subquery()))
    if not courses:
        return None
    return ProgressCounts(courses=courses, lessons=lessons or 0, attempts=attempts or 0)


async def merge_progress(session: AsyncSession, source: str, target: str) -> None:
    """Переносит прогресс source в target и удаляет данные source. Коммит — у вызывающего."""
    lessons = insert(LessonProgress).from_select(
        ["user_id", "course_id", "module_id", "lesson_id", "completed_at"],
        select(
            literal(target),
            LessonProgress.course_id,
            LessonProgress.module_id,
            LessonProgress.lesson_id,
            LessonProgress.completed_at,
        ).where(LessonProgress.user_id == source),
    )
    await session.execute(
        lessons.on_conflict_do_update(
            constraint="uq_lesson_progress",
            set_={
                "completed_at": func.least(
                    LessonProgress.__table__.c.completed_at, lessons.excluded.completed_at
                )
            },
        )
    )

    positions = insert(LastPosition).from_select(
        ["user_id", "course_id", "module_id", "lesson_id", "updated_at"],
        select(
            literal(target),
            LastPosition.course_id,
            LastPosition.module_id,
            LastPosition.lesson_id,
            LastPosition.updated_at,
        ).where(LastPosition.user_id == source),
    )
    table = LastPosition.__table__.c
    await session.execute(
        positions.on_conflict_do_update(
            constraint="uq_last_position",
            set_={
                "module_id": positions.excluded.module_id,
                "lesson_id": positions.excluded.lesson_id,
                "updated_at": positions.excluded.updated_at,
            },
            where=positions.excluded.updated_at > table.updated_at,
        )
    )

    await session.execute(
        update(QuizAttempt).where(QuizAttempt.user_id == source).values(user_id=target)
    )

    reviewed = select(CourseReview.course_id).where(CourseReview.user_id == target)
    await session.execute(
        update(CourseReview)
        .where(CourseReview.user_id == source, CourseReview.course_id.not_in(reviewed))
        .values(user_id=target)
    )

    await delete_progress(session, source)


async def delete_progress(session: AsyncSession, user_id: str) -> None:
    for model in (LessonProgress, QuizAttempt, LastPosition, CourseReview):
        await session.execute(delete(model).where(model.user_id == user_id))
