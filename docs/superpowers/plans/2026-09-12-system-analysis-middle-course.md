# Курс «Системный аналитик уровня Middle» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в каталог бесплатный подробный курс для системного аналитика уровня middle со сквозным кейсом сервиса онлайн-записи.

**Architecture:** Курс — самодостаточная папка `content/system-analysis-middle/`. Восемь упорядоченных модулей раскрывают цикл работы аналитика: от выявления потребности до приёмки; системный дизайн встроен перед API и интеграциями. Каждый модуль содержит 2–3 коротких практических урока и тест, а общие справочные материалы и итоговый экзамен лежат в корне курса.

**Tech Stack:** Markdown, YAML, существующий загрузчик контента на Python/Pydantic.

**Spec:** Согласованный пользователем план в текущем диалоге от 2026-09-12.

## Global Constraints

- Идентификатор курса: `system-analysis-middle`; отображаемые тексты — на русском языке.
- Урок начинается ровно с одного заголовка первого уровня.
- Теория должна быть конкретной: правила, таблицы, Markdown-схемы, антипримеры и решения на сквозном кейсе вместо общих рассуждений.
- Содержимое опирается на действующие стандарты: BABOK/IIBA, BPMN 2.0.2/OMG и OpenAPI 3.1.
- В каждом `quiz.yaml` и `exam.yaml` правильные варианты должны буквально присутствовать в `options`; проходной балл — 70.
- Не изменять существующие пользовательские файлы `backend/app/main.py` и `.claude/`.

---

### Task 1: Каркас курса и рабочий контекст

**Files:**
- Create: `content/system-analysis-middle/course.yaml`
- Create: `content/system-analysis-middle/01-role-and-delivery/module.yaml`
- Create: `content/system-analysis-middle/02-requirements/module.yaml`
- Create: `content/system-analysis-middle/03-processes/module.yaml`
- Create: `content/system-analysis-middle/04-data/module.yaml`
- Create: `content/system-analysis-middle/05-system-design/module.yaml`
- Create: `content/system-analysis-middle/06-api/module.yaml`
- Create: `content/system-analysis-middle/07-integrations-and-quality/module.yaml`
- Create: `content/system-analysis-middle/08-team-and-acceptance/module.yaml`

**Interfaces:**
- Consumes: Формат из `docs/course-format.md`.
- Produces: Валидная структура, в которую следующие задачи добавляют уроки и тесты.

- [ ] **Step 1: Создать YAML-метаданные**

Записать заголовок «Системный аналитик уровня Middle: практика проектирования систем», описание со сквозным кейсом, теги `system-analysis`, `requirements`, `bpmn`, `api`, `system-design` и уровень `intermediate`. Дать каждому модулю русское название из его темы.

- [ ] **Step 2: Проверить, что пока ожидаемо нет уроков**

Run: `cd backend && uv run python -c "from pathlib import Path; from app.content.loader import load_course; load_course(Path('../content/system-analysis-middle'))"`
Expected: FAIL с ошибкой о модуле без уроков; это подтверждает, что загрузчик читает созданный каталог.

### Task 2: Роль аналитика и требования

**Files:**
- Create: `content/system-analysis-middle/01-role-and-delivery/01-role-and-artifacts.md`
- Create: `content/system-analysis-middle/01-role-and-delivery/02-change-lifecycle.md`
- Create: `content/system-analysis-middle/01-role-and-delivery/quiz.yaml`
- Create: `content/system-analysis-middle/02-requirements/01-elicitation.md`
- Create: `content/system-analysis-middle/02-requirements/02-specification.md`
- Create: `content/system-analysis-middle/02-requirements/03-prioritization-and-traceability.md`
- Create: `content/system-analysis-middle/02-requirements/quiz.yaml`

**Interfaces:**
- Consumes: Сквозной кейс сервиса онлайн-записи.
- Produces: Карта стейкхолдеров, набор требований, критерии приёмки и матрица трассировки, используемые в последующих уроках.

- [ ] **Step 1: Написать пять уроков**

Показать границы ответственности, путь изменения, интервью и воркшоп, distinction функциональных/NFR/бизнес-правил, user story/use case/acceptance criteria, MoSCoW и трассировку. Для каждого решения дать пример из записи на приём и антипример с исправлением.

- [ ] **Step 2: Добавить два теста**

В каждом `quiz.yaml` добавить 5 вопросов: минимум один с несколькими ответами, проверяющий применение понятия, а не запоминание термина.

### Task 3: Процессы и данные

**Files:**
- Create: `content/system-analysis-middle/03-processes/01-as-is-to-be.md`
- Create: `content/system-analysis-middle/03-processes/02-bpmn-basics.md`
- Create: `content/system-analysis-middle/03-processes/03-bpmn-review.md`
- Create: `content/system-analysis-middle/03-processes/quiz.yaml`
- Create: `content/system-analysis-middle/04-data/01-domain-and-er-model.md`
- Create: `content/system-analysis-middle/04-data/02-relational-data-and-sql.md`
- Create: `content/system-analysis-middle/04-data/03-data-quality-and-dictionary.md`
- Create: `content/system-analysis-middle/04-data/quiz.yaml`

**Interfaces:**
- Consumes: Требования и правила из Task 2.
- Produces: BPMN-описание процесса, логическая модель данных и запросы для проверки правил.

- [ ] **Step 1: Написать уроки по BPMN**

Объяснить AS-IS/TO-BE, start/end/intermediate events, tasks, gateways, pools/lanes и message flow. Дать Markdown-схемы основного и отменённого бронирования, а также чек-лист ревью диаграммы.

- [ ] **Step 2: Написать уроки по данным**

Построить ER-модель для клиента, слота, записи, услуги и статуса. Разобрать PK/FK, кардинальность, нормализацию без академической перегрузки, data dictionary, `SELECT`, `JOIN`, `GROUP BY` и проверку дубликатов.

- [ ] **Step 3: Добавить тесты модулей**

Сделать по 5 вопросов на модуль, включая выбор корректного BPMN-шлюза, связи сущностей и результата SQL-запроса.

### Task 4: Основы системного дизайна

**Files:**
- Create: `content/system-analysis-middle/05-system-design/01-architecture-decisions.md`
- Create: `content/system-analysis-middle/05-system-design/02-c4-containers-and-components.md`
- Create: `content/system-analysis-middle/05-system-design/03-data-storage-and-cache.md`
- Create: `content/system-analysis-middle/05-system-design/quiz.yaml`

**Interfaces:**
- Consumes: Процесс, модель данных и нагрузочные предположения из предыдущих модулей.
- Produces: Обоснованный вариант архитектуры, C4 Container/Component схемы и решения по БД/кэшу.

- [ ] **Step 1: Описать архитектурные решения**

Сравнить модульный монолит и микросервисы по развёртыванию, транзакциям, связности, наблюдаемости и стоимости владения. Дать правило: начинать с модульного монолита при неопределённости; выделять сервис при независимой бизнес-границе и реальной потребности в независимом масштабировании или выпуске. Отдельно перечислить ситуации, в которых микросервисы — ошибка.

- [ ] **Step 2: Описать C4**

Показать отличие контекста, Container и Component; детально разобрать только Container/Component. Добавить Markdown-схему контейнеров сервиса записи и схему компонентов backend-приложения, с обязанностями и границами каждого блока.

- [ ] **Step 3: Описать данные и кэш**

Сравнить SQL и NoSQL по целостности, запросам, схеме, масштабированию и согласованности. На кейсе выбрать PostgreSQL для записей, Redis для временных данных. Разобрать cache-aside, TTL, инвалидацию, cache stampede и запрет кэшировать критичный остаток мест без продуманной согласованности.

- [ ] **Step 4: Добавить тест**

Сделать 6 вопросов, проверяющих выбор монолита/микросервисов, уровня C4, типа хранилища и стратегии кэширования.

### Task 5: API и интеграции

**Files:**
- Create: `content/system-analysis-middle/06-api/01-rest-contract.md`
- Create: `content/system-analysis-middle/06-api/02-openapi.md`
- Create: `content/system-analysis-middle/06-api/03-api-errors-and-evolution.md`
- Create: `content/system-analysis-middle/06-api/quiz.yaml`
- Create: `content/system-analysis-middle/07-integrations-and-quality/01-sync-and-async.md`
- Create: `content/system-analysis-middle/07-integrations-and-quality/02-events-and-reliability.md`
- Create: `content/system-analysis-middle/07-integrations-and-quality/03-nfr-and-observability.md`
- Create: `content/system-analysis-middle/07-integrations-and-quality/quiz.yaml`

**Interfaces:**
- Consumes: C4-контейнеры и модель данных.
- Produces: REST-контракт, OpenAPI-фрагмент, интеграционный сценарий и измеримые NFR.

- [ ] **Step 1: Написать API-уроки**

Покрыть ресурсы, методы, параметры, коды статуса, пагинацию, фильтрацию, идемпотентность, единую ошибку и версионирование. Включить корректный фрагмент OpenAPI 3.1 YAML для создания записи и разбор типичных дефектов контракта.

- [ ] **Step 2: Написать уроки по интеграциям и качеству**

Сравнить sync/async, очередь, событие и webhook. На сценарии подтверждения записи показать sequence diagram, retry, DLQ, идемпотентного потребителя, outbox как средство снижения риска потери события. Сформулировать NFR как измеримые критерии, включая производительность, доступность, аудит и мониторинг.

- [ ] **Step 3: Добавить тесты модулей**

Сделать по 5–6 вопросов на модуль о статусах, контракте, retry, очереди, идемпотентности и измеримости NFR.

### Task 6: Команда, приёмка и финальный практикум

**Files:**
- Create: `content/system-analysis-middle/08-team-and-acceptance/01-backlog-and-refinement.md`
- Create: `content/system-analysis-middle/08-team-and-acceptance/02-acceptance-and-release.md`
- Create: `content/system-analysis-middle/08-team-and-acceptance/03-final-case.md`
- Create: `content/system-analysis-middle/08-team-and-acceptance/quiz.yaml`

**Interfaces:**
- Consumes: Все ранее подготовленные артефакты.
- Produces: Финальное задание, которое собирает требования, схемы, контракт и приёмку в единый пакет.

- [ ] **Step 1: Написать уроки**

Разобрать refinement, декомпозицию, открытые вопросы, журнал решений, взаимодействие с QA и разработкой, UAT, release notes и разбор инцидента. В финальном уроке дать исходные условия изменения — перенос записи — и список конкретных артефактов, которые должен подготовить ученик.

- [ ] **Step 2: Добавить тест**

Сделать 5 вопросов о готовности задачи к разработке, приёмке и способе зафиксировать спорное решение.

### Task 7: Справочные материалы и экзамен

**Files:**
- Create: `content/system-analysis-middle/cheatsheet.md`
- Create: `content/system-analysis-middle/glossary.md`
- Create: `content/system-analysis-middle/exam.yaml`

**Interfaces:**
- Consumes: Термины и правила из всех восьми модулей.
- Produces: Быстрая памятка, точный словарь и итоговая проверка.

- [ ] **Step 1: Создать шпаргалку и глоссарий**

Собрать компактные таблицы: виды требований, BPMN-элементы, HTTP-коды, признаки хорошего API, SQL/NoSQL, стратегии кэширования, интеграции и NFR. В глоссарии дать краткие определения всех неоднозначных терминов.

- [ ] **Step 2: Создать экзамен**

Добавить 15 вопросов по всем модулям: минимум 5 ситуационных и 4 вопроса с несколькими правильными вариантами. Для каждого ответа написать объяснение, связывающее решение с принципом, а не только называющее правильный вариант.

### Task 8: Валидация содержания

**Files:**
- Verify: `content/system-analysis-middle/**`

**Interfaces:**
- Consumes: Полный каталог курса.
- Produces: Курс, который загрузчик принимает без ошибок и предупреждений.

- [ ] **Step 1: Проверить структуру и заголовки**

Run: `find content/system-analysis-middle -type f | sort && rg -L '^# ' content/system-analysis-middle --glob '*.md'`
Expected: В выводе есть все YAML и Markdown-файлы курса; вторая команда не выводит файлов.

- [ ] **Step 2: Загрузить курс напрямую**

Run: `cd backend && uv run python -c "from pathlib import Path; from app.content.loader import load_course; c=load_course(Path('../content/system-analysis-middle')); print(c.title, c.lesson_count, c.quiz_count, bool(c.exam))"`
Expected: Строка с названием курса, 20+ уроками, 8 тестами и `True` для экзамена; исключений нет.

- [ ] **Step 3: Проверить весь каталог и регрессию**

Run: `cd backend && uv run pytest && uv run ruff check .`
Expected: Все тесты проходят, ruff не сообщает нарушений.
