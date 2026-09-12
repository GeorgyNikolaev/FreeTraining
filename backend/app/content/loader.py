from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from pydantic import ValidationError

from app.content.markdown import extract_title, humanize
from app.content.models import Course, Lesson, Module, Quiz

PAGES = {"cheatsheet": "cheatsheet.md", "glossary": "glossary.md"}


@dataclass
class ContentError:
    course_id: str
    location: str
    message: str


@dataclass
class LoadResult:
    courses: list[Course] = field(default_factory=list)
    errors: list[ContentError] = field(default_factory=list)


class CourseLoadError(Exception):
    def __init__(self, errors: list[ContentError]) -> None:
        self.errors = errors
        super().__init__("; ".join(error.message for error in errors))


def _translate(item: dict[str, Any]) -> str:
    error_type = item["type"]
    ctx = item.get("ctx") or {}

    if error_type == "literal_error":
        expected = ctx.get("expected")
        if not expected:
            return "недопустимое значение"
        options = str(expected).replace("'", "").replace(" or ", ", ")
        return f"недопустимое значение, ожидается одно из: {options}"
    if error_type == "less_than_equal":
        return f"значение должно быть не больше {ctx['le']}"
    if error_type == "greater_than_equal":
        return f"значение должно быть не меньше {ctx['ge']}"
    if error_type == "too_short":
        return f"нужно не меньше {ctx['min_length']} элементов"
    if error_type == "missing":
        return "поле не заполнено"
    return item["msg"].removeprefix("Value error, ")


def _describe(error: ValidationError) -> str:
    parts = []
    for item in error.errors():
        location = ".".join(str(piece) for piece in item["loc"]) or "файл"
        message = _translate(item)
        parts.append(f"{location}: {message}")
    return "; ".join(parts)


def _read_yaml(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        data = yaml.safe_load(handle)
    if data is None:
        return {}
    if not isinstance(data, dict):
        raise ValueError("ожидался набор полей вида ключ: значение")
    return data


def _load_quiz(
    path: Path, course_id: str, location: str, errors: list[ContentError]
) -> Quiz | None:
    if not path.exists():
        return None
    try:
        return Quiz.model_validate(_read_yaml(path))
    except yaml.YAMLError as exc:
        errors.append(ContentError(course_id, location, f"некорректный YAML: {exc}"))
    except ValidationError as exc:
        errors.append(ContentError(course_id, location, _describe(exc)))
    except ValueError as exc:
        errors.append(ContentError(course_id, location, str(exc)))
    return None


def _load_module(
    module_dir: Path, course_id: str, errors: list[ContentError]
) -> Module | None:
    module_file = module_dir / "module.yaml"
    if not module_file.exists():
        errors.append(
            ContentError(course_id, f"{module_dir.name}/module.yaml", "файл не найден")
        )
        return None

    try:
        meta = _read_yaml(module_file)
    except (yaml.YAMLError, ValueError) as exc:
        errors.append(ContentError(course_id, f"{module_dir.name}/module.yaml", str(exc)))
        return None

    title = str(meta.get("title") or humanize(module_dir.name))

    lessons: list[Lesson] = []
    for lesson_file in sorted(module_dir.glob("*.md")):
        text = lesson_file.read_text(encoding="utf-8")
        lesson_title = extract_title(text) or humanize(lesson_file.stem)
        lessons.append(Lesson(id=lesson_file.stem, title=lesson_title, path=lesson_file))

    if not lessons:
        errors.append(
            ContentError(course_id, module_dir.name, "в модуле нет ни одного урока")
        )
        return None

    quiz = _load_quiz(
        module_dir / "quiz.yaml", course_id, f"{module_dir.name}/quiz.yaml", errors
    )
    return Module(id=module_dir.name, title=title, lessons=lessons, quiz=quiz)


def load_course(course_dir: Path) -> Course:
    """Читает курс из папки. Бросает CourseLoadError со списком понятных ошибок."""
    course_id = course_dir.name
    errors: list[ContentError] = []

    course_file = course_dir / "course.yaml"
    if not course_file.exists():
        raise CourseLoadError([ContentError(course_id, "course.yaml", "файл не найден")])

    try:
        meta = _read_yaml(course_file)
    except yaml.YAMLError as exc:
        raise CourseLoadError(
            [ContentError(course_id, "course.yaml", f"некорректный YAML: {exc}")]
        ) from exc
    except ValueError as exc:
        raise CourseLoadError([ContentError(course_id, "course.yaml", str(exc))]) from exc

    if not meta.get("title"):
        errors.append(ContentError(course_id, "course.yaml", "не заполнено поле title"))

    modules: list[Module] = []
    course_subdirs = sorted(
        p for p in course_dir.iterdir() if p.is_dir() and not p.name.startswith(".")
    )
    for module_dir in course_subdirs:
        module = _load_module(module_dir, course_id, errors)
        if module is not None:
            modules.append(module)

    if not modules and not errors:
        errors.append(ContentError(course_id, ".", "в курсе нет ни одного модуля"))

    exam = _load_quiz(course_dir / "exam.yaml", course_id, "exam.yaml", errors)

    if errors:
        raise CourseLoadError(errors)

    try:
        return Course(
            id=course_id,
            dir=course_dir,
            title=str(meta.get("title")),
            description=str(meta.get("description") or ""),
            tags=[str(tag) for tag in (meta.get("tags") or [])],
            level=meta.get("level") or "beginner",
            modules=modules,
            has_cheatsheet=(course_dir / PAGES["cheatsheet"]).exists(),
            has_glossary=(course_dir / PAGES["glossary"]).exists(),
            exam=exam,
        )
    except ValidationError as exc:
        raise CourseLoadError(
            [ContentError(course_id, "course.yaml", _describe(exc))]
        ) from exc


def load_courses(content_dir: Path) -> LoadResult:
    """Читает все курсы каталога.

    Сломанные курсы не попадают в результат, а их ошибки собираются.
    """
    result = LoadResult()
    if not content_dir.exists():
        return result

    content_subdirs = sorted(
        p for p in content_dir.iterdir() if p.is_dir() and not p.name.startswith(".")
    )
    for course_dir in content_subdirs:
        try:
            result.courses.append(load_course(course_dir))
        except CourseLoadError as exc:
            result.errors.extend(exc.errors)
    return result


def read_lesson_text(course: Course, module_id: str, lesson_id: str) -> str | None:
    for module in course.modules:
        if module.id != module_id:
            continue
        for lesson in module.lessons:
            if lesson.id == lesson_id:
                return lesson.path.read_text(encoding="utf-8")
    return None


def read_page_text(course: Course, page: str) -> str | None:
    filename = PAGES.get(page)
    if filename is None:
        return None
    path = course.dir / filename
    return path.read_text(encoding="utf-8") if path.exists() else None
