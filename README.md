# FreeTraining

Личная платформа для обучения по курсам, созданным ИИ. Курс — папка с файлами,
прогресс и результаты тестов хранятся в PostgreSQL, сессии входа — в Redis.

## Требования

- Docker
- Python 3.12 и uv

## Запуск

Поднять базу данных и Redis:

```bash
docker compose up -d
```

Создать `backend/.env` из примера и задать секрет для подписи токенов:

```bash
cd backend
cp .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Полученную строку записать в `JWT_SECRET`. Без неё бэкенд не запустится.

Запустить бэкенд:

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Документация API открывается по адресу `http://localhost:8000/docs`.

## Запуск фронтенда

```bash
cd frontend
npm install
npm run dev
```

Интерфейс открывается на `http://localhost:5173`. Обращения к `/api` проксируются
на бэкенд, поэтому он должен быть запущен.

Проверка:

```bash
cd frontend
npm run test -- --run
npm run typecheck
```

Типы данных API порождаются из схемы бэкенда и не пишутся руками. После изменения
схемы, при запущенном бэкенде:

```bash
cd frontend
npm run api:types
```

## Аккаунты

Курсы проходятся и без входа: прогресс гостя хранится по cookie этого браузера.
При регистрации он переносится в аккаунт сразу, при входе в существующий
аккаунт приложение спрашивает, переносить ли его. Отзывы оставляют только
вошедшие пользователи.

Прогресс, накопленный до появления аккаунтов (пользователь `local`),
переносится в аккаунт один раз после регистрации:

```bash
cd backend
uv run python -m app.cli claim-local --email you@example.com
```

## Дизайн

Все значения оформления заданы в `frontend/src/styles/tokens.css` — это
единственное место, где их правят. Живой каталог компонентов открывается по
адресу `http://localhost:5173/design`, правила словами — в
`docs/design-system.md`.

## Проверка

```bash
cd backend
uv run pytest
uv run ruff check .
```

Тесты используют отдельную базу `freetraining_test`, которая создаётся при первом
запуске контейнера, и базу Redis номер 15.

## Как добавить курс

Создать папку в `content/` и обновить страницу. Пересборка и перезапуск не нужны.
Ошибки в файлах курса видны по адресу `http://localhost:8000/api/health/content`
и на странице `/health` в интерфейсе.

Проще всего собрать курс через ИИ: приложите к запросу файл
`docs/course-create-prompt.md` целиком вместе с темой и пожеланиями. Кроме
формата, в нём описаны требования к содержанию — глубина, актуальность, таблицы
и схемы, домашние задания, нарастающая сложность тестов — и порядок работы:
сначала план на согласование, потом модуль за модулем.

Если правите курс руками, технический справочник формата — `docs/course-format.md`.

## Документы

- `docs/superpowers/specs/2026-09-12-freetraining-v1-design.md` — дизайн-документ
- `docs/superpowers/specs/2026-09-17-course-reviews-design.md` — оценки и отзывы курсов
- `docs/superpowers/specs/2026-09-17-accounts-design.md` — аккаунты, сессии и гостевой прогресс
- `docs/course-create-prompt.md` — промпт для сборки курса через ИИ
- `docs/course-format.md` — технический справочник формата
- `docs/design-system.md` — правила оформления

## Деплой

Сайт работает на `https://learningfree.ru` (сервер `root@85.235.205.47`, папка
`/opt/freetraining`). В Docker крутятся PostgreSQL, Redis и бэкенд; собранный
фронтенд раздаёт Caddy, установленный на хосте, он же выпускает HTTPS-сертификат.
Файлы деплоя лежат в `deploy/`.

Выложить текущую версию (фронтенд собирается локально):

```bash
./deploy/deploy.sh
```

Обновить только курсы, без пересборки:

```bash
./deploy/deploy.sh content
```

Секреты (`POSTGRES_PASSWORD`, `JWT_SECRET`) хранятся только на сервере в
`/opt/freetraining/deploy/.env`, образец — `deploy/.env.example`. Сайт подключён
к Caddy строкой `import /opt/freetraining/deploy/Caddyfile` в `/etc/caddy/Caddyfile`.
