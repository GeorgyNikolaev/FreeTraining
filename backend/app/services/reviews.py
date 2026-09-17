from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Course
from app.models import CourseReview
from app.services.progress import CourseProgress

REVIEW_MODULES_REQUIRED = 2


@dataclass(frozen=True)
class RatingStats:
    average: float | None = None
    count: int = 0


async def load_rating_stats(
    session: AsyncSession, course_ids: list[str]
) -> dict[str, RatingStats]:
    """Средняя оценка и число оценок по курсам одним запросом."""
    if not course_ids:
        return {}
    rows = (
        await session.execute(
            select(
                CourseReview.course_id,
                func.avg(CourseReview.rating),
                func.count(CourseReview.id),
            )
            .where(CourseReview.course_id.in_(course_ids))
            .group_by(CourseReview.course_id)
        )
    ).all()
    return {
        course_id: RatingStats(average=round(float(average), 1), count=count)
        for course_id, average, count in rows
    }


def count_completed_modules(course: Course, progress: CourseProgress) -> int:
    """Модуль пройден, когда пройдены все его уроки и сдан тест, если он есть."""
    return sum(
        1
        for module in course.modules
        if all((module.id, lesson.id) in progress.completed_lessons for lesson in module.lessons)
        and (module.quiz is None or module.id in progress.module_passed)
    )


def modules_required(course: Course) -> int:
    return min(REVIEW_MODULES_REQUIRED, len(course.modules))
