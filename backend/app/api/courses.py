from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.loader import (
    CourseLoadError,
    load_course,
    load_courses,
    read_homework_text,
    read_lesson_text,
    read_page_text,
)
from app.content.markdown import extract_title
from app.content.models import Course
from app.deps import get_content_dir, get_session, get_user_id
from app.schemas import (
    CourseDetail,
    CourseSummary,
    HomeworkDetail,
    LessonDetail,
    LessonRef,
    ModuleDetail,
    PageDetail,
    ResumePosition,
)
from app.services.navigation import homework_neighbours, neighbours
from app.services.progress import CourseProgress, load_course_progress
from app.services.reviews import RatingStats, load_rating_stats

router = APIRouter(prefix="/api/courses", tags=["courses"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
ContentDep = Annotated[Path, Depends(get_content_dir)]
UserDep = Annotated[str, Depends(get_user_id)]


def get_course_or_404(content_dir: Path, course_id: str) -> Course:
    if not course_id or course_id in {".", ".."} or "/" in course_id or "\\" in course_id:
        raise HTTPException(status_code=404, detail="Курс не найден")
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
    ratings = await load_rating_stats(session, [course.id for course in result.courses])
    summaries: list[CourseSummary] = []

    for course in result.courses:
        progress = await load_course_progress(session, user_id, course)
        rating = ratings.get(course.id, RatingStats())
        summaries.append(
            CourseSummary(
                id=course.id,
                title=course.title,
                description=course.description,
                tags=course.tags,
                level=course.level,
                prerequisites=course.prerequisites,
                module_count=len(course.modules),
                lesson_count=course.lesson_count,
                progress_percent=progress.percent,
                status=progress.status,
                rating_average=rating.average,
                rating_count=rating.count,
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
    rating = (await load_rating_stats(session, [course.id])).get(course.id, RatingStats())

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
            has_homework=module.homework is not None,
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
        prerequisites=course.prerequisites,
        modules=modules,
        has_cheatsheet=course.has_cheatsheet,
        has_glossary=course.has_glossary,
        has_exam=course.exam is not None,
        exam_passed=progress.exam_passed,
        exam_best_score=progress.exam_best,
        progress_percent=progress.percent,
        status=progress.status,
        rating_average=rating.average,
        rating_count=rating.count,
        resume=build_resume(course, progress),
    )


@router.get("/{course_id}/lessons/{module_id}/{lesson_id}", response_model=LessonDetail)
async def get_lesson(
    course_id: str,
    module_id: str,
    lesson_id: str,
    session: SessionDep,
    content_dir: ContentDep,
    user_id: UserDep,
) -> LessonDetail:
    course = get_course_or_404(content_dir, course_id)
    text = read_lesson_text(course, module_id, lesson_id)
    if text is None:
        raise HTTPException(status_code=404, detail="Урок не найден")

    title = next(
        lesson.title
        for module in course.modules
        if module.id == module_id
        for lesson in module.lessons
        if lesson.id == lesson_id
    )
    progress = await load_course_progress(session, user_id, course)
    previous, following = neighbours(course, module_id, lesson_id)

    return LessonDetail(
        course_id=course.id,
        module_id=module_id,
        lesson_id=lesson_id,
        title=title,
        content=text,
        completed=(module_id, lesson_id) in progress.completed_lessons,
        prev=previous,
        next=following,
    )


@router.get("/{course_id}/homework/{module_id}", response_model=HomeworkDetail)
async def get_homework(
    course_id: str, module_id: str, content_dir: ContentDep
) -> HomeworkDetail:
    course = get_course_or_404(content_dir, course_id)
    text = read_homework_text(course, module_id)
    if text is None:
        raise HTTPException(status_code=404, detail="Домашнее задание не найдено")

    module_title = next(
        module.title for module in course.modules if module.id == module_id
    )
    previous, following = homework_neighbours(course, module_id)

    return HomeworkDetail(
        course_id=course.id,
        module_id=module_id,
        module_title=module_title,
        title=extract_title(text) or "Домашнее задание",
        content=text,
        prev=previous,
        next=following,
    )


@router.get("/{course_id}/pages/{page}", response_model=PageDetail)
async def get_page(course_id: str, page: str, content_dir: ContentDep) -> PageDetail:
    course = get_course_or_404(content_dir, course_id)
    text = read_page_text(course, page)
    if text is None:
        raise HTTPException(status_code=404, detail="Страница не найдена")

    titles = {"cheatsheet": "Шпаргалка", "glossary": "Термины"}
    return PageDetail(
        course_id=course.id,
        page=page,
        title=extract_title(text) or titles.get(page, page),
        content=text,
    )
