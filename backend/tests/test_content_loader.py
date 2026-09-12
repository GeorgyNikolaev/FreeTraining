from pathlib import Path

import pytest

from app.content.loader import (
    ContentError,
    CourseLoadError,
    load_course,
    load_courses,
    read_lesson_text,
    read_page_text,
)
from app.content.markdown import extract_title, humanize

FIXTURES = Path(__file__).parent / "fixtures"
CONTENT = FIXTURES / "content"
BROKEN = FIXTURES / "broken"


def test_extract_title_takes_first_heading():
    assert extract_title("# Заголовок\n\nТекст") == "Заголовок"


def test_extract_title_ignores_second_level_heading():
    assert extract_title("## Подзаголовок\n\nТекст") is None


def test_extract_title_ignores_heading_inside_code_block():
    text = "```python\n# это комментарий\n```\n"
    assert extract_title(text) is None


def test_extract_title_found_after_code_block():
    text = "```python\n# это комментарий\n```\n\n# Заголовок\n\nТекст"
    assert extract_title(text) == "Заголовок"


def test_humanize_strips_numeric_prefix():
    assert humanize("01-what-is-python") == "What is python"


def test_load_course_reads_metadata():
    course = load_course(CONTENT / "demo-course")

    assert course.id == "demo-course"
    assert course.title == "Демонстрационный курс"
    assert course.tags == ["demo", "test"]
    assert course.level == "beginner"


def test_load_course_orders_modules_and_lessons_by_prefix():
    course = load_course(CONTENT / "demo-course")

    assert [module.id for module in course.modules] == ["01-basics", "02-advanced"]
    assert [lesson.id for lesson in course.modules[0].lessons] == [
        "01-first-lesson",
        "02-second-lesson",
    ]


def test_lesson_title_comes_from_markdown_heading():
    course = load_course(CONTENT / "demo-course")

    assert course.modules[0].lessons[0].title == "Первый урок"
    assert course.modules[1].title == "Продолжение"


def test_load_course_detects_optional_files():
    course = load_course(CONTENT / "demo-course")

    assert course.has_cheatsheet is True
    assert course.has_glossary is False
    assert course.exam is not None
    assert course.exam.pass_score == 80
    assert course.modules[0].quiz is not None
    assert course.modules[1].quiz is None


def test_load_course_counts():
    course = load_course(CONTENT / "demo-course")

    assert course.lesson_count == 3
    assert course.quiz_count == 1


def test_broken_quiz_raises_with_readable_message():
    with pytest.raises(CourseLoadError) as error:
        load_course(BROKEN / "broken-course")

    errors = error.value.errors
    assert len(errors) == 1
    assert errors[0].course_id == "broken-course"
    assert errors[0].location == "01-module/quiz.yaml"
    assert 'отсутствует среди вариантов' in errors[0].message


def test_load_courses_skips_broken_and_reports_it():
    result = load_courses(BROKEN)

    assert result.courses == []
    assert len(result.errors) == 1
    assert result.errors[0].course_id == "broken-course"


def test_load_courses_returns_valid_courses():
    result = load_courses(CONTENT)

    assert [course.id for course in result.courses] == ["demo-course"]
    assert result.errors == []


def test_read_lesson_text():
    course = load_course(CONTENT / "demo-course")

    text = read_lesson_text(course, "01-basics", "01-first-lesson")

    assert text is not None
    assert "Текст первого урока" in text


def test_read_lesson_text_returns_none_for_unknown_lesson():
    course = load_course(CONTENT / "demo-course")

    assert read_lesson_text(course, "01-basics", "нет-такого") is None


def test_read_page_text():
    course = load_course(CONTENT / "demo-course")

    assert "Краткая выжимка" in (read_page_text(course, "cheatsheet") or "")
    assert read_page_text(course, "glossary") is None


def test_load_course_missing_course_yaml_is_reported(tmp_path):
    course_dir = tmp_path / "no-metadata"
    course_dir.mkdir()

    with pytest.raises(CourseLoadError) as error:
        load_course(course_dir)

    errors = error.value.errors
    assert len(errors) == 1
    assert errors[0].location == "course.yaml"
    assert errors[0].message == "файл не найден"


def test_load_course_missing_module_yaml_is_reported(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text("title: Курс\n", encoding="utf-8")
    module_dir = course_dir / "01-module"
    module_dir.mkdir()
    (module_dir / "01-lesson.md").write_text("# Урок\n\nТекст.\n", encoding="utf-8")

    with pytest.raises(CourseLoadError) as error:
        load_course(course_dir)

    errors = error.value.errors
    assert len(errors) == 1
    assert errors[0].location == "01-module/module.yaml"
    assert errors[0].message == "файл не найден"


def test_load_course_rejects_broken_yaml_syntax(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text("title: [не закрыт\n", encoding="utf-8")

    with pytest.raises(CourseLoadError) as error:
        load_course(course_dir)

    errors = error.value.errors
    assert len(errors) == 1
    assert errors[0].location == "course.yaml"
    assert errors[0].message.startswith("некорректный YAML")


def test_load_course_rejects_quiz_that_is_not_a_mapping(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text("title: Курс\n", encoding="utf-8")
    module_dir = course_dir / "01-module"
    module_dir.mkdir()
    (module_dir / "module.yaml").write_text("title: Модуль\n", encoding="utf-8")
    (module_dir / "01-lesson.md").write_text("# Урок\n\nТекст.\n", encoding="utf-8")
    (module_dir / "quiz.yaml").write_text("- просто список\n", encoding="utf-8")

    with pytest.raises(CourseLoadError) as error:
        load_course(course_dir)

    errors = error.value.errors
    assert len(errors) == 1
    assert errors[0].location == "01-module/quiz.yaml"
    assert errors[0].message == "ожидался набор полей вида ключ: значение"


def test_load_course_rejects_module_without_lessons(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text("title: Курс\n", encoding="utf-8")
    module_dir = course_dir / "01-module"
    module_dir.mkdir()
    (module_dir / "module.yaml").write_text("title: Модуль\n", encoding="utf-8")

    with pytest.raises(CourseLoadError) as error:
        load_course(course_dir)

    errors = error.value.errors
    assert len(errors) == 1
    assert errors[0].location == "01-module"
    assert errors[0].message == "в модуле нет ни одного урока"


def test_load_course_rejects_invalid_level(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text(
        "title: Курс\nlevel: невозможный\n", encoding="utf-8"
    )
    module_dir = course_dir / "01-module"
    module_dir.mkdir()
    (module_dir / "module.yaml").write_text("title: Модуль\n", encoding="utf-8")
    (module_dir / "01-lesson.md").write_text("# Урок\n\nТекст.\n", encoding="utf-8")

    with pytest.raises(CourseLoadError) as error:
        load_course(course_dir)

    errors = error.value.errors
    assert len(errors) == 1
    assert errors[0].location == "course.yaml"
    assert "недопустимое значение" in errors[0].message


def test_lesson_without_heading_gets_a_warning(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text("title: Курс\n", encoding="utf-8")
    module_dir = course_dir / "01-module"
    module_dir.mkdir()
    (module_dir / "module.yaml").write_text("title: Модуль\n", encoding="utf-8")
    (module_dir / "01-lesson.md").write_text("Текст без заголовка.\n", encoding="utf-8")

    warnings: list[ContentError] = []
    course = load_course(course_dir, warnings)

    assert course.modules[0].lessons[0].title == "Lesson"
    assert len(warnings) == 1
    assert warnings[0].location == "01-module/01-lesson.md"
    assert warnings[0].message == "нет заголовка первого уровня, название взято из имени файла"


def test_load_courses_collects_warnings_without_dropping_course(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text("title: Курс\n", encoding="utf-8")
    module_dir = course_dir / "01-module"
    module_dir.mkdir()
    (module_dir / "module.yaml").write_text("title: Модуль\n", encoding="utf-8")
    (module_dir / "01-lesson.md").write_text("Текст без заголовка.\n", encoding="utf-8")

    result = load_courses(tmp_path)

    assert [course.id for course in result.courses] == ["course"]
    assert result.errors == []
    assert len(result.warnings) == 1
    assert result.warnings[0].course_id == "course"


def test_non_module_subdirectory_is_ignored(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text("title: Курс\n", encoding="utf-8")
    module_dir = course_dir / "01-module"
    module_dir.mkdir()
    (module_dir / "module.yaml").write_text("title: Модуль\n", encoding="utf-8")
    (module_dir / "01-lesson.md").write_text("# Урок\n\nТекст.\n", encoding="utf-8")

    images_dir = course_dir / "images"
    images_dir.mkdir()
    (images_dir / "picture.png").write_bytes(b"\x89PNG")

    course = load_course(course_dir)

    assert [module.id for module in course.modules] == ["01-module"]


def test_subdirectory_with_markdown_but_no_module_yaml_still_errors(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text("title: Курс\n", encoding="utf-8")
    stray_dir = course_dir / "stray"
    stray_dir.mkdir()
    (stray_dir / "notes.md").write_text("# Заметки\n", encoding="utf-8")

    with pytest.raises(CourseLoadError) as error:
        load_course(course_dir)

    errors = error.value.errors
    assert len(errors) == 1
    assert errors[0].location == "stray/module.yaml"
    assert errors[0].message == "файл не найден"


def test_load_course_rejects_pass_score_above_hundred(tmp_path):
    course_dir = tmp_path / "course"
    course_dir.mkdir()
    (course_dir / "course.yaml").write_text("title: Курс\n", encoding="utf-8")
    module_dir = course_dir / "01-module"
    module_dir.mkdir()
    (module_dir / "module.yaml").write_text("title: Модуль\n", encoding="utf-8")
    (module_dir / "01-lesson.md").write_text("# Урок\n\nТекст.\n", encoding="utf-8")
    (module_dir / "quiz.yaml").write_text(
        'pass_score: 120\n'
        'questions:\n'
        '  - question: Вопрос\n'
        '    options: ["a", "b"]\n'
        '    answer: "a"\n',
        encoding="utf-8",
    )

    with pytest.raises(CourseLoadError) as error:
        load_course(course_dir)

    errors = error.value.errors
    assert len(errors) == 1
    assert errors[0].location == "01-module/quiz.yaml"
    assert "значение должно быть не больше 100" in errors[0].message
