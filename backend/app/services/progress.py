from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Course
from app.models import LastPosition, LessonProgress, QuizAttempt


@dataclass
class CourseProgress:
    completed_lessons: set[tuple[str, str]] = field(default_factory=set)
    module_best: dict[str, int] = field(default_factory=dict)
    module_passed: set[str] = field(default_factory=set)
    exam_best: int | None = None
    exam_passed: bool = False
    resume: tuple[str, str] | None = None
    total_units: int = 0
    done_units: int = 0
    percent: int = 0
    status: str = "not_started"


async def load_course_progress(
    session: AsyncSession, user_id: str, course: Course
) -> CourseProgress:
    """Собирает прогресс курса.

    Записи о несуществующих уроках не учитываются.
    """
    lesson_rows = (
        await session.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == user_id,
                LessonProgress.course_id == course.id,
            )
        )
    ).scalars().all()

    attempts = (
        await session.execute(
            select(QuizAttempt).where(
                QuizAttempt.user_id == user_id,
                QuizAttempt.course_id == course.id,
            )
        )
    ).scalars().all()

    position = (
        await session.execute(
            select(LastPosition).where(
                LastPosition.user_id == user_id,
                LastPosition.course_id == course.id,
            )
        )
    ).scalar_one_or_none()

    known_lessons = {
        (module.id, lesson.id) for module in course.modules for lesson in module.lessons
    }
    completed = {(row.module_id, row.lesson_id) for row in lesson_rows} & known_lessons

    module_best: dict[str, int] = {}
    module_passed: set[str] = set()
    exam_scores: list[int] = []
    exam_passed = False

    for attempt in attempts:
        if attempt.scope == "module" and attempt.module_id:
            module_best[attempt.module_id] = max(
                module_best.get(attempt.module_id, 0), attempt.score_percent
            )
            if attempt.passed:
                module_passed.add(attempt.module_id)
        elif attempt.scope == "exam":
            exam_scores.append(attempt.score_percent)
            exam_passed = exam_passed or attempt.passed

    total_units = course.lesson_count + course.quiz_count + (1 if course.exam else 0)
    done_quizzes = sum(
        1 for module in course.modules if module.quiz is not None and module.id in module_passed
    )
    done_units = len(completed) + done_quizzes + (1 if exam_passed else 0)
    percent = round(done_units * 100 / total_units) if total_units else 0

    resume = (position.module_id, position.lesson_id) if position else None

    if total_units and done_units >= total_units:
        status = "completed"
    elif done_units or resume:
        status = "in_progress"
    else:
        status = "not_started"

    return CourseProgress(
        completed_lessons=completed,
        module_best=module_best,
        module_passed=module_passed,
        exam_best=max(exam_scores) if exam_scores else None,
        exam_passed=exam_passed,
        resume=resume,
        total_units=total_units,
        done_units=done_units,
        percent=percent,
        status=status,
    )
