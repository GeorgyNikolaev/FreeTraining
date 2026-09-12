from datetime import UTC, datetime

from sqlalchemy import select

from app.models import LastPosition, LessonProgress, QuizAttempt


async def test_lesson_progress_roundtrip(session):
    session.add(
        LessonProgress(
            user_id="local",
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
        )
    )
    await session.commit()

    rows = (await session.execute(select(LessonProgress))).scalars().all()

    assert len(rows) == 1
    assert rows[0].course_id == "demo-course"
    assert rows[0].completed_at.tzinfo is not None


async def test_quiz_attempt_stores_answers_as_json(session):
    session.add(
        QuizAttempt(
            user_id="local",
            course_id="demo-course",
            scope="module",
            module_id="01-basics",
            total_questions=2,
            correct_count=1,
            score_percent=50,
            passed=False,
            answers=[{"question": "Вопрос", "is_correct": False}],
        )
    )
    await session.commit()

    row = (await session.execute(select(QuizAttempt))).scalars().one()

    assert row.answers[0]["question"] == "Вопрос"
    assert row.passed is False


async def test_last_position_is_unique_per_course(session):
    session.add(
        LastPosition(
            user_id="local",
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
            updated_at=datetime.now(UTC),
        )
    )
    await session.commit()

    row = (await session.execute(select(LastPosition))).scalars().one()
    row.lesson_id = "02-second-lesson"
    await session.commit()

    rows = (await session.execute(select(LastPosition))).scalars().all()

    assert len(rows) == 1
    assert rows[0].lesson_id == "02-second-lesson"
