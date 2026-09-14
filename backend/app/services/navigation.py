from collections.abc import Callable

from app.content.models import Course
from app.schemas import StepLink


def course_steps(course: Course) -> list[StepLink]:
    """Плоская последовательность прохождения курса.

    Уроки, домашнее задание, тест модуля, следующий модуль, экзамен.
    """
    steps: list[StepLink] = []
    for module in course.modules:
        for lesson in module.lessons:
            steps.append(
                StepLink(
                    kind="lesson",
                    module_id=module.id,
                    lesson_id=lesson.id,
                    title=lesson.title,
                )
            )
        if module.homework is not None:
            steps.append(
                StepLink(
                    kind="homework",
                    module_id=module.id,
                    lesson_id=None,
                    title=f"Домашнее задание: {module.title}",
                )
            )
        if module.quiz is not None:
            steps.append(
                StepLink(
                    kind="quiz",
                    module_id=module.id,
                    lesson_id=None,
                    title=f"Тест модуля: {module.title}",
                )
            )
    if course.exam is not None:
        steps.append(
            StepLink(kind="exam", module_id=None, lesson_id=None, title="Финальный экзамен")
        )
    return steps


def _around(
    course: Course, matches: Callable[[StepLink], bool]
) -> tuple[StepLink | None, StepLink | None]:
    steps = course_steps(course)
    for index, step in enumerate(steps):
        if not matches(step):
            continue
        previous = steps[index - 1] if index > 0 else None
        following = steps[index + 1] if index + 1 < len(steps) else None
        return previous, following
    return None, None


def neighbours(
    course: Course, module_id: str, lesson_id: str
) -> tuple[StepLink | None, StepLink | None]:
    """Возвращает предыдущий и следующий шаг относительно указанного урока."""
    return _around(
        course,
        lambda step: step.kind == "lesson"
        and step.module_id == module_id
        and step.lesson_id == lesson_id,
    )


def homework_neighbours(
    course: Course, module_id: str
) -> tuple[StepLink | None, StepLink | None]:
    """То же для домашнего задания модуля."""
    return _around(
        course, lambda step: step.kind == "homework" and step.module_id == module_id
    )
