from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.loader import CourseLoadError, load_course, load_courses
from app.content.models import Course
from app.deps import get_content_dir, get_session, get_user_id
from app.schemas import (
    CourseDetail,
    CourseSummary,
    LessonRef,
    ModuleDetail,
    ResumePosition,
)
from app.services.progress import CourseProgress, load_course_progress

router = APIRouter(prefix="/api/courses", tags=["courses"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
ContentDep = Annotated[Path, Depends(get_content_dir)]
UserDep = Annotated[str, Depends(get_user_id)]


def get_course_or_404(content_dir: Path, course_id: str) -> Course:
    course_dir = content_dir / course_id
    if not course_dir.is_dir():
        raise HTTPException(status_code=404, detail="Курс не найден")
    try:
        return load_course(course_dir)
    except CourseLoadError as exc:
        raise HTTPException(
            status_code=422, detail=f"Курс содержит ошибки: {exc}"
        ) from exc


def build_resume(course: Course, progress: CourseProgress) -> ResumePosition | None:
    if progress.resume is None:
        return None
    module_id, lesson_id = progress.resume
    for module in course.modules:
        if module.id != module_id:
            continue
        for lesson in module.lessons:
            if lesson.id == lesson_id:
                return ResumePosition(
                    module_id=module_id, lesson_id=lesson_id, lesson_title=lesson.title
                )
    return None


@router.get("", response_model=list[CourseSummary])
async def list_courses(
    session: SessionDep, content_dir: ContentDep, user_id: UserDep
) -> list[CourseSummary]:
    result = load_courses(content_dir)
    summaries: list[CourseSummary] = []

    for course in result.courses:
        progress = await load_course_progress(session, user_id, course)
        summaries.append(
            CourseSummary(
                id=course.id,
                title=course.title,
                description=course.description,
                tags=course.tags,
                level=course.level,
                module_count=len(course.modules),
                lesson_count=course.lesson_count,
                progress_percent=progress.percent,
                status=progress.status,
                resume=build_resume(course, progress),
            )
        )
    return summaries


@router.get("/{course_id}", response_model=CourseDetail)
async def get_course(
    course_id: str, session: SessionDep, content_dir: ContentDep, user_id: UserDep
) -> CourseDetail:
    course = get_course_or_404(content_dir, course_id)
    progress = await load_course_progress(session, user_id, course)

    modules = [
        ModuleDetail(
            id=module.id,
            title=module.title,
            lessons=[
                LessonRef(
                    id=lesson.id,
                    title=lesson.title,
                    completed=(module.id, lesson.id) in progress.completed_lessons,
                )
                for lesson in module.lessons
            ],
            has_quiz=module.quiz is not None,
            quiz_passed=module.id in progress.module_passed,
            quiz_best_score=progress.module_best.get(module.id),
        )
        for module in course.modules
    ]

    return CourseDetail(
        id=course.id,
        title=course.title,
        description=course.description,
        tags=course.tags,
        level=course.level,
        modules=modules,
        has_cheatsheet=course.has_cheatsheet,
        has_glossary=course.has_glossary,
        has_exam=course.exam is not None,
        exam_passed=progress.exam_passed,
        exam_best_score=progress.exam_best,
        progress_percent=progress.percent,
        status=progress.status,
        resume=build_resume(course, progress),
    )
