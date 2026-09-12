from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.courses import get_course_or_404
from app.content.models import Course, Quiz
from app.deps import get_content_dir, get_session, get_user_id
from app.models import QuizAttempt
from app.schemas import QuizPublic, QuizQuestionPublic, QuizResult, QuizSubmission
from app.services.grading import grade_quiz

router = APIRouter(prefix="/api", tags=["quizzes"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
ContentDep = Annotated[Path, Depends(get_content_dir)]
UserDep = Annotated[str, Depends(get_user_id)]


def find_quiz(course: Course, scope: str, module_id: str | None) -> tuple[Quiz, str]:
    """Возвращает тест и его заголовок либо бросает 404."""
    if scope == "exam":
        if course.exam is None:
            raise HTTPException(status_code=404, detail="Тест не найден")
        return course.exam, "Финальный экзамен"

    for module in course.modules:
        if module.id == module_id and module.quiz is not None:
            return module.quiz, f"Тест модуля: {module.title}"
    raise HTTPException(status_code=404, detail="Тест не найден")


def to_public(
    course_id: str, scope: str, module_id: str | None, quiz: Quiz, title: str
) -> QuizPublic:
    return QuizPublic(
        course_id=course_id,
        scope=scope,
        module_id=module_id,
        title=title,
        pass_score=quiz.pass_score,
        questions=[
            QuizQuestionPublic(
                index=index,
                question=question.question,
                options=question.options,
                multiple=question.multiple,
            )
            for index, question in enumerate(quiz.questions)
        ],
    )


@router.get("/courses/{course_id}/quizzes/{module_id}", response_model=QuizPublic)
async def get_module_quiz(course_id: str, module_id: str, content_dir: ContentDep) -> QuizPublic:
    course = get_course_or_404(content_dir, course_id)
    quiz, title = find_quiz(course, "module", module_id)
    return to_public(course.id, "module", module_id, quiz, title)


@router.get("/courses/{course_id}/exam", response_model=QuizPublic)
async def get_exam(course_id: str, content_dir: ContentDep) -> QuizPublic:
    course = get_course_or_404(content_dir, course_id)
    quiz, title = find_quiz(course, "exam", None)
    return to_public(course.id, "exam", None, quiz, title)


@router.post("/quizzes/submit", response_model=QuizResult)
async def submit_quiz(
    submission: QuizSubmission,
    session: SessionDep,
    content_dir: ContentDep,
    user_id: UserDep,
) -> QuizResult:
    course = get_course_or_404(content_dir, submission.course_id)
    quiz, _ = find_quiz(course, submission.scope, submission.module_id)

    try:
        outcome = grade_quiz(quiz, submission.answers)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    attempt = QuizAttempt(
        user_id=user_id,
        course_id=course.id,
        scope=submission.scope,
        module_id=submission.module_id if submission.scope == "module" else None,
        total_questions=outcome.total_questions,
        correct_count=outcome.correct_count,
        score_percent=outcome.score_percent,
        passed=outcome.passed,
        answers=[result.model_dump() for result in outcome.results],
    )
    session.add(attempt)
    await session.commit()
    await session.refresh(attempt)

    return QuizResult(
        attempt_id=attempt.id or 0,
        course_id=course.id,
        scope=submission.scope,
        module_id=attempt.module_id,
        total_questions=outcome.total_questions,
        correct_count=outcome.correct_count,
        score_percent=outcome.score_percent,
        passed=outcome.passed,
        pass_score=quiz.pass_score,
        results=outcome.results,
        created_at=attempt.created_at,
    )
