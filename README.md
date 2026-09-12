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
