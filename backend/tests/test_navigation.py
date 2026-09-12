from pathlib import Path

from app.content.loader import load_course
from app.services.navigation import course_steps, neighbours

FIXTURES = Path(__file__).parent / "fixtures"


def demo_course():
    return load_course(FIXTURES / "content" / "demo-course")


def test_course_steps_order():
    steps = course_steps(demo_course())

    assert [(step.kind, step.module_id, step.lesson_id) for step in steps] == [
        ("lesson", "01-basics", "01-first-lesson"),
        ("lesson", "01-basics", "02-second-lesson"),
        ("quiz", "01-basics", None),
        ("lesson", "02-advanced", "01-third-lesson"),
        ("exam", None, None),
    ]


def test_step_titles_are_human_readable():
    steps = course_steps(demo_course())

    assert steps[0].title == "Первый урок"
    assert steps[2].title == "Тест модуля: Основы"
    assert steps[4].title == "Финальный экзамен"


def test_first_lesson_has_no_previous():
    previous, following = neighbours(demo_course(), "01-basics", "01-first-lesson")

    assert previous is None
    assert following is not None
    assert following.lesson_id == "02-second-lesson"


def test_last_lesson_of_module_leads_to_quiz():
    _, following = neighbours(demo_course(), "01-basics", "02-second-lesson")

    assert following is not None
    assert following.kind == "quiz"
    assert following.module_id == "01-basics"


def test_lesson_after_quiz_sees_quiz_as_previous():
    previous, following = neighbours(demo_course(), "02-advanced", "01-third-lesson")

    assert previous is not None
    assert previous.kind == "quiz"
    assert following is not None
    assert following.kind == "exam"


def test_unknown_lesson_has_no_neighbours():
    assert neighbours(demo_course(), "01-basics", "нет-такого") == (None, None)
