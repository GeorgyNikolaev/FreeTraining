# FreeTraining v1.0 — бэкенд. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить серверную часть платформы: чтение курсов с диска с понятной проверкой ошибок, хранение прогресса и результатов тестов в PostgreSQL, проверка тестов на сервере и HTTP API для будущего фронтенда.

**Architecture:** Содержимое курсов — папки на диске, читаются при каждом запросе моделями pydantic; ничего из содержимого в базу не попадает. В базе только порождённые пользователем данные: пройденные уроки, попытки тестов и место остановки, связанные с содержимым строковыми идентификаторами без внешних ключей. Правильные ответы не покидают сервер: выдача вопросов и проверка попытки — разные операции. Весь ввод-вывод асинхронный: FastAPI, SQLAlchemy в асинхронном режиме, драйвер asyncpg.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, SQLModel поверх SQLAlchemy 2 (async), asyncpg, PostgreSQL 17 в Docker, PyYAML, pytest + pytest-asyncio + httpx, uv как менеджер зависимостей, ruff как линтер.

**Spec:** `docs/superpowers/specs/2026-09-12-freetraining-v1-design.md`

## Global Constraints

- Python 3.12 и выше. Менеджер зависимостей — `uv`; все команды запускаются из каталога `backend/`.
- База данных PostgreSQL 17 в Docker, порт хоста **5433** (чтобы не конфликтовать с локально установленным PostgreSQL). Пользователь, пароль и база — `freetraining`. Тестовая база — `freetraining_test` на том же сервере.
- Alembic не подключается. Таблицы создаются вызовом `create_all` при старте приложения.
- Ровно три таблицы: `lesson_progress`, `quiz_attempt`, `last_position`. Внешних ключей на содержимое нет, связь только строковыми идентификаторами.
- Все отметки времени — `datetime` с часовым поясом, хранятся в UTC, колонки типа `TIMESTAMP WITH TIME ZONE`.
- `user_id` в версии 1.0 всегда равен строке `local` и берётся из настроек, а не из запроса.
- Каталог содержимого — `content/` в корне репозитория; в тестах подменяется на `backend/tests/fixtures/content`.
- Все сообщения об ошибках содержимого — на русском языке, с указанием курса, файла и места.
- Правильные ответы не включаются ни в один ответ API до отправки попытки.
- Тесты содержимого читаются и проверяются при каждом запросе, без кеширования.
- Префикс всех маршрутов — `/api`.
- Стиль сообщений коммитов: `тип: описание на русском`, типы `feat`, `test`, `chore`, `docs`, `fix`.

## Структура файлов

```
docker-compose.yml              PostgreSQL для разработки и тестов
db/init.sql                     создание тестовой базы при первом запуске
backend/
  pyproject.toml                зависимости, настройки pytest и ruff
  .env.example                  образец настроек
  app/
    __init__.py
    config.py                   настройки из переменных окружения
    db.py                       асинхронный движок, фабрика сессий, создание таблиц
    deps.py                     зависимости FastAPI: сессия, каталог содержимого, пользователь
    models.py                   три таблицы SQLModel
    schemas.py                  модели запросов и ответов API
    main.py                     приложение, CORS, подключение маршрутов, старт
    content/
      __init__.py
      models.py                 pydantic-модели курса, модуля, урока, теста
      markdown.py               извлечение заголовка урока, человекочитаемое имя
      loader.py                 чтение папок курсов, сбор ошибок, чтение файлов
    services/
      __init__.py
      grading.py                проверка ответов и подсчёт результата
      progress.py               расчёт прогресса курса по данным базы
      navigation.py             последовательность шагов курса, предыдущий и следующий
    api/
      __init__.py
      courses.py                каталог, курс, урок, страницы
      quizzes.py                выдача вопросов и приём попытки
      progress.py               запись прогресса, история, сброс, выгрузка
      health.py                 ошибки разбора содержимого
  tests/
    __init__.py
    conftest.py                 общие фикстуры: база, клиент, каталог содержимого
    fixtures/content/           образцовые курсы для тестов
    fixtures/broken/            курс с намеренной ошибкой
    test_content_models.py
    test_content_loader.py
    test_grading.py
    test_navigation.py
    test_progress_service.py
    test_api_courses.py
    test_api_lessons.py
    test_api_quizzes.py
    test_api_progress.py
    test_api_health.py
content/                        настоящие курсы
```

Разделение по ответственности, а не по слою: всё, что знает про формат курса на диске, живёт в `app/content/`; всё, что считает — в `app/services/`; всё, что отвечает по HTTP — в `app/api/`. Обработчики маршрутов не содержат вычислений, а сервисы ничего не знают про HTTP.

---

### Task 1: Скелет проекта, база в Docker и работающее приложение

**Files:**
- Create: `docker-compose.yml`
- Create: `db/init.sql`
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/main.py`
- Create: `backend/tests/__init__.py`
- Test: `backend/tests/test_smoke.py`

**Interfaces:**
- Consumes: ничего, это первая задача.
- Produces: `app.config.settings` с полями `database_url: str`, `test_database_url: str`, `content_dir: Path`, `user_id: str`, `cors_origins: list[str]`; объект приложения `app.main.app`.

- [ ] **Step 1: Создать файл Docker Compose с PostgreSQL**

Создать `docker-compose.yml` в корне репозитория:

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: freetraining-db
    environment:
      POSTGRES_USER: freetraining
      POSTGRES_PASSWORD: freetraining
      POSTGRES_DB: freetraining
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U freetraining"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  pgdata:
```

Создать `db/init.sql`:

```sql
CREATE DATABASE freetraining_test OWNER freetraining;
```

- [ ] **Step 2: Поднять базу и убедиться, что она отвечает**

Выполнить из корня репозитория:

```bash
docker compose up -d && sleep 5 && docker compose exec -T db psql -U freetraining -lqt
```

Ожидается: в списке присутствуют базы `freetraining` и `freetraining_test`.

- [ ] **Step 3: Создать проект бэкенда и установить зависимости**

Создать `backend/pyproject.toml`:

```toml
[project]
name = "freetraining-backend"
version = "0.1.0"
description = "FreeTraining backend"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.32",
    "sqlmodel>=0.0.22",
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30",
    "pydantic-settings>=2.6",
    "pyyaml>=6.0",
]

[dependency-groups]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.24",
    "httpx>=0.28",
    "ruff>=0.8",
]

[tool.uv]
package = false

[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"
testpaths = ["tests"]
pythonpath = ["."]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]
```

Создать `backend/.env.example`:

```
DATABASE_URL=postgresql+asyncpg://freetraining:freetraining@localhost:5433/freetraining
TEST_DATABASE_URL=postgresql+asyncpg://freetraining:freetraining@localhost:5433/freetraining_test
USER_ID=local
```

Выполнить из `backend/`:

```bash
uv sync
```

- [ ] **Step 4: Написать падающий тест**

Создать пустой `backend/app/__init__.py` и пустой `backend/tests/__init__.py`.

Создать `backend/tests/test_smoke.py`:

```python
import httpx
from httpx import ASGITransport

from app.main import app


async def test_ping_returns_ok():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/ping")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 5: Запустить тест и убедиться, что он падает**

Выполнить из `backend/`:

```bash
uv run pytest tests/test_smoke.py -v
```

Ожидается: ошибка импорта `ModuleNotFoundError: No module named 'app.main'`.

- [ ] **Step 6: Реализовать настройки и приложение**

Создать `backend/app/config.py`:

```python
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql+asyncpg://freetraining:freetraining@localhost:5433/freetraining"
    )
    test_database_url: str = (
        "postgresql+asyncpg://freetraining:freetraining@localhost:5433/freetraining_test"
    )
    content_dir: Path = REPO_ROOT / "content"
    user_id: str = "local"
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
```

Создать `backend/app/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

app = FastAPI(title="FreeTraining API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 7: Запустить тест и убедиться, что он проходит**

```bash
uv run pytest tests/test_smoke.py -v
```

Ожидается: PASSED.

- [ ] **Step 8: Проверить запуск сервера вручную**

```bash
cd backend && uv run uvicorn app.main:app --reload --port 8000
```

Ожидается: сервер стартует, страница `http://localhost:8000/docs` открывается и показывает маршрут `/api/ping`. Остановить сервер.

- [ ] **Step 9: Коммит**

```bash
git add docker-compose.yml db/init.sql backend/pyproject.toml backend/uv.lock backend/.env.example backend/app backend/tests
git commit -m "feat: скелет бэкенда, приложение FastAPI и база в Docker"
```

---

### Task 2: Модели содержимого курса и проверка вопросов

**Files:**
- Create: `backend/app/content/__init__.py`
- Create: `backend/app/content/models.py`
- Test: `backend/tests/test_content_models.py`

**Interfaces:**
- Consumes: ничего из предыдущих задач.
- Produces: классы `Question`, `Quiz`, `Lesson`, `Module`, `Course` в `app.content.models`.
  - `Question(question: str, options: list[str], answer: str | list[str], explanation: str = "")`, свойства `correct_answers -> list[str]` и `multiple -> bool`.
  - `Quiz(pass_score: int = 70, questions: list[Question])`.
  - `Lesson(id: str, title: str, path: Path)`.
  - `Module(id: str, title: str, lessons: list[Lesson], quiz: Quiz | None = None)`.
  - `Course(id: str, dir: Path, title: str, description: str, tags: list[str], level: str, modules: list[Module], has_cheatsheet: bool, has_glossary: bool, exam: Quiz | None)`, свойства `lesson_count -> int`, `quiz_count -> int`.

- [ ] **Step 1: Написать падающие тесты**

Создать пустой `backend/app/content/__init__.py`.

Создать `backend/tests/test_content_models.py`:

```python
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.content.models import Course, Lesson, Module, Question, Quiz


def test_single_answer_question():
    question = Question(question="Сколько будет 2+2?", options=["3", "4"], answer="4")

    assert question.multiple is False
    assert question.correct_answers == ["4"]


def test_multiple_answer_question():
    question = Question(
        question="Какие типы изменяемые?",
        options=["list", "tuple", "dict"],
        answer=["list", "dict"],
    )

    assert question.multiple is True
    assert question.correct_answers == ["list", "dict"]


def test_answer_outside_options_is_rejected():
    with pytest.raises(ValidationError) as error:
        Question(question="Сколько будет 2+2?", options=["3", "4"], answer="5")

    assert 'ответ "5" отсутствует среди вариантов' in str(error.value)


def test_duplicate_options_are_rejected():
    with pytest.raises(ValidationError) as error:
        Question(question="Выбери число", options=["4", "4"], answer="4")

    assert "варианты ответа повторяются" in str(error.value)


def test_question_requires_at_least_two_options():
    with pytest.raises(ValidationError):
        Question(question="Выбери число", options=["4"], answer="4")


def test_pass_score_above_hundred_is_rejected():
    question = Question(question="Сколько будет 2+2?", options=["3", "4"], answer="4")

    with pytest.raises(ValidationError):
        Quiz(pass_score=120, questions=[question])


def test_quiz_requires_at_least_one_question():
    with pytest.raises(ValidationError):
        Quiz(pass_score=70, questions=[])


def test_course_counts_lessons_and_quizzes():
    question = Question(question="Сколько будет 2+2?", options=["3", "4"], answer="4")
    quiz = Quiz(questions=[question])
    lesson = Lesson(id="01-intro", title="Введение", path=Path("01-intro.md"))
    modules = [
        Module(id="01-a", title="Первый", lessons=[lesson, lesson], quiz=quiz),
        Module(id="02-b", title="Второй", lessons=[lesson], quiz=None),
    ]
    course = Course(id="demo", dir=Path("demo"), title="Демо", modules=modules)

    assert course.lesson_count == 3
    assert course.quiz_count == 1
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_content_models.py -v
```

Ожидается: `ModuleNotFoundError: No module named 'app.content.models'`.

- [ ] **Step 3: Реализовать модели**

Создать `backend/app/content/models.py`:

```python
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, model_validator

Level = Literal["beginner", "intermediate", "advanced"]


class Question(BaseModel):
    question: str
    options: list[str] = Field(min_length=2)
    answer: str | list[str]
    explanation: str = ""

    @property
    def correct_answers(self) -> list[str]:
        return list(self.answer) if isinstance(self.answer, list) else [self.answer]

    @property
    def multiple(self) -> bool:
        return isinstance(self.answer, list)

    @model_validator(mode="after")
    def check_answers_match_options(self) -> "Question":
        if len(set(self.options)) != len(self.options):
            raise ValueError("варианты ответа повторяются")
        if not self.correct_answers:
            raise ValueError("не указан правильный ответ")
        for value in self.correct_answers:
            if value not in self.options:
                raise ValueError(f'ответ "{value}" отсутствует среди вариантов')
        return self


class Quiz(BaseModel):
    pass_score: int = Field(default=70, ge=0, le=100)
    questions: list[Question] = Field(min_length=1)


class Lesson(BaseModel):
    id: str
    title: str
    path: Path


class Module(BaseModel):
    id: str
    title: str
    lessons: list[Lesson]
    quiz: Quiz | None = None


class Course(BaseModel):
    id: str
    dir: Path
    title: str
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    level: Level = "beginner"
    modules: list[Module] = Field(default_factory=list)
    has_cheatsheet: bool = False
    has_glossary: bool = False
    exam: Quiz | None = None

    @property
    def lesson_count(self) -> int:
        return sum(len(module.lessons) for module in self.modules)

    @property
    def quiz_count(self) -> int:
        return sum(1 for module in self.modules if module.quiz is not None)
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_content_models.py -v
```

Ожидается: 8 тестов PASSED.

- [ ] **Step 5: Коммит**

```bash
git add backend/app/content backend/tests/test_content_models.py
git commit -m "feat: модели содержимого курса с проверкой вопросов"
```

---

### Task 3: Чтение курсов с диска и сбор ошибок

**Files:**
- Create: `backend/app/content/markdown.py`
- Create: `backend/app/content/loader.py`
- Create: `backend/tests/fixtures/content/demo-course/...` (состав ниже)
- Create: `backend/tests/fixtures/broken/broken-course/...` (состав ниже)
- Test: `backend/tests/test_content_loader.py`

**Interfaces:**
- Consumes: `Course`, `Module`, `Lesson`, `Quiz`, `Question` из `app.content.models`.
- Produces:
  - `app.content.markdown.extract_title(text: str) -> str | None`
  - `app.content.markdown.humanize(stem: str) -> str`
  - `app.content.loader.ContentError(course_id: str, location: str, message: str)` — dataclass
  - `app.content.loader.LoadResult(courses: list[Course], errors: list[ContentError])` — dataclass
  - `app.content.loader.CourseLoadError(Exception)` с атрибутом `errors: list[ContentError]`
  - `app.content.loader.load_course(course_dir: Path) -> Course`
  - `app.content.loader.load_courses(content_dir: Path) -> LoadResult`
  - `app.content.loader.read_lesson_text(course: Course, module_id: str, lesson_id: str) -> str | None`
  - `app.content.loader.read_page_text(course: Course, page: str) -> str | None`

- [ ] **Step 1: Создать образцовое содержимое для тестов**

Создать файлы ровно с этим содержимым.

`backend/tests/fixtures/content/demo-course/course.yaml`:

```yaml
title: Демонстрационный курс
description: Курс для проверки загрузчика.
tags: [demo, test]
level: beginner
```

`backend/tests/fixtures/content/demo-course/cheatsheet.md`:

```markdown
# Шпаргалка

Краткая выжимка по курсу.
```

`backend/tests/fixtures/content/demo-course/exam.yaml`:

```yaml
pass_score: 80
questions:
  - question: Какой это курс?
    options: ["Демонстрационный", "Настоящий"]
    answer: "Демонстрационный"
    explanation: Так написано в названии.
```

`backend/tests/fixtures/content/demo-course/01-basics/module.yaml`:

```yaml
title: Основы
```

`backend/tests/fixtures/content/demo-course/01-basics/01-first-lesson.md`:

```markdown
# Первый урок

Текст первого урока.
```

`backend/tests/fixtures/content/demo-course/01-basics/02-second-lesson.md`:

```markdown
# Второй урок

Текст второго урока.
```

`backend/tests/fixtures/content/demo-course/01-basics/quiz.yaml`:

```yaml
pass_score: 50
questions:
  - question: Сколько уроков в этом модуле?
    options: ["1", "2", "3"]
    answer: "2"
    explanation: Модуль содержит два урока.
  - question: Какие утверждения верны?
    options: ["Это тест", "Это урок", "Это модуль"]
    answer: ["Это тест", "Это модуль"]
    explanation: Проверка вопроса с несколькими ответами.
```

`backend/tests/fixtures/content/demo-course/02-advanced/module.yaml`:

```yaml
title: Продолжение
```

`backend/tests/fixtures/content/demo-course/02-advanced/01-third-lesson.md`:

```markdown
# Третий урок

Текст третьего урока.
```

`backend/tests/fixtures/broken/broken-course/course.yaml`:

```yaml
title: Сломанный курс
```

`backend/tests/fixtures/broken/broken-course/01-module/module.yaml`:

```yaml
title: Модуль со сломанным тестом
```

`backend/tests/fixtures/broken/broken-course/01-module/01-lesson.md`:

```markdown
# Урок

Текст.
```

`backend/tests/fixtures/broken/broken-course/01-module/quiz.yaml`:

```yaml
pass_score: 70
questions:
  - question: Вопрос с неверным ответом
    options: ["a", "b"]
    answer: "c"
```

- [ ] **Step 2: Написать падающие тесты**

Создать `backend/tests/test_content_loader.py`:

```python
from pathlib import Path

import pytest

from app.content.loader import (
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
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_content_loader.py -v
```

Ожидается: `ModuleNotFoundError: No module named 'app.content.loader'`.

- [ ] **Step 4: Реализовать разбор Markdown**

Создать `backend/app/content/markdown.py`:

```python
import re

HEADING = re.compile(r"^#\s+(?P<title>.+?)\s*$")
PREFIX = re.compile(r"^\d+[-_]")


def extract_title(text: str) -> str | None:
    """Возвращает первый заголовок первого уровня, не заглядывая внутрь блоков кода."""
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            return None
        match = HEADING.match(stripped)
        if match:
            return match.group("title")
    return None


def humanize(stem: str) -> str:
    """Превращает имя файла в читаемое название: 01-what-is-python -> What is python."""
    name = PREFIX.sub("", stem).replace("-", " ").replace("_", " ").strip()
    if not name:
        return stem
    return name[0].upper() + name[1:]
```

- [ ] **Step 5: Реализовать загрузчик**

Создать `backend/app/content/loader.py`:

```python
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


def _describe(error: ValidationError) -> str:
    parts = []
    for item in error.errors():
        location = ".".join(str(piece) for piece in item["loc"]) or "файл"
        message = item["msg"].removeprefix("Value error, ")
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


def _load_quiz(path: Path, course_id: str, location: str, errors: list[ContentError]) -> Quiz | None:
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
    except (yaml.YAMLError, ValueError) as exc:
        raise CourseLoadError([ContentError(course_id, "course.yaml", str(exc))]) from exc

    if not meta.get("title"):
        errors.append(ContentError(course_id, "course.yaml", "не заполнено поле title"))

    modules: list[Module] = []
    for module_dir in sorted(p for p in course_dir.iterdir() if p.is_dir() and not p.name.startswith(".")):
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
    """Читает все курсы каталога. Сломанные курсы не попадают в результат, а их ошибки собираются."""
    result = LoadResult()
    if not content_dir.exists():
        return result

    for course_dir in sorted(p for p in content_dir.iterdir() if p.is_dir() and not p.name.startswith(".")):
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
```

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_content_loader.py -v
```

Ожидается: 15 тестов PASSED.

- [ ] **Step 7: Коммит**

```bash
git add backend/app/content backend/tests/fixtures backend/tests/test_content_loader.py
git commit -m "feat: чтение курсов с диска со сбором понятных ошибок"
```

---

### Task 4: Таблицы, сессия базы и общие фикстуры тестов

**Files:**
- Create: `backend/app/models.py`
- Create: `backend/app/db.py`
- Create: `backend/app/deps.py`
- Create: `backend/tests/conftest.py`
- Test: `backend/tests/test_models.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `app.config.settings`.
- Produces:
  - Таблицы `app.models.LessonProgress`, `app.models.QuizAttempt`, `app.models.LastPosition`, функция `app.models.utcnow() -> datetime`.
  - `app.db.engine`, `app.db.session_factory`, `app.db.create_tables() -> None`.
  - Зависимости `app.deps.get_session() -> AsyncIterator[AsyncSession]`, `app.deps.get_content_dir() -> Path`, `app.deps.get_user_id() -> str`.
  - Фикстуры pytest: `session` (AsyncSession на чистой базе), `client` (httpx.AsyncClient с подменёнными зависимостями), `content_dir`.

- [ ] **Step 1: Написать падающий тест**

Создать `backend/tests/test_models.py`:

```python
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
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

```bash
uv run pytest tests/test_models.py -v
```

Ожидается: `ModuleNotFoundError: No module named 'app.models'`.

- [ ] **Step 3: Реализовать таблицы**

Создать `backend/app/models.py`:

```python
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Column, DateTime, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class LessonProgress(SQLModel, table=True):
    __tablename__ = "lesson_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "course_id", "module_id", "lesson_id", name="uq_lesson_progress"
        ),
        Index("ix_lesson_progress_user_course", "user_id", "course_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: str
    course_id: str
    module_id: str
    lesson_id: str
    completed_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class QuizAttempt(SQLModel, table=True):
    __tablename__ = "quiz_attempt"
    __table_args__ = (
        Index("ix_quiz_attempt_user_course", "user_id", "course_id", "module_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: str
    course_id: str
    scope: str
    module_id: str | None = None
    total_questions: int
    correct_count: int
    score_percent: int
    passed: bool
    answers: list[dict[str, Any]] = Field(
        default_factory=list, sa_column=Column(JSONB, nullable=False)
    )
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class LastPosition(SQLModel, table=True):
    __tablename__ = "last_position"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_last_position"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: str
    course_id: str
    module_id: str
    lesson_id: str
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
```

- [ ] **Step 4: Реализовать подключение к базе и зависимости**

Создать `backend/app/db.py`:

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False, future=True)

session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def create_tables() -> None:
    import app.models  # noqa: F401  регистрирует таблицы в метаданных

    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.create_all)
```

Создать `backend/app/deps.py`:

```python
from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import session_factory


async def get_session() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


def get_content_dir() -> Path:
    return settings.content_dir


def get_user_id() -> str:
    return settings.user_id
```

- [ ] **Step 5: Подключить создание таблиц к старту приложения**

Заменить содержимое `backend/app/main.py`:

```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import create_tables


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await create_tables()
    yield


app = FastAPI(title="FreeTraining API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/ping")
async def ping() -> dict[str, str]:
    return {"status": "ok"}
```

- [ ] **Step 6: Написать общие фикстуры тестов**

Создать `backend/tests/conftest.py`:

```python
from collections.abc import AsyncIterator
from pathlib import Path

import httpx
import pytest
from httpx import ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

import app.models  # noqa: F401  регистрирует таблицы в метаданных
from app.config import settings
from app.deps import get_content_dir, get_session
from app.main import app

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def content_dir() -> Path:
    return FIXTURES / "content"


@pytest.fixture
async def engine():
    engine = create_async_engine(settings.test_database_url, future=True)
    async with engine.begin() as connection:
        await connection.run_sync(SQLModel.metadata.drop_all)
        await connection.run_sync(SQLModel.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest.fixture
async def session(engine) -> AsyncIterator[AsyncSession]:
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        yield session


@pytest.fixture
async def client(session: AsyncSession, content_dir: Path) -> AsyncIterator[httpx.AsyncClient]:
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[get_content_dir] = lambda: content_dir

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
```

Приложение в тестах создаётся без выполнения `lifespan`, поэтому `create_tables` там не вызывается — таблицы готовит фикстура `engine`.

- [ ] **Step 7: Запустить тесты и убедиться, что они проходят**

Убедиться, что база поднята (`docker compose up -d`), затем:

```bash
uv run pytest tests/test_models.py -v
```

Ожидается: 3 теста PASSED.

- [ ] **Step 8: Проверить, что вся текущая проверка зелёная**

```bash
uv run pytest -v && uv run ruff check .
```

Ожидается: все тесты PASSED, замечаний ruff нет.

- [ ] **Step 9: Коммит**

```bash
git add backend/app/models.py backend/app/db.py backend/app/deps.py backend/app/main.py backend/tests/conftest.py backend/tests/test_models.py
git commit -m "feat: таблицы прогресса, подключение к базе и фикстуры тестов"
```

---

### Task 5: Проверка ответов и подсчёт результата

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/grading.py`
- Test: `backend/tests/test_grading.py`

**Interfaces:**
- Consumes: `Quiz`, `Question` из `app.content.models`.
- Produces:
  - `app.schemas.QuestionResult(question: str, options: list[str], selected: list[str], correct_answer: list[str], is_correct: bool, explanation: str)`
  - `app.services.grading.GradeOutcome(total_questions: int, correct_count: int, score_percent: int, passed: bool, results: list[QuestionResult])`
  - `app.services.grading.grade_quiz(quiz: Quiz, answers: list[list[str]]) -> GradeOutcome`, бросает `ValueError` при несовпадении числа ответов и вопросов.

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/tests/test_grading.py`:

```python
import pytest

from app.content.models import Question, Quiz
from app.services.grading import grade_quiz


def build_quiz(pass_score: int = 50) -> Quiz:
    return Quiz(
        pass_score=pass_score,
        questions=[
            Question(
                question="Сколько будет 2+2?",
                options=["3", "4"],
                answer="4",
                explanation="Это арифметика.",
            ),
            Question(
                question="Какие типы изменяемые?",
                options=["list", "tuple", "dict"],
                answer=["list", "dict"],
                explanation="Кортежи неизменяемы.",
            ),
        ],
    )


def test_all_answers_correct():
    outcome = grade_quiz(build_quiz(), [["4"], ["list", "dict"]])

    assert outcome.total_questions == 2
    assert outcome.correct_count == 2
    assert outcome.score_percent == 100
    assert outcome.passed is True


def test_multiple_answer_order_does_not_matter():
    outcome = grade_quiz(build_quiz(), [["4"], ["dict", "list"]])

    assert outcome.correct_count == 2


def test_partial_selection_of_multiple_answer_is_wrong():
    outcome = grade_quiz(build_quiz(), [["4"], ["list"]])

    assert outcome.correct_count == 1
    assert outcome.score_percent == 50
    assert outcome.results[1].is_correct is False


def test_score_below_pass_score_does_not_pass():
    outcome = grade_quiz(build_quiz(pass_score=80), [["4"], ["list"]])

    assert outcome.score_percent == 50
    assert outcome.passed is False


def test_empty_answer_is_wrong():
    outcome = grade_quiz(build_quiz(), [[], ["list", "dict"]])

    assert outcome.results[0].is_correct is False
    assert outcome.results[0].selected == []


def test_result_carries_snapshot_of_question():
    outcome = grade_quiz(build_quiz(), [["3"], ["list", "dict"]])
    first = outcome.results[0]

    assert first.question == "Сколько будет 2+2?"
    assert first.options == ["3", "4"]
    assert first.correct_answer == ["4"]
    assert first.explanation == "Это арифметика."


def test_wrong_number_of_answers_is_rejected():
    with pytest.raises(ValueError, match="число ответов"):
        grade_quiz(build_quiz(), [["4"]])
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_grading.py -v
```

Ожидается: `ModuleNotFoundError: No module named 'app.services'`.

- [ ] **Step 3: Реализовать проверку**

Создать пустой `backend/app/services/__init__.py`.

Создать `backend/app/schemas.py`:

```python
from pydantic import BaseModel


class QuestionResult(BaseModel):
    question: str
    options: list[str]
    selected: list[str]
    correct_answer: list[str]
    is_correct: bool
    explanation: str
```

Создать `backend/app/services/grading.py`:

```python
from dataclasses import dataclass

from app.content.models import Quiz
from app.schemas import QuestionResult


@dataclass
class GradeOutcome:
    total_questions: int
    correct_count: int
    score_percent: int
    passed: bool
    results: list[QuestionResult]


def grade_quiz(quiz: Quiz, answers: list[list[str]]) -> GradeOutcome:
    """Сверяет ответы с тестом. Порядок выбранных вариантов не важен."""
    if len(answers) != len(quiz.questions):
        raise ValueError(
            f"число ответов ({len(answers)}) не совпадает с числом вопросов ({len(quiz.questions)})"
        )

    results: list[QuestionResult] = []
    for question, selected in zip(quiz.questions, answers, strict=True):
        results.append(
            QuestionResult(
                question=question.question,
                options=question.options,
                selected=list(selected),
                correct_answer=question.correct_answers,
                is_correct=set(selected) == set(question.correct_answers),
                explanation=question.explanation,
            )
        )

    total = len(results)
    correct = sum(1 for result in results if result.is_correct)
    percent = round(correct * 100 / total) if total else 0

    return GradeOutcome(
        total_questions=total,
        correct_count=correct,
        score_percent=percent,
        passed=percent >= quiz.pass_score,
        results=results,
    )
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_grading.py -v
```

Ожидается: 7 тестов PASSED.

- [ ] **Step 5: Коммит**

```bash
git add backend/app/schemas.py backend/app/services backend/tests/test_grading.py
git commit -m "feat: проверка ответов теста и подсчёт результата"
```

---

### Task 6: Последовательность шагов курса и навигация

**Files:**
- Create: `backend/app/services/navigation.py`
- Modify: `backend/app/schemas.py`
- Test: `backend/tests/test_navigation.py`

**Interfaces:**
- Consumes: `Course` из `app.content.models`.
- Produces:
  - `app.schemas.StepLink(kind: Literal["lesson", "quiz", "exam"], module_id: str | None, lesson_id: str | None, title: str)`
  - `app.services.navigation.course_steps(course: Course) -> list[StepLink]` — плоская последовательность прохождения курса: уроки модуля, затем тест модуля, затем следующий модуль, в конце экзамен.
  - `app.services.navigation.neighbours(course: Course, module_id: str, lesson_id: str) -> tuple[StepLink | None, StepLink | None]` — предыдущий и следующий шаг относительно урока.

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/tests/test_navigation.py`:

```python
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
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_navigation.py -v
```

Ожидается: `ModuleNotFoundError: No module named 'app.services.navigation'`.

- [ ] **Step 3: Добавить модель ссылки в схемы**

Дописать в конец `backend/app/schemas.py`:

```python
from typing import Literal

StepKind = Literal["lesson", "quiz", "exam"]


class StepLink(BaseModel):
    kind: StepKind
    module_id: str | None = None
    lesson_id: str | None = None
    title: str
```

Импорт `Literal` перенести к остальным импортам в начало файла.

- [ ] **Step 4: Реализовать навигацию**

Создать `backend/app/services/navigation.py`:

```python
from app.content.models import Course
from app.schemas import StepLink


def course_steps(course: Course) -> list[StepLink]:
    """Плоская последовательность прохождения курса: уроки, тест модуля, следующий модуль, экзамен."""
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


def neighbours(
    course: Course, module_id: str, lesson_id: str
) -> tuple[StepLink | None, StepLink | None]:
    """Возвращает предыдущий и следующий шаг относительно указанного урока."""
    steps = course_steps(course)
    for index, step in enumerate(steps):
        if step.kind == "lesson" and step.module_id == module_id and step.lesson_id == lesson_id:
            previous = steps[index - 1] if index > 0 else None
            following = steps[index + 1] if index + 1 < len(steps) else None
            return previous, following
    return None, None
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_navigation.py -v
```

Ожидается: 6 тестов PASSED.

- [ ] **Step 6: Коммит**

```bash
git add backend/app/services/navigation.py backend/app/schemas.py backend/tests/test_navigation.py
git commit -m "feat: последовательность шагов курса и переходы между уроками"
```

---

### Task 7: Расчёт прогресса курса

**Files:**
- Create: `backend/app/services/progress.py`
- Test: `backend/tests/test_progress_service.py`

**Interfaces:**
- Consumes: `Course` из `app.content.models`; таблицы из `app.models`; фикстуры `session`, `content_dir`.
- Produces:
  - `app.services.progress.CourseProgress` — dataclass с полями `completed_lessons: set[tuple[str, str]]`, `module_best: dict[str, int]`, `module_passed: set[str]`, `exam_best: int | None`, `exam_passed: bool`, `resume: tuple[str, str] | None`, `total_units: int`, `done_units: int`, `percent: int`, `status: str`.
  - `app.services.progress.load_course_progress(session: AsyncSession, user_id: str, course: Course) -> CourseProgress`

Единица прогресса — это либо урок, либо тест модуля, либо экзамен. Курс пройден, когда пройдены все единицы.

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/tests/test_progress_service.py`:

```python
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
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_progress_service.py -v
```

Ожидается: `ModuleNotFoundError: No module named 'app.services.progress'`.

- [ ] **Step 3: Реализовать расчёт прогресса**

Создать `backend/app/services/progress.py`:

```python
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.content.models import Course
from app.models import LastPosition, LessonProgress, QuizAttempt


@dataclass
class CourseProgress:
    completed_lessons: set[tuple[str, str]] = field(default_factory=set)
    module_best: dict[str, int] = field(default_factory=dict)
    module_passed: set[str] = field(default_factory=set)
    exam_best: int | None = None
    exam_passed: bool = False
    resume: tuple[str, str] | None = None
    total_units: int = 0
    done_units: int = 0
    percent: int = 0
    status: str = "not_started"


async def load_course_progress(
    session: AsyncSession, user_id: str, course: Course
) -> CourseProgress:
    """Собирает прогресс курса. Записи о несуществующих уроках не учитываются."""
    lesson_rows = (
        await session.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == user_id,
                LessonProgress.course_id == course.id,
            )
        )
    ).scalars().all()

    attempts = (
        await session.execute(
            select(QuizAttempt).where(
                QuizAttempt.user_id == user_id,
                QuizAttempt.course_id == course.id,
            )
        )
    ).scalars().all()

    position = (
        await session.execute(
            select(LastPosition).where(
                LastPosition.user_id == user_id,
                LastPosition.course_id == course.id,
            )
        )
    ).scalar_one_or_none()

    known_lessons = {
        (module.id, lesson.id) for module in course.modules for lesson in module.lessons
    }
    completed = {(row.module_id, row.lesson_id) for row in lesson_rows} & known_lessons

    module_best: dict[str, int] = {}
    module_passed: set[str] = set()
    exam_scores: list[int] = []
    exam_passed = False

    for attempt in attempts:
        if attempt.scope == "module" and attempt.module_id:
            module_best[attempt.module_id] = max(
                module_best.get(attempt.module_id, 0), attempt.score_percent
            )
            if attempt.passed:
                module_passed.add(attempt.module_id)
        elif attempt.scope == "exam":
            exam_scores.append(attempt.score_percent)
            exam_passed = exam_passed or attempt.passed

    total_units = course.lesson_count + course.quiz_count + (1 if course.exam else 0)
    done_quizzes = sum(
        1 for module in course.modules if module.quiz is not None and module.id in module_passed
    )
    done_units = len(completed) + done_quizzes + (1 if exam_passed else 0)
    percent = round(done_units * 100 / total_units) if total_units else 0

    resume = (position.module_id, position.lesson_id) if position else None

    if total_units and done_units >= total_units:
        status = "completed"
    elif done_units or resume:
        status = "in_progress"
    else:
        status = "not_started"

    return CourseProgress(
        completed_lessons=completed,
        module_best=module_best,
        module_passed=module_passed,
        exam_best=max(exam_scores) if exam_scores else None,
        exam_passed=exam_passed,
        resume=resume,
        total_units=total_units,
        done_units=done_units,
        percent=percent,
        status=status,
    )
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_progress_service.py -v
```

Ожидается: 7 тестов PASSED.

- [ ] **Step 5: Коммит**

```bash
git add backend/app/services/progress.py backend/tests/test_progress_service.py
git commit -m "feat: расчёт прогресса курса по данным базы"
```

---

### Task 8: Каталог курсов и карточка курса

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/courses.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api_courses.py`

**Interfaces:**
- Consumes: `load_courses`, `load_course`, `CourseLoadError`; `load_course_progress`; зависимости из `app.deps`.
- Produces:
  - Схемы `ResumePosition`, `CourseSummary`, `LessonRef`, `ModuleDetail`, `CourseDetail` в `app.schemas`.
  - Маршруты `GET /api/courses` и `GET /api/courses/{course_id}`.
  - Вспомогательная функция `app.api.courses.get_course_or_404(content_dir: Path, course_id: str) -> Course`, используемая в следующих задачах.

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/tests/test_api_courses.py`:

```python
from app.models import LessonProgress, QuizAttempt


async def test_catalogue_lists_courses(client):
    response = await client.get("/api/courses")

    assert response.status_code == 200
    courses = response.json()
    assert len(courses) == 1
    assert courses[0]["id"] == "demo-course"
    assert courses[0]["title"] == "Демонстрационный курс"
    assert courses[0]["module_count"] == 2
    assert courses[0]["lesson_count"] == 3
    assert courses[0]["progress_percent"] == 0
    assert courses[0]["status"] == "not_started"
    assert courses[0]["resume"] is None


async def test_catalogue_shows_progress(client, session):
    session.add(
        LessonProgress(
            user_id="local",
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
        )
    )
    await session.commit()

    response = await client.get("/api/courses")

    assert response.json()[0]["progress_percent"] == 20
    assert response.json()[0]["status"] == "in_progress"


async def test_course_detail_returns_tree(client):
    response = await client.get("/api/courses/demo-course")

    assert response.status_code == 200
    course = response.json()
    assert course["title"] == "Демонстрационный курс"
    assert course["has_cheatsheet"] is True
    assert course["has_glossary"] is False
    assert course["has_exam"] is True
    assert [module["id"] for module in course["modules"]] == ["01-basics", "02-advanced"]
    assert course["modules"][0]["lessons"][0]["title"] == "Первый урок"
    assert course["modules"][0]["has_quiz"] is True
    assert course["modules"][1]["has_quiz"] is False


async def test_course_detail_marks_completed_lesson(client, session):
    session.add(
        LessonProgress(
            user_id="local",
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
        )
    )
    await session.commit()

    response = await client.get("/api/courses/demo-course")
    lessons = response.json()["modules"][0]["lessons"]

    assert lessons[0]["completed"] is True
    assert lessons[1]["completed"] is False


async def test_course_detail_shows_quiz_result(client, session):
    session.add(
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
        )
    )
    await session.commit()

    module = (await client.get("/api/courses/demo-course")).json()["modules"][0]

    assert module["quiz_passed"] is True
    assert module["quiz_best_score"] == 100


async def test_unknown_course_returns_404(client):
    response = await client.get("/api/courses/нет-такого-курса")

    assert response.status_code == 404
    assert response.json()["detail"] == "Курс не найден"


async def test_course_response_carries_no_quiz_content(client):
    body = (await client.get("/api/courses/demo-course")).text

    assert "correct_answer" not in body
    assert "Модуль содержит два урока" not in body
    assert "Сколько уроков в этом модуле?" not in body
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_api_courses.py -v
```

Ожидается: все тесты падают с кодом ответа 404, поскольку маршрутов ещё нет.

- [ ] **Step 3: Добавить схемы ответов**

Дописать в конец `backend/app/schemas.py`:

```python
class ResumePosition(BaseModel):
    module_id: str
    lesson_id: str
    lesson_title: str


class CourseSummary(BaseModel):
    id: str
    title: str
    description: str
    tags: list[str]
    level: str
    module_count: int
    lesson_count: int
    progress_percent: int
    status: str
    resume: ResumePosition | None = None


class LessonRef(BaseModel):
    id: str
    title: str
    completed: bool


class ModuleDetail(BaseModel):
    id: str
    title: str
    lessons: list[LessonRef]
    has_quiz: bool
    quiz_passed: bool
    quiz_best_score: int | None = None


class CourseDetail(BaseModel):
    id: str
    title: str
    description: str
    tags: list[str]
    level: str
    modules: list[ModuleDetail]
    has_cheatsheet: bool
    has_glossary: bool
    has_exam: bool
    exam_passed: bool
    exam_best_score: int | None = None
    progress_percent: int
    status: str
    resume: ResumePosition | None = None
```

- [ ] **Step 4: Реализовать маршруты**

Создать пустой `backend/app/api/__init__.py`.

Создать `backend/app/api/courses.py`:

```python
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
```

- [ ] **Step 5: Подключить маршруты к приложению**

В `backend/app/main.py` добавить импорт и подключение после создания `app`:

```python
from app.api import courses

app.include_router(courses.router)
```

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_api_courses.py -v
```

Ожидается: 7 тестов PASSED.

- [ ] **Step 7: Коммит**

```bash
git add backend/app/api backend/app/schemas.py backend/app/main.py backend/tests/test_api_courses.py
git commit -m "feat: каталог курсов и карточка курса"
```

---

### Task 9: Урок и страницы курса

**Files:**
- Modify: `backend/app/api/courses.py`
- Modify: `backend/app/schemas.py`
- Test: `backend/tests/test_api_lessons.py`

**Interfaces:**
- Consumes: `get_course_or_404` из `app.api.courses`; `read_lesson_text`, `read_page_text`; `neighbours` из `app.services.navigation`.
- Produces:
  - Схемы `LessonDetail`, `PageDetail` в `app.schemas`.
  - Маршруты `GET /api/courses/{course_id}/lessons/{module_id}/{lesson_id}` и `GET /api/courses/{course_id}/pages/{page}`.

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/tests/test_api_lessons.py`:

```python
from app.models import LessonProgress


async def test_lesson_returns_content_and_title(client):
    response = await client.get(
        "/api/courses/demo-course/lessons/01-basics/01-first-lesson"
    )

    assert response.status_code == 200
    lesson = response.json()
    assert lesson["title"] == "Первый урок"
    assert "Текст первого урока" in lesson["content"]
    assert lesson["completed"] is False


async def test_lesson_navigation_links(client):
    lesson = (
        await client.get("/api/courses/demo-course/lessons/01-basics/02-second-lesson")
    ).json()

    assert lesson["prev"]["kind"] == "lesson"
    assert lesson["prev"]["lesson_id"] == "01-first-lesson"
    assert lesson["next"]["kind"] == "quiz"
    assert lesson["next"]["module_id"] == "01-basics"


async def test_last_lesson_leads_to_exam(client):
    lesson = (
        await client.get("/api/courses/demo-course/lessons/02-advanced/01-third-lesson")
    ).json()

    assert lesson["next"]["kind"] == "exam"


async def test_lesson_marked_completed(client, session):
    session.add(
        LessonProgress(
            user_id="local",
            course_id="demo-course",
            module_id="01-basics",
            lesson_id="01-first-lesson",
        )
    )
    await session.commit()

    lesson = (
        await client.get("/api/courses/demo-course/lessons/01-basics/01-first-lesson")
    ).json()

    assert lesson["completed"] is True


async def test_unknown_lesson_returns_404(client):
    response = await client.get("/api/courses/demo-course/lessons/01-basics/нет-такого")

    assert response.status_code == 404
    assert response.json()["detail"] == "Урок не найден"


async def test_cheatsheet_page(client):
    response = await client.get("/api/courses/demo-course/pages/cheatsheet")

    assert response.status_code == 200
    assert response.json()["title"] == "Шпаргалка"
    assert "Краткая выжимка" in response.json()["content"]


async def test_missing_page_returns_404(client):
    response = await client.get("/api/courses/demo-course/pages/glossary")

    assert response.status_code == 404
    assert response.json()["detail"] == "Страница не найдена"


async def test_unknown_page_name_returns_404(client):
    response = await client.get("/api/courses/demo-course/pages/что-угодно")

    assert response.status_code == 404
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_api_lessons.py -v
```

Ожидается: ответы 404 на все запросы, маршрутов ещё нет.

- [ ] **Step 3: Добавить схемы**

Дописать в конец `backend/app/schemas.py`:

```python
class LessonDetail(BaseModel):
    course_id: str
    module_id: str
    lesson_id: str
    title: str
    content: str
    completed: bool
    prev: StepLink | None = None
    next: StepLink | None = None


class PageDetail(BaseModel):
    course_id: str
    page: str
    title: str
    content: str
```

- [ ] **Step 4: Реализовать маршруты**

Дописать в конец `backend/app/api/courses.py`:

```python
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
```

Дополнить импорты в начале `backend/app/api/courses.py`:

```python
from app.content.loader import (
    CourseLoadError,
    load_course,
    load_courses,
    read_lesson_text,
    read_page_text,
)
from app.content.markdown import extract_title
from app.schemas import (
    CourseDetail,
    CourseSummary,
    LessonDetail,
    LessonRef,
    ModuleDetail,
    PageDetail,
    ResumePosition,
)
from app.services.navigation import neighbours
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_api_lessons.py -v
```

Ожидается: 8 тестов PASSED.

- [ ] **Step 6: Коммит**

```bash
git add backend/app/api/courses.py backend/app/schemas.py backend/tests/test_api_lessons.py
git commit -m "feat: выдача урока с навигацией и страниц курса"
```

---

### Task 10: Выдача тестов и приём попытки

**Files:**
- Create: `backend/app/api/quizzes.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api_quizzes.py`

**Interfaces:**
- Consumes: `get_course_or_404`; `grade_quiz`, `GradeOutcome`; таблица `QuizAttempt`.
- Produces:
  - Схемы `QuizQuestionPublic`, `QuizPublic`, `QuizSubmission`, `QuizResult` в `app.schemas`.
  - Маршруты `GET /api/courses/{course_id}/quizzes/{module_id}`, `GET /api/courses/{course_id}/exam`, `POST /api/quizzes/submit`.

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/tests/test_api_quizzes.py`:

```python
from sqlalchemy import select

from app.models import QuizAttempt


async def test_module_quiz_hides_correct_answers(client):
    response = await client.get("/api/courses/demo-course/quizzes/01-basics")

    assert response.status_code == 200
    quiz = response.json()
    assert quiz["pass_score"] == 50
    assert quiz["scope"] == "module"
    assert quiz["module_id"] == "01-basics"
    assert len(quiz["questions"]) == 2
    assert quiz["questions"][0]["question"] == "Сколько уроков в этом модуле?"
    assert quiz["questions"][0]["multiple"] is False
    assert quiz["questions"][1]["multiple"] is True
    assert "answer" not in quiz["questions"][0]
    assert "explanation" not in quiz["questions"][0]


async def test_module_without_quiz_returns_404(client):
    response = await client.get("/api/courses/demo-course/quizzes/02-advanced")

    assert response.status_code == 404
    assert response.json()["detail"] == "Тест не найден"


async def test_exam_is_returned(client):
    response = await client.get("/api/courses/demo-course/exam")

    assert response.status_code == 200
    assert response.json()["scope"] == "exam"
    assert response.json()["pass_score"] == 80


async def test_submit_saves_attempt_and_returns_review(client, session):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "01-basics",
            "answers": [["2"], ["Это тест", "Это модуль"]],
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["total_questions"] == 2
    assert result["correct_count"] == 2
    assert result["score_percent"] == 100
    assert result["passed"] is True
    assert result["results"][0]["is_correct"] is True
    assert result["results"][0]["correct_answer"] == ["2"]
    assert result["results"][0]["explanation"] == "Модуль содержит два урока."
    assert result["attempt_id"] > 0

    rows = (await session.execute(select(QuizAttempt))).scalars().all()
    assert len(rows) == 1
    assert rows[0].scope == "module"
    assert rows[0].module_id == "01-basics"
    assert rows[0].answers[0]["question"] == "Сколько уроков в этом модуле?"


async def test_failed_attempt_is_saved_too(client, session):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "01-basics",
            "answers": [["1"], ["Это урок"]],
        },
    )

    assert response.json()["passed"] is False
    rows = (await session.execute(select(QuizAttempt))).scalars().all()
    assert len(rows) == 1
    assert rows[0].passed is False


async def test_repeated_attempts_accumulate(client, session):
    payload = {
        "course_id": "demo-course",
        "scope": "module",
        "module_id": "01-basics",
        "answers": [["2"], ["Это тест", "Это модуль"]],
    }
    await client.post("/api/quizzes/submit", json=payload)
    await client.post("/api/quizzes/submit", json=payload)

    rows = (await session.execute(select(QuizAttempt))).scalars().all()

    assert len(rows) == 2


async def test_exam_submission(client, session):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "exam",
            "module_id": None,
            "answers": [["Демонстрационный"]],
        },
    )

    assert response.json()["passed"] is True
    rows = (await session.execute(select(QuizAttempt))).scalars().all()
    assert rows[0].scope == "exam"
    assert rows[0].module_id is None


async def test_wrong_number_of_answers_returns_422(client):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "01-basics",
            "answers": [["2"]],
        },
    )

    assert response.status_code == 422
    assert "число ответов" in response.json()["detail"]


async def test_submit_to_missing_quiz_returns_404(client):
    response = await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "02-advanced",
            "answers": [["что угодно"]],
        },
    )

    assert response.status_code == 404
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_api_quizzes.py -v
```

Ожидается: ответы 404, маршрутов ещё нет.

- [ ] **Step 3: Добавить схемы**

Дописать в конец `backend/app/schemas.py`:

```python
from datetime import datetime

QuizScope = Literal["module", "exam"]


class QuizQuestionPublic(BaseModel):
    index: int
    question: str
    options: list[str]
    multiple: bool


class QuizPublic(BaseModel):
    course_id: str
    scope: QuizScope
    module_id: str | None = None
    title: str
    pass_score: int
    questions: list[QuizQuestionPublic]


class QuizSubmission(BaseModel):
    course_id: str
    scope: QuizScope
    module_id: str | None = None
    answers: list[list[str]]


class QuizResult(BaseModel):
    attempt_id: int
    course_id: str
    scope: QuizScope
    module_id: str | None = None
    total_questions: int
    correct_count: int
    score_percent: int
    passed: bool
    pass_score: int
    results: list[QuestionResult]
    created_at: datetime
```

Импорт `datetime` перенести к остальным импортам в начало файла.

- [ ] **Step 4: Реализовать маршруты**

Создать `backend/app/api/quizzes.py`:

```python
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.courses import get_course_or_404
from app.content.models import Course, Quiz
from app.deps import get_content_dir, get_session, get_user_id
from app.models import QuizAttempt
from app.schemas import QuizPublic, QuizQuestionPublic, QuizResult, QuizSubmission
from app.services.grading import grade_quiz

router = APIRouter(prefix="/api", tags=["quizzes"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
ContentDep = Annotated[Path, Depends(get_content_dir)]
UserDep = Annotated[str, Depends(get_user_id)]


def find_quiz(course: Course, scope: str, module_id: str | None) -> tuple[Quiz, str]:
    """Возвращает тест и его заголовок либо бросает 404."""
    if scope == "exam":
        if course.exam is None:
            raise HTTPException(status_code=404, detail="Тест не найден")
        return course.exam, "Финальный экзамен"

    for module in course.modules:
        if module.id == module_id and module.quiz is not None:
            return module.quiz, f"Тест модуля: {module.title}"
    raise HTTPException(status_code=404, detail="Тест не найден")


def to_public(course_id: str, scope: str, module_id: str | None, quiz: Quiz, title: str) -> QuizPublic:
    return QuizPublic(
        course_id=course_id,
        scope=scope,
        module_id=module_id,
        title=title,
        pass_score=quiz.pass_score,
        questions=[
            QuizQuestionPublic(
                index=index,
                question=question.question,
                options=question.options,
                multiple=question.multiple,
            )
            for index, question in enumerate(quiz.questions)
        ],
    )


@router.get("/courses/{course_id}/quizzes/{module_id}", response_model=QuizPublic)
async def get_module_quiz(course_id: str, module_id: str, content_dir: ContentDep) -> QuizPublic:
    course = get_course_or_404(content_dir, course_id)
    quiz, title = find_quiz(course, "module", module_id)
    return to_public(course.id, "module", module_id, quiz, title)


@router.get("/courses/{course_id}/exam", response_model=QuizPublic)
async def get_exam(course_id: str, content_dir: ContentDep) -> QuizPublic:
    course = get_course_or_404(content_dir, course_id)
    quiz, title = find_quiz(course, "exam", None)
    return to_public(course.id, "exam", None, quiz, title)


@router.post("/quizzes/submit", response_model=QuizResult)
async def submit_quiz(
    submission: QuizSubmission,
    session: SessionDep,
    content_dir: ContentDep,
    user_id: UserDep,
) -> QuizResult:
    course = get_course_or_404(content_dir, submission.course_id)
    quiz, _ = find_quiz(course, submission.scope, submission.module_id)

    try:
        outcome = grade_quiz(quiz, submission.answers)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    attempt = QuizAttempt(
        user_id=user_id,
        course_id=course.id,
        scope=submission.scope,
        module_id=submission.module_id if submission.scope == "module" else None,
        total_questions=outcome.total_questions,
        correct_count=outcome.correct_count,
        score_percent=outcome.score_percent,
        passed=outcome.passed,
        answers=[result.model_dump() for result in outcome.results],
    )
    session.add(attempt)
    await session.commit()
    await session.refresh(attempt)

    return QuizResult(
        attempt_id=attempt.id or 0,
        course_id=course.id,
        scope=submission.scope,
        module_id=attempt.module_id,
        total_questions=outcome.total_questions,
        correct_count=outcome.correct_count,
        score_percent=outcome.score_percent,
        passed=outcome.passed,
        pass_score=quiz.pass_score,
        results=outcome.results,
        created_at=attempt.created_at,
    )
```

- [ ] **Step 5: Подключить маршруты**

В `backend/app/main.py` дополнить импорт и подключение:

```python
from app.api import courses, quizzes

app.include_router(courses.router)
app.include_router(quizzes.router)
```

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_api_quizzes.py -v
```

Ожидается: 9 тестов PASSED.

- [ ] **Step 7: Коммит**

```bash
git add backend/app/api/quizzes.py backend/app/schemas.py backend/app/main.py backend/tests/test_api_quizzes.py
git commit -m "feat: выдача тестов без ответов и приём попытки с разбором"
```

---

### Task 11: Запись прогресса, история попыток, сброс и выгрузка

**Files:**
- Create: `backend/app/api/progress.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api_progress.py`

**Interfaces:**
- Consumes: `get_course_or_404`; таблицы `LessonProgress`, `QuizAttempt`, `LastPosition`.
- Produces:
  - Схемы `PositionInput`, `AttemptSummary`, `ProgressExport` в `app.schemas`.
  - Маршруты `POST /api/progress/lessons/{course_id}/{module_id}/{lesson_id}`, `PUT /api/progress/position/{course_id}`, `GET /api/progress/attempts/{course_id}`, `DELETE /api/progress/courses/{course_id}`, `GET /api/progress/export`.

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/tests/test_api_progress.py`:

```python
from sqlalchemy import select

from app.models import LastPosition, LessonProgress, QuizAttempt


async def test_mark_lesson_completed(client, session):
    response = await client.post(
        "/api/progress/lessons/demo-course/01-basics/01-first-lesson"
    )

    assert response.status_code == 200
    assert response.json()["completed"] is True

    rows = (await session.execute(select(LessonProgress))).scalars().all()
    assert len(rows) == 1


async def test_marking_twice_does_not_duplicate(client, session):
    await client.post("/api/progress/lessons/demo-course/01-basics/01-first-lesson")
    await client.post("/api/progress/lessons/demo-course/01-basics/01-first-lesson")

    rows = (await session.execute(select(LessonProgress))).scalars().all()

    assert len(rows) == 1


async def test_marking_unknown_lesson_returns_404(client):
    response = await client.post("/api/progress/lessons/demo-course/01-basics/нет-такого")

    assert response.status_code == 404


async def test_save_position(client, session):
    response = await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "01-basics", "lesson_id": "02-second-lesson"},
    )

    assert response.status_code == 200
    rows = (await session.execute(select(LastPosition))).scalars().all()
    assert len(rows) == 1
    assert rows[0].lesson_id == "02-second-lesson"


async def test_position_is_overwritten_not_duplicated(client, session):
    await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "01-basics", "lesson_id": "01-first-lesson"},
    )
    await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "02-advanced", "lesson_id": "01-third-lesson"},
    )

    rows = (await session.execute(select(LastPosition))).scalars().all()

    assert len(rows) == 1
    assert rows[0].module_id == "02-advanced"


async def test_attempts_history_is_newest_first(client):
    payload = {
        "course_id": "demo-course",
        "scope": "module",
        "module_id": "01-basics",
        "answers": [["1"], ["Это урок"]],
    }
    await client.post("/api/quizzes/submit", json=payload)
    payload["answers"] = [["2"], ["Это тест", "Это модуль"]]
    await client.post("/api/quizzes/submit", json=payload)

    attempts = (await client.get("/api/progress/attempts/demo-course")).json()

    assert len(attempts) == 2
    assert attempts[0]["score_percent"] == 100
    assert attempts[1]["score_percent"] == 0
    assert attempts[0]["results"][0]["question"] == "Сколько уроков в этом модуле?"


async def test_reset_course_progress(client, session):
    await client.post("/api/progress/lessons/demo-course/01-basics/01-first-lesson")
    await client.put(
        "/api/progress/position/demo-course",
        json={"module_id": "01-basics", "lesson_id": "01-first-lesson"},
    )
    await client.post(
        "/api/quizzes/submit",
        json={
            "course_id": "demo-course",
            "scope": "module",
            "module_id": "01-basics",
            "answers": [["2"], ["Это тест", "Это модуль"]],
        },
    )

    response = await client.delete("/api/progress/courses/demo-course")

    assert response.status_code == 200
    assert (await session.execute(select(LessonProgress))).scalars().all() == []
    assert (await session.execute(select(QuizAttempt))).scalars().all() == []
    assert (await session.execute(select(LastPosition))).scalars().all() == []


async def test_export_contains_all_sections(client):
    await client.post("/api/progress/lessons/demo-course/01-basics/01-first-lesson")

    export = (await client.get("/api/progress/export")).json()

    assert export["user_id"] == "local"
    assert len(export["lessons"]) == 1
    assert export["lessons"][0]["course_id"] == "demo-course"
    assert export["attempts"] == []
    assert export["positions"] == []
    assert "exported_at" in export
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_api_progress.py -v
```

Ожидается: ответы 404, маршрутов ещё нет.

- [ ] **Step 3: Добавить схемы**

Дописать в конец `backend/app/schemas.py`:

```python
class PositionInput(BaseModel):
    module_id: str
    lesson_id: str


class LessonProgressOut(BaseModel):
    course_id: str
    module_id: str
    lesson_id: str
    completed: bool
    completed_at: datetime


class AttemptSummary(BaseModel):
    id: int
    course_id: str
    scope: QuizScope
    module_id: str | None = None
    total_questions: int
    correct_count: int
    score_percent: int
    passed: bool
    created_at: datetime
    results: list[QuestionResult]


class PositionOut(BaseModel):
    course_id: str
    module_id: str
    lesson_id: str
    updated_at: datetime


class ProgressExport(BaseModel):
    user_id: str
    exported_at: datetime
    lessons: list[LessonProgressOut]
    attempts: list[AttemptSummary]
    positions: list[PositionOut]
```

- [ ] **Step 4: Реализовать маршруты**

Создать `backend/app/api/progress.py`:

```python
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.courses import get_course_or_404
from app.content.loader import read_lesson_text
from app.deps import get_content_dir, get_session, get_user_id
from app.models import LastPosition, LessonProgress, QuizAttempt, utcnow
from app.schemas import (
    AttemptSummary,
    LessonProgressOut,
    PositionInput,
    PositionOut,
    ProgressExport,
    QuestionResult,
)

router = APIRouter(prefix="/api/progress", tags=["progress"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]
ContentDep = Annotated[Path, Depends(get_content_dir)]
UserDep = Annotated[str, Depends(get_user_id)]


@router.post(
    "/lessons/{course_id}/{module_id}/{lesson_id}", response_model=LessonProgressOut
)
async def complete_lesson(
    course_id: str,
    module_id: str,
    lesson_id: str,
    session: SessionDep,
    content_dir: ContentDep,
    user_id: UserDep,
) -> LessonProgressOut:
    course = get_course_or_404(content_dir, course_id)
    if read_lesson_text(course, module_id, lesson_id) is None:
        raise HTTPException(status_code=404, detail="Урок не найден")

    existing = (
        await session.execute(
            select(LessonProgress).where(
                LessonProgress.user_id == user_id,
                LessonProgress.course_id == course_id,
                LessonProgress.module_id == module_id,
                LessonProgress.lesson_id == lesson_id,
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        existing = LessonProgress(
            user_id=user_id,
            course_id=course_id,
            module_id=module_id,
            lesson_id=lesson_id,
        )
        session.add(existing)
        await session.commit()
        await session.refresh(existing)

    return LessonProgressOut(
        course_id=course_id,
        module_id=module_id,
        lesson_id=lesson_id,
        completed=True,
        completed_at=existing.completed_at,
    )


@router.put("/position/{course_id}", response_model=PositionOut)
async def save_position(
    course_id: str,
    payload: PositionInput,
    session: SessionDep,
    content_dir: ContentDep,
    user_id: UserDep,
) -> PositionOut:
    course = get_course_or_404(content_dir, course_id)
    if read_lesson_text(course, payload.module_id, payload.lesson_id) is None:
        raise HTTPException(status_code=404, detail="Урок не найден")

    position = (
        await session.execute(
            select(LastPosition).where(
                LastPosition.user_id == user_id,
                LastPosition.course_id == course_id,
            )
        )
    ).scalar_one_or_none()

    if position is None:
        position = LastPosition(
            user_id=user_id,
            course_id=course_id,
            module_id=payload.module_id,
            lesson_id=payload.lesson_id,
        )
        session.add(position)
    else:
        position.module_id = payload.module_id
        position.lesson_id = payload.lesson_id
        position.updated_at = utcnow()

    await session.commit()
    await session.refresh(position)

    return PositionOut(
        course_id=course_id,
        module_id=position.module_id,
        lesson_id=position.lesson_id,
        updated_at=position.updated_at,
    )


def to_attempt_summary(attempt: QuizAttempt) -> AttemptSummary:
    return AttemptSummary(
        id=attempt.id or 0,
        course_id=attempt.course_id,
        scope=attempt.scope,
        module_id=attempt.module_id,
        total_questions=attempt.total_questions,
        correct_count=attempt.correct_count,
        score_percent=attempt.score_percent,
        passed=attempt.passed,
        created_at=attempt.created_at,
        results=[QuestionResult.model_validate(item) for item in attempt.answers],
    )


@router.get("/attempts/{course_id}", response_model=list[AttemptSummary])
async def list_attempts(
    course_id: str, session: SessionDep, user_id: UserDep
) -> list[AttemptSummary]:
    attempts = (
        await session.execute(
            select(QuizAttempt)
            .where(QuizAttempt.user_id == user_id, QuizAttempt.course_id == course_id)
            .order_by(QuizAttempt.created_at.desc(), QuizAttempt.id.desc())
        )
    ).scalars().all()

    return [to_attempt_summary(attempt) for attempt in attempts]


@router.delete("/courses/{course_id}", response_model=dict[str, str])
async def reset_course(
    course_id: str, session: SessionDep, user_id: UserDep
) -> dict[str, str]:
    for table in (LessonProgress, QuizAttempt, LastPosition):
        await session.execute(
            delete(table).where(table.user_id == user_id, table.course_id == course_id)
        )
    await session.commit()
    return {"status": "ok"}


@router.get("/export", response_model=ProgressExport)
async def export_progress(session: SessionDep, user_id: UserDep) -> ProgressExport:
    lessons = (
        await session.execute(
            select(LessonProgress).where(LessonProgress.user_id == user_id)
        )
    ).scalars().all()
    attempts = (
        await session.execute(
            select(QuizAttempt)
            .where(QuizAttempt.user_id == user_id)
            .order_by(QuizAttempt.created_at.desc())
        )
    ).scalars().all()
    positions = (
        await session.execute(
            select(LastPosition).where(LastPosition.user_id == user_id)
        )
    ).scalars().all()

    return ProgressExport(
        user_id=user_id,
        exported_at=utcnow(),
        lessons=[
            LessonProgressOut(
                course_id=row.course_id,
                module_id=row.module_id,
                lesson_id=row.lesson_id,
                completed=True,
                completed_at=row.completed_at,
            )
            for row in lessons
        ],
        attempts=[to_attempt_summary(attempt) for attempt in attempts],
        positions=[
            PositionOut(
                course_id=row.course_id,
                module_id=row.module_id,
                lesson_id=row.lesson_id,
                updated_at=row.updated_at,
            )
            for row in positions
        ],
    )
```

Маршрут `/export` объявлен после `/attempts/{course_id}`, но конфликта нет: пути различаются первым сегментом.

- [ ] **Step 5: Подключить маршруты**

В `backend/app/main.py` дополнить импорт и подключение:

```python
from app.api import courses, progress, quizzes

app.include_router(courses.router)
app.include_router(quizzes.router)
app.include_router(progress.router)
```

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_api_progress.py -v
```

Ожидается: 9 тестов PASSED.

- [ ] **Step 7: Коммит**

```bash
git add backend/app/api/progress.py backend/app/schemas.py backend/app/main.py backend/tests/test_api_progress.py
git commit -m "feat: запись прогресса, история попыток, сброс и выгрузка"
```

---

### Task 12: Страница состояния содержимого

**Files:**
- Create: `backend/app/api/health.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_api_health.py`

**Interfaces:**
- Consumes: `load_courses`, `ContentError`.
- Produces:
  - Схемы `ContentErrorOut`, `ContentHealth` в `app.schemas`.
  - Маршрут `GET /api/health/content`.

- [ ] **Step 1: Написать падающие тесты**

Создать `backend/tests/test_api_health.py`:

```python
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


async def test_healthy_content_reports_no_errors(client):
    response = await client.get("/api/health/content")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["course_count"] == 1
    assert body["errors"] == []


@pytest.mark.parametrize("content_dir", [FIXTURES / "broken"])
async def test_broken_content_is_reported(client, content_dir):
    response = await client.get("/api/health/content")

    body = response.json()
    assert body["ok"] is False
    assert body["course_count"] == 0
    assert len(body["errors"]) == 1
    assert body["errors"][0]["course_id"] == "broken-course"
    assert body["errors"][0]["location"] == "01-module/quiz.yaml"
    assert "отсутствует среди вариантов" in body["errors"][0]["message"]
```

Менять `conftest.py` не нужно: `parametrize` с именем существующей фикстуры
подменяет её значение для этого теста, и фикстура `client`, зависящая от
`content_dir`, получит подменённый каталог.

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
uv run pytest tests/test_api_health.py -v
```

Ожидается: ответ 404, маршрута ещё нет.

- [ ] **Step 3: Добавить схемы**

Дописать в конец `backend/app/schemas.py`:

```python
class ContentErrorOut(BaseModel):
    course_id: str
    location: str
    message: str


class ContentHealth(BaseModel):
    ok: bool
    course_count: int
    errors: list[ContentErrorOut]
```

- [ ] **Step 4: Реализовать маршрут**

Создать `backend/app/api/health.py`:

```python
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends

from app.content.loader import load_courses
from app.deps import get_content_dir
from app.schemas import ContentErrorOut, ContentHealth

router = APIRouter(prefix="/api/health", tags=["health"])

ContentDep = Annotated[Path, Depends(get_content_dir)]


@router.get("/content", response_model=ContentHealth)
async def content_health(content_dir: ContentDep) -> ContentHealth:
    result = load_courses(content_dir)
    return ContentHealth(
        ok=not result.errors,
        course_count=len(result.courses),
        errors=[
            ContentErrorOut(
                course_id=error.course_id,
                location=error.location,
                message=error.message,
            )
            for error in result.errors
        ],
    )
```

- [ ] **Step 5: Подключить маршрут**

В `backend/app/main.py` дополнить импорт и подключение:

```python
from app.api import courses, health, progress, quizzes

app.include_router(courses.router)
app.include_router(quizzes.router)
app.include_router(progress.router)
app.include_router(health.router)
```

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

```bash
uv run pytest tests/test_api_health.py -v
```

Ожидается: 2 теста PASSED.

- [ ] **Step 7: Коммит**

```bash
git add backend/app/api/health.py backend/app/schemas.py backend/app/main.py backend/tests/test_api_health.py
git commit -m "feat: страница состояния содержимого с понятными ошибками"
```

---

### Task 13: Настоящий курс, документация запуска и итоговая проверка

**Files:**
- Create: `content/python-basics/course.yaml`
- Create: `content/python-basics/cheatsheet.md`
- Create: `content/python-basics/glossary.md`
- Create: `content/python-basics/exam.yaml`
- Create: `content/python-basics/01-introduction/module.yaml`
- Create: `content/python-basics/01-introduction/01-what-is-python.md`
- Create: `content/python-basics/01-introduction/02-installation.md`
- Create: `content/python-basics/01-introduction/quiz.yaml`
- Create: `content/python-basics/02-syntax/module.yaml`
- Create: `content/python-basics/02-syntax/01-variables.md`
- Create: `content/python-basics/02-syntax/quiz.yaml`
- Create: `README.md`
- Create: `docs/course-format.md`

**Interfaces:**
- Consumes: весь API предыдущих задач.
- Produces: работающий пример содержимого и документацию формата курса, на которую опирается генерация новых курсов.

- [ ] **Step 1: Создать настоящий курс**

Создать файлы. `content/python-basics/course.yaml`:

```yaml
title: Основы Python
description: Первое знакомство с языком: установка, переменные и типы данных.
tags: [python, backend]
level: beginner
```

`content/python-basics/01-introduction/module.yaml`:

```yaml
title: Введение
```

`content/python-basics/01-introduction/01-what-is-python.md`:

```markdown
# Что такое Python

Python — язык программирования общего назначения с простым синтаксисом.
Его используют для веб-разработки, анализа данных, автоматизации и машинного обучения.

## Чем он отличается

Код на Python читается почти как обычный текст, а блоки выделяются отступами,
а не фигурными скобками:

```python
if temperature > 30:
    print("Жарко")
else:
    print("Нормально")
```

Python — интерпретируемый язык: программа выполняется построчно, без отдельного
шага сборки.
```

`content/python-basics/01-introduction/02-installation.md`:

```markdown
# Установка и запуск

Проверить, установлен ли Python:

```bash
python3 --version
```

Если версия выводится, язык уже установлен. Запустить программу из файла:

```bash
python3 program.py
```

Интерактивный режим запускается командой `python3` без аргументов — в нём удобно
проверять короткие выражения.
```

`content/python-basics/01-introduction/quiz.yaml`:

```yaml
pass_score: 70
questions:
  - question: Чем в Python выделяются блоки кода?
    options: ["Фигурными скобками", "Отступами", "Ключевым словом end"]
    answer: "Отступами"
    explanation: Отступ — часть синтаксиса, а не оформления.
  - question: Какой командой проверить установленную версию?
    options: ["python3 --version", "python3 --info", "py -v"]
    answer: "python3 --version"
    explanation: Флаг --version выводит номер версии интерпретатора.
  - question: Что верно про Python?
    options:
      - "Это интерпретируемый язык"
      - "Язык общего назначения"
      - "Требует отдельной сборки перед запуском"
    answer: ["Это интерпретируемый язык", "Язык общего назначения"]
    explanation: Отдельный шаг сборки Python не требуется.
```

`content/python-basics/02-syntax/module.yaml`:

```yaml
title: Переменные и типы
```

`content/python-basics/02-syntax/01-variables.md`:

```markdown
# Переменные и типы данных

Переменная создаётся присваиванием, объявлять тип заранее не нужно:

```python
name = "Мария"
age = 30
height = 1.72
is_student = False
```

## Основные типы

- `str` — строка
- `int` — целое число
- `float` — число с дробной частью
- `bool` — истина или ложь
- `list` — изменяемый список
- `tuple` — неизменяемый набор
- `dict` — словарь пар ключ-значение

Узнать тип значения можно функцией `type`:

```python
print(type(age))  # <class 'int'>
```
```

`content/python-basics/02-syntax/quiz.yaml`:

```yaml
pass_score: 70
questions:
  - question: Какой тип у значения 1.72?
    options: ["int", "float", "str"]
    answer: "float"
    explanation: Число с дробной частью имеет тип float.
  - question: Какие типы изменяемые?
    options: ["list", "tuple", "dict", "str"]
    answer: ["list", "dict"]
    explanation: Кортежи и строки в Python неизменяемы.
```

`content/python-basics/cheatsheet.md`:

```markdown
# Шпаргалка по основам Python

## Переменные

```python
name = "Мария"     # str
age = 30            # int
height = 1.72       # float
is_student = False  # bool
```

## Типы данных

| Тип | Пример | Изменяемый |
| --- | --- | --- |
| `str` | `"текст"` | нет |
| `int` | `42` | нет |
| `float` | `3.14` | нет |
| `bool` | `True` | нет |
| `list` | `[1, 2, 3]` | да |
| `tuple` | `(1, 2, 3)` | нет |
| `dict` | `{"a": 1}` | да |

## Команды

```bash
python3 --version   # версия
python3 program.py  # запуск файла
python3             # интерактивный режим
```
```

`content/python-basics/glossary.md`:

```markdown
# Термины

**Интерпретатор** — программа, выполняющая код построчно, без отдельной сборки.

**Переменная** — имя, связанное со значением.

**Тип данных** — вид значения, определяющий допустимые операции над ним.

**Изменяемый тип** — значение можно поменять после создания, не создавая новое.

**Отступ** — пробелы в начале строки; в Python они определяют вложенность блока.
```

`content/python-basics/exam.yaml`:

```yaml
pass_score: 80
questions:
  - question: Чем выделяются блоки кода в Python?
    options: ["Отступами", "Фигурными скобками", "Точкой с запятой"]
    answer: "Отступами"
    explanation: Отступ — часть синтаксиса языка.
  - question: Какой тип у значения True?
    options: ["bool", "int", "str"]
    answer: "bool"
    explanation: True и False имеют тип bool.
  - question: Какие утверждения верны?
    options:
      - "Список изменяемый"
      - "Кортеж изменяемый"
      - "Словарь изменяемый"
    answer: ["Список изменяемый", "Словарь изменяемый"]
    explanation: Кортеж неизменяем.
```

- [ ] **Step 2: Проверить, что настоящий курс читается без ошибок**

Поднять базу и сервер, затем проверить:

```bash
docker compose up -d && cd backend && uv run uvicorn app.main:app --port 8000 &
sleep 3 && curl -s http://localhost:8000/api/health/content
```

Ожидается: `{"ok":true,"course_count":1,"errors":[]}`.

Затем проверить каталог и урок:

```bash
curl -s http://localhost:8000/api/courses | head -c 400
curl -s http://localhost:8000/api/courses/python-basics/lessons/01-introduction/01-what-is-python | head -c 400
```

Ожидается: курс `python-basics` в каталоге, у урока заголовок `Что такое Python`.

- [ ] **Step 3: Проверить, что ошибка в курсе выводится понятно**

Временно сломать тест:

```bash
printf 'pass_score: 70\nquestions:\n  - question: Сломано\n    options: ["a", "b"]\n    answer: "c"\n' > content/python-basics/02-syntax/quiz.yaml
curl -s http://localhost:8000/api/health/content
```

Ожидается: `ok` равно `false`, в списке ошибка с местом `02-syntax/quiz.yaml` и текстом про отсутствующий среди вариантов ответ. Затем вернуть правильное содержимое файла из Step 1 и убедиться, что `ok` снова `true`. Остановить сервер.

- [ ] **Step 4: Написать документацию формата курса**

Создать `docs/course-format.md` — справочник, по которому генерируются новые курсы:

```markdown
# Формат курса

Курс — это папка внутри `content/`. Имя папки становится идентификатором курса и
частью адреса страницы, поэтому пишется латиницей. Все отображаемые названия
задаются внутри файлов и пишутся по-русски.

## Структура

```
content/<course-id>/
  course.yaml                 обязателен
  cheatsheet.md               необязателен
  glossary.md                 необязателен
  exam.yaml                   необязателен
  01-<module-id>/
    module.yaml               обязателен
    01-<lesson-id>.md         хотя бы один урок
    quiz.yaml                 необязателен
```

Числовой префикс в именах папок модулей и файлов уроков задаёт порядок.

## course.yaml

```yaml
title: Основы Python
description: Одно-два предложения о курсе.
tags: [python, backend]
level: beginner        # beginner | intermediate | advanced
```

## module.yaml

```yaml
title: Введение
```

## Урок

Обычный Markdown. Первый заголовок первого уровня становится названием урока в
интерфейсе, поэтому файл начинается с него:

```markdown
# Что такое Python

Текст урока.
```

## quiz.yaml и exam.yaml

Один формат для теста модуля и для экзамена:

```yaml
pass_score: 70
questions:
  - question: Текст вопроса
    options: ["Вариант 1", "Вариант 2", "Вариант 3"]
    answer: "Вариант 2"
    explanation: Почему этот ответ верный.
```

Список в поле `answer` означает вопрос с несколькими правильными ответами:

```yaml
    answer: ["Вариант 1", "Вариант 3"]
```

## Правила проверки

- `answer` должен присутствовать среди `options`.
- Варианты не должны повторяться, их не меньше двух.
- `pass_score` — целое число от 0 до 100.
- В модуле хотя бы один урок.

Ошибки не ломают приложение: неисправный курс не попадает в каталог, а сообщение
с точным указанием файла выводится на странице `/api/health/content`.
```

- [ ] **Step 5: Написать README**

Создать `README.md` в корне репозитория:

```markdown
# FreeTraining

Личная платформа для обучения по курсам, созданным ИИ. Курс — папка с файлами,
прогресс и результаты тестов хранятся в PostgreSQL.

## Требования

- Docker
- Python 3.12 и uv

## Запуск

Поднять базу данных:

```bash
docker compose up -d
```

Запустить бэкенд:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Документация API открывается по адресу `http://localhost:8000/docs`.

## Проверка

```bash
cd backend
uv run pytest
uv run ruff check .
```

Тесты используют отдельную базу `freetraining_test`, которая создаётся при первом
запуске контейнера.

## Как добавить курс

Создать папку в `content/` по правилам из `docs/course-format.md` и обновить
страницу. Пересборка и перезапуск не нужны. Ошибки в файлах курса видны по адресу
`http://localhost:8000/api/health/content`.

## Документы

- `docs/superpowers/specs/2026-09-12-freetraining-v1-design.md` — дизайн-документ
- `docs/course-format.md` — формат курса
```

- [ ] **Step 6: Прогнать всю проверку целиком**

```bash
cd backend && uv run pytest -v && uv run ruff check .
```

Ожидается: все тесты PASSED, замечаний ruff нет.

- [ ] **Step 7: Сверить с критериями готовности**

Проверить вручную при запущенном сервере:

1. Создать папку `content/test-course` с минимальным `course.yaml`, одним модулем и уроком; обновить `GET /api/courses` — курс появился без перезапуска. Удалить папку.
2. `GET /api/health/content` показывает ошибки понятным текстом (уже проверено в Step 3).
3. `GET /api/courses/python-basics/quizzes/01-introduction` не содержит полей `answer` и `explanation`.
4. Отправить попытку, перезапустить сервер, вызвать `GET /api/progress/attempts/python-basics` — попытка на месте.
5. `GET /api/progress/export` возвращает JSON со всеми тремя разделами.

- [ ] **Step 8: Коммит**

```bash
git add content README.md docs/course-format.md
git commit -m "feat: первый курс, документация формата и запуска"
```

---

## Проверка плана на полноту

Разделы спецификации и задачи, которые их реализуют:

| Раздел спецификации | Задачи |
| --- | --- |
| 4.1-4.3 Формат курса на диске | 2, 3, 13 |
| 4.4 Валидация содержимого | 2, 3, 12 |
| 5.1 Три таблицы | 4 |
| 5.2 Вычисляемые величины | 7 |
| 6.1 Чтение содержимого | 8, 9, 10, 12 |
| 6.2 Запись прогресса | 10, 11 |
| Правильные ответы не покидают сервер | 10 |
| 10 Критерии готовности | 13 |

Разделы 7 (фронтенд) и 8 (дизайн-система) в этот план не входят — они составят
второй план, который пишется после выполнения этого.
