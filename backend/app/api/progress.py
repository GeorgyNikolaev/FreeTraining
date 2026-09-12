from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.courses import get_course_or_404
from app.content.loader import read_lesson_text
from app.deps import get_content_dir, get_session, get_user_id
from app.models import LastPosition, LessonProgress, QuizAttempt, utcnow
from app.schemas import (
    AttemptSummary,
    LessonProgressOut,
    PositionInput,
    PositionOut,
    ProgressExport,
    QuestionResult,
)

router = APIRouter(prefix="/api/progress", tags=["progress"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
ContentDep = Annotated[Path, Depends(get_content_dir)]
UserDep = Annotated[str, Depends(get_user_id)]


@router.post(
    "/lessons/{course_id}/{module_id}/{lesson_id}", response_model=LessonProgressOut
)
async def complete_lesson(
    course_id: str,
    module_id: str,
    lesson_id: str,
    session: SessionDep,
    content_dir: ContentDep,
    user_id: UserDep,
) -> LessonProgressOut:
    course = get_course_or_404(content_dir, course_id)
    if read_lesson_text(course, module_id, lesson_id) is None:
        raise HTTPException(status_code=404, detail="Урок не найден")

    existing = (
        await session.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == user_id,
                LessonProgress.course_id == course_id,
                LessonProgress.module_id == module_id,
                LessonProgress.lesson_id == lesson_id,
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        existing = LessonProgress(
            user_id=user_id,
            course_id=course_id,
            module_id=module_id,
            lesson_id=lesson_id,
        )
        session.add(existing)
        await session.commit()
        await session.refresh(existing)

    return LessonProgressOut(
        course_id=course_id,
        module_id=module_id,
        lesson_id=lesson_id,
        completed=True,
        completed_at=existing.completed_at,
    )


@router.put("/position/{course_id}", response_model=PositionOut)
async def save_position(
    course_id: str,
    payload: PositionInput,
    session: SessionDep,
    content_dir: ContentDep,
    user_id: UserDep,
) -> PositionOut:
    course = get_course_or_404(content_dir, course_id)
    if read_lesson_text(course, payload.module_id, payload.lesson_id) is None:
        raise HTTPException(status_code=404, detail="Урок не найден")

    position = (
        await session.execute(
            select(LastPosition).where(
                LastPosition.user_id == user_id,
                LastPosition.course_id == course_id,
            )
        )
    ).scalar_one_or_none()

    if position is None:
        position = LastPosition(
            user_id=user_id,
            course_id=course_id,
            module_id=payload.module_id,
            lesson_id=payload.lesson_id,
        )
        session.add(position)
    else:
        position.module_id = payload.module_id
        position.lesson_id = payload.lesson_id
        position.updated_at = utcnow()

    await session.commit()
    await session.refresh(position)

    return PositionOut(
        course_id=course_id,
        module_id=position.module_id,
        lesson_id=position.lesson_id,
        updated_at=position.updated_at,
    )


def to_attempt_summary(attempt: QuizAttempt) -> AttemptSummary:
    return AttemptSummary(
        id=attempt.id or 0,
        course_id=attempt.course_id,
        scope=attempt.scope,
        module_id=attempt.module_id,
        total_questions=attempt.total_questions,
        correct_count=attempt.correct_count,
        score_percent=attempt.score_percent,
        passed=attempt.passed,
        created_at=attempt.created_at,
        results=[QuestionResult.model_validate(item) for item in attempt.answers],
    )


@router.get("/attempts/{course_id}", response_model=list[AttemptSummary])
async def list_attempts(
    course_id: str, session: SessionDep, user_id: UserDep
) -> list[AttemptSummary]:
    attempts = (
        (
            await session.execute(
                select(QuizAttempt)
                .where(QuizAttempt.user_id == user_id, QuizAttempt.course_id == course_id)
                .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
            )
        )
        .scalars()
        .all()
    )

    return [to_attempt_summary(attempt) for attempt in attempts]


@router.delete("/courses/{course_id}", response_model=dict[str, str])
async def reset_course(
    course_id: str, session: SessionDep, user_id: UserDep
) -> dict[str, str]:
    for table in (LessonProgress, QuizAttempt, LastPosition):
        await session.execute(
            delete(table).where(table.user_id == user_id, table.course_id == course_id)
        )
    await session.commit()
    return {"status": "ok"}


@router.get("/export", response_model=ProgressExport)
async def export_progress(session: SessionDep, user_id: UserDep) -> ProgressExport:
    lessons = (
        (await session.execute(select(LessonProgress).where(LessonProgress.user_id == user_id)))
        .scalars()
        .all()
    )
    attempts = (
        (
            await session.execute(
                select(QuizAttempt)
                .where(QuizAttempt.user_id == user_id)
                .order_by(QuizAttempt.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    positions = (
        (await session.execute(select(LastPosition).where(LastPosition.user_id == user_id)))
        .scalars()
        .all()
    )

    return ProgressExport(
        user_id=user_id,
        exported_at=utcnow(),
        lessons=[
            LessonProgressOut(
                course_id=row.course_id,
                module_id=row.module_id,
                lesson_id=row.lesson_id,
                completed=True,
                completed_at=row.completed_at,
            )
            for row in lessons
        ],
        attempts=[to_attempt_summary(attempt) for attempt in attempts],
        positions=[
            PositionOut(
                course_id=row.course_id,
                module_id=row.module_id,
                lesson_id=row.lesson_id,
                updated_at=row.updated_at,
            )
            for row in positions
        ],
    )
