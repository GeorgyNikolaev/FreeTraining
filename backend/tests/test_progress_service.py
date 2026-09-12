import shutil
from pathlib import Path

from app.content.loader import load_course
from app.models import LastPosition, LessonProgress, QuizAttempt
from app.services.progress import load_course_progress

FIXTURES = Path(__file__).parent / "fixtures"


def demo_course():
    return load_course(FIXTURES / "content" / "demo-course")


async def test_empty_progress(session):
    progress = await load_course_progress(session, "local", demo_course())

    assert progress.total_units == 5
    assert progress.done_units == 0
    assert progress.percent == 0
    assert progress.status == "not_started"
    assert progress.resume is None


async def test_completed_lesson_counts(session):
    session.add(
        LessonProgress(
            user_id="local",
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
        )
    )
    await session.commit()

    progress = await load_course_progress(session, "local", demo_course())

    assert ("01-basics", "01-first-lesson") in progress.completed_lessons
    assert progress.done_units == 1
    assert progress.percent == 20
    assert progress.status == "in_progress"


async def test_best_score_is_kept_and_pass_is_sticky(session):
    session.add_all(
        [
            QuizAttempt(
                user_id="local",
                course_id="demo-course",
                scope="module",
                module_id="01-basics",
                total_questions=2,
                correct_count=2,
                score_percent=100,
                passed=True,
                answers=[],
            ),
            QuizAttempt(
                user_id="local",
                course_id="demo-course",
                scope="module",
                module_id="01-basics",
                total_questions=2,
                correct_count=0,
                score_percent=0,
                passed=False,
                answers=[],
            ),
        ]
    )
    await session.commit()

    progress = await load_course_progress(session, "local", demo_course())

    assert progress.module_best["01-basics"] == 100
    assert "01-basics" in progress.module_passed
    assert progress.done_units == 1


async def test_other_user_progress_is_ignored(session):
    session.add(
        LessonProgress(
            user_id="somebody-else",
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
        )
    )
    await session.commit()

    progress = await load_course_progress(session, "local", demo_course())

    assert progress.done_units == 0


async def test_resume_position_is_returned(session):
    session.add(
        LastPosition(
            user_id="local",
            course_id="demo-course",
            module_id="02-advanced",
            lesson_id="01-third-lesson",
        )
    )
    await session.commit()

    progress = await load_course_progress(session, "local", demo_course())

    assert progress.resume == ("02-advanced", "01-third-lesson")
    assert progress.status == "in_progress"


async def test_fully_completed_course(session):
    course = demo_course()
    for module in course.modules:
        for lesson in module.lessons:
            session.add(
                LessonProgress(
                    user_id="local",
                    course_id="demo-course",
                    module_id=module.id,
                    lesson_id=lesson.id,
                )
            )
    session.add_all(
        [
            QuizAttempt(
                user_id="local",
                course_id="demo-course",
                scope="module",
                module_id="01-basics",
                total_questions=2,
                correct_count=2,
                score_percent=100,
                passed=True,
                answers=[],
            ),
            QuizAttempt(
                user_id="local",
                course_id="demo-course",
                scope="exam",
                module_id=None,
                total_questions=1,
                correct_count=1,
                score_percent=100,
                passed=True,
                answers=[],
            ),
        ]
    )
    await session.commit()

    progress = await load_course_progress(session, "local", course)

    assert progress.exam_best == 100
    assert progress.exam_passed is True
    assert progress.done_units == progress.total_units
    assert progress.percent == 100
    assert progress.status == "completed"


async def test_exam_attempt_is_not_counted_when_exam_was_removed(session, tmp_path):
    course_dir = tmp_path / "demo-course"
    shutil.copytree(FIXTURES / "content" / "demo-course", course_dir)
    (course_dir / "exam.yaml").unlink()
    course = load_course(course_dir)
    assert course.exam is None

    session.add(
        QuizAttempt(
            user_id="local",
            course_id="demo-course",
            scope="exam",
            module_id=None,
            total_questions=1,
            correct_count=1,
            score_percent=100,
            passed=True,
            answers=[],
        )
    )
    await session.commit()

    progress = await load_course_progress(session, "local", course)

    assert progress.exam_passed is True
    assert progress.total_units == course.lesson_count + course.quiz_count
    assert progress.done_units == 0
    assert progress.percent <= 100
    assert progress.status != "completed"


async def test_progress_for_removed_lesson_is_not_counted(session):
    session.add(
        LessonProgress(
            user_id="local",
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="урок-которого-больше-нет",
        )
    )
    await session.commit()

    progress = await load_course_progress(session, "local", demo_course())

    assert progress.done_units == 0
