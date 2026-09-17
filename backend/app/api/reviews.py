from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.courses import get_course_or_404
from app.deps import get_content_dir, get_session, get_user_id
from app.models import CourseReview, utcnow
from app.schemas import CourseReviews, MyReview, ReviewInput, ReviewOut
from app.services.progress import load_course_progress
from app.services.reviews import count_completed_modules, load_rating_stats, modules_required

router = APIRouter(prefix="/api/courses/{course_id}/reviews", tags=["reviews"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
ContentDep = Annotated[Path, Depends(get_content_dir)]
UserDep = Annotated[str, Depends(get_user_id)]


def to_review_out(review: CourseReview, user_id: str, author_progress: int) -> ReviewOut:
    return ReviewOut(
        id=review.id or 0,
        course_id=review.course_id,
        rating=review.rating,
        text=review.text,
        is_mine=review.user_id == user_id,
        author_progress_percent=author_progress,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.get("", response_model=CourseReviews)
async def get_reviews(
    course_id: str, session: SessionDep, content_dir: ContentDep, user_id: UserDep
) -> CourseReviews:
    course = get_course_or_404(content_dir, course_id)
    progress = await load_course_progress(session, user_id, course)
    stats = (await load_rating_stats(session, [course_id])).get(course_id)
    rows = (
        (
            await session.execute(
                select(CourseReview)
                .where(CourseReview.course_id == course_id)
                .order_by(CourseReview.updated_at.desc(), CourseReview.id.desc())
            )
        )
        .scalars()
        .all()
    )
    percents = {user_id: progress.percent}
    for row in rows:
        if row.user_id not in percents:
            author = await load_course_progress(session, row.user_id, course)
            percents[row.user_id] = author.percent
    reviews = [to_review_out(row, user_id, percents[row.user_id]) for row in rows]
    mine = next((review for review in reviews if review.is_mine), None)
    required = modules_required(course)
    completed = count_completed_modules(course, progress)

    return CourseReviews(
        course_id=course_id,
        rating_average=stats.average if stats else None,
        rating_count=stats.count if stats else 0,
        can_review=completed >= required,
        modules_required=required,
        modules_completed=completed,
        my_review=MyReview.model_validate(mine.model_dump()) if mine else None,
        reviews=reviews,
    )


@router.put("/me", response_model=ReviewOut)
async def save_review(
    course_id: str,
    payload: ReviewInput,
    session: SessionDep,
    content_dir: ContentDep,
    user_id: UserDep,
) -> ReviewOut:
    course = get_course_or_404(content_dir, course_id)
    progress = await load_course_progress(session, user_id, course)
    required = modules_required(course)
    if count_completed_modules(course, progress) < required:
        raise HTTPException(
            status_code=403,
            detail=f"Отзыв можно оставить после прохождения {required} модулей",
        )

    review = (
        await session.execute(
            select(CourseReview).where(
                CourseReview.user_id == user_id, CourseReview.course_id == course_id
            )
        )
    ).scalar_one_or_none()

    if review is None:
        review = CourseReview(
            user_id=user_id, course_id=course_id, rating=payload.rating, text=payload.text
        )
        session.add(review)
    else:
        review.rating = payload.rating
        review.text = payload.text
        review.updated_at = utcnow()

    await session.commit()
    await session.refresh(review)
    return to_review_out(review, user_id, progress.percent)


@router.delete("/me", response_model=dict[str, str])
async def delete_review(
    course_id: str, session: SessionDep, content_dir: ContentDep, user_id: UserDep
) -> dict[str, str]:
    get_course_or_404(content_dir, course_id)
    result = await session.execute(
        delete(CourseReview).where(
            CourseReview.user_id == user_id, CourseReview.course_id == course_id
        )
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Отзыв не найден")
    await session.commit()
    return {"status": "ok"}
