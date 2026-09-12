# FreeTraining v1.0 — фронтенд. План реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Построить интерфейс платформы: каталог курсов, чтение уроков, прохождение тестов с разбором, отслеживание прогресса и возврат к месту остановки — поверх готового API бэкенда, на единой дизайн-системе с двумя темами.

**Architecture:** Одностраничное приложение на Vite и React. Сервером выступает готовый FastAPI, поэтому серверный рендеринг не нужен: фронтенд — тонкий клиент, который ничего не вычисляет. Прогресс и проверка тестов живут на сервере; локально хранятся только выбранные варианты в текущем тесте и выбранная тема. Все значения оформления заданы токенами в одном файле, компоненты обращаются только к смысловым именам, поэтому смена темы и акцента не затрагивает код компонентов.

**Tech Stack:** Vite, React 19, TypeScript, React Router, TanStack Query, Tailwind CSS 4, react-markdown с remark-gfm и rehype-highlight, lucide-react, Vitest с Testing Library и MSW, openapi-typescript.

**Spec:** `docs/superpowers/specs/2026-09-12-freetraining-v1-design.md` (разделы 7 и 8)

## Global Constraints

- Каталог фронтенда — `frontend/` в корне репозитория. Менеджер пакетов — `npm`, все команды запускаются из `frontend/`.
- Бэкенд уже работает и не меняется. Он слушает `http://localhost:8000`; обращения идут на относительный путь `/api/...`, который Vite проксирует на бэкенд. Прямых адресов с портом в коде быть не должно.
- **Единственное место со значениями оформления — `frontend/src/styles/tokens.css`.** В компонентах не встречается ни одного конкретного цвета, размера шрифта, радиуса или тени: только классы Tailwind, порождённые из токенов, и смысловые CSS-переменные.
- Отступы берутся только из шкалы, кратной четырём: 4, 8, 12, 16, 24, 32, 48, 64. Промежуточных значений не существует.
- Две темы, переключатель в шапке. Тема хранится в `localStorage` под ключом `freetraining-theme` и ставится атрибутом `data-theme` на элемент `html`. Значение по умолчанию — системное.
- Стекло (полупрозрачность с размытием) применяется только к шапке, боковой навигации урока и выдвижной панели. Под текстом урока стекла нет никогда.
- Акцентный цвет — изумрудный. Внутри теста акцентные кнопки не используются: там зелёный означает «верно», красный — «неверно».
- На экране одно акцентное действие, остальные кнопки вторичные.
- У каждого интерактивного элемента описаны наведение, фокус с клавиатуры, нажатие и заблокированное состояние.
- Весь видимый пользователю текст — на русском.
- Типы данных API не пишутся руками: они порождаются из схемы OpenAPI бэкенда в `frontend/src/lib/api/schema.ts` командой `npm run api:types`.
- Проверка перед коммитом: `npm run test -- --run` и `npm run typecheck` проходят без ошибок.
- Сообщения коммитов: `тип: описание на русском`, типы `feat`, `test`, `chore`, `docs`, `fix`.

## Контракт API (точные имена полей)

Бэкенд отдаёт эти структуры; имена полей менять нельзя.

- `CourseSummary`: `id`, `title`, `description`, `tags`, `level`, `module_count`, `lesson_count`, `progress_percent`, `status`, `resume`
- `ResumePosition`: `module_id`, `lesson_id`, `lesson_title`
- `CourseDetail`: поля `CourseSummary` плюс `modules`, `has_cheatsheet`, `has_glossary`, `has_exam`, `exam_passed`, `exam_best_score`
- `ModuleDetail`: `id`, `title`, `lessons`, `has_quiz`, `quiz_passed`, `quiz_best_score`
- `LessonRef`: `id`, `title`, `completed`
- `LessonDetail`: `course_id`, `module_id`, `lesson_id`, `title`, `content`, `completed`, `prev`, `next`
- `StepLink`: `kind` (`lesson` | `quiz` | `exam`), `module_id`, `lesson_id`, `title`
- `PageDetail`: `course_id`, `page`, `title`, `content`
- `QuizPublic`: `course_id`, `scope` (`module` | `exam`), `module_id`, `title`, `pass_score`, `questions`
- `QuizQuestionPublic`: `index`, `question`, `options`, `multiple`
- `QuizSubmission`: `course_id`, `scope`, `module_id`, `answers` (список списков выбранных вариантов)
- `QuizResult`: `attempt_id`, `course_id`, `scope`, `module_id`, `total_questions`, `correct_count`, `score_percent`, `passed`, `pass_score`, `results`, `created_at`
- `QuestionResult`: `question`, `options`, `selected`, `correct_answer`, `is_correct`, `explanation`
- `AttemptSummary`: `id`, `course_id`, `scope`, `module_id`, `total_questions`, `correct_count`, `score_percent`, `passed`, `created_at`, `results`
- `ContentHealth`: `ok`, `course_count`, `errors`, `warnings`; каждая запись — `course_id`, `location`, `message`

Маршруты: `GET /api/courses`, `GET /api/courses/{course}`, `GET /api/courses/{course}/lessons/{module}/{lesson}`, `GET /api/courses/{course}/pages/{page}`, `GET /api/courses/{course}/quizzes/{module}`, `GET /api/courses/{course}/exam`, `POST /api/quizzes/submit`, `POST /api/progress/lessons/{course}/{module}/{lesson}`, `PUT /api/progress/position/{course}`, `GET /api/progress/attempts/{course}`, `DELETE /api/progress/courses/{course}`, `GET /api/progress/export`, `GET /api/health/content`.

## Структура файлов

```
frontend/
  package.json
  vite.config.ts                прокси /api на бэкенд, плагины React и Tailwind
  tsconfig.json
  vitest.setup.ts               подключение Testing Library и MSW
  index.html
  src/
    main.tsx                    точка входа: провайдеры и маршрутизатор
    App.tsx                     общая раскладка и описание маршрутов
    styles/
      tokens.css                ЕДИНСТВЕННОЕ место со значениями оформления
    theme/
      ThemeProvider.tsx         тема, переключатель, хранение выбора
    components/ui/              дизайн-система
      Button.tsx  Card.tsx  Badge.tsx  ProgressBar.tsx  ProgressRing.tsx
      GlassPanel.tsx  Callout.tsx  EmptyState.tsx  Skeleton.tsx
      Breadcrumbs.tsx  Tabs.tsx  ThemeToggle.tsx
    components/
      Layout.tsx                шапка со стеклом и контейнер страницы
      Markdown.tsx              отображение Markdown в оформлении prose
      ModuleTree.tsx            дерево модулей и уроков с отметками
      QueryState.tsx            единая отрисовка загрузки и ошибки
    features/quiz/
      QuizRunner.tsx            прохождение теста и разбор
      AnswerOption.tsx          вариант ответа во всех состояниях
      ResultBanner.tsx          итог попытки
    lib/api/
      schema.ts                 порождённые типы (не править руками)
      types.ts                  короткие псевдонимы типов из schema.ts
      client.ts                 обёртка над fetch с обработкой ошибок
      queries.ts                хуки TanStack Query
    pages/
      HomePage.tsx  CoursePage.tsx  LessonPage.tsx  QuizPage.tsx
      ResultsPage.tsx  DesignPage.tsx  HealthPage.tsx  NotFoundPage.tsx
    test/
      mocks.ts                  образцовые ответы API для тестов
      server.ts                 сервер-перехватчик MSW
      render.tsx                отрисовка с провайдерами для тестов
```

Разделение по назначению: `components/ui` знает только про токены и ничего про предметную область; `lib/api` знает только про HTTP; `pages` собирает экраны из готовых частей и не содержит вычислений.

---

### Task 1: Каркас фронтенда и первый тест

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/index.html`, `frontend/vitest.setup.ts`, `frontend/.gitignore`
- Create: `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/styles/tokens.css`
- Test: `frontend/src/App.test.tsx`

**Interfaces:**
- Consumes: работающий бэкенд на `http://localhost:8000` (запускается отдельно).
- Produces: рабочий каркас с командами `npm run dev`, `npm run build`, `npm run test`, `npm run typecheck`, `npm run api:types`; компонент `App` с маршрутизатором.

- [ ] **Step 1: Создать проект и установить зависимости**

Выполнить из корня репозитория:

```bash
npm create vite@latest frontend -- --template react-ts
```

Затем из `frontend/`:

```bash
npm install react-router @tanstack/react-query react-markdown remark-gfm rehype-highlight lucide-react clsx
npm install -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw openapi-typescript
```

- [ ] **Step 2: Настроить сборку и команды**

Заменить `frontend/vite.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    css: false,
  },
});
```

В `frontend/package.json` заменить блок `scripts` на:

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest",
  "typecheck": "tsc --noEmit",
  "api:types": "openapi-typescript http://localhost:8000/openapi.json -o src/lib/api/schema.ts"
}
```

Создать `frontend/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Написать падающий тест**

Создать `frontend/src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("показывает название платформы в шапке", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("banner")).toHaveTextContent("FreeTraining");
  });

  it("показывает страницу «не найдено» для неизвестного адреса", () => {
    render(
      <MemoryRouter initialEntries={["/такой-страницы-нет"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("Страница не найдена")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Запустить тест и убедиться, что он падает**

```bash
npm run test -- --run src/App.test.tsx
```

Ожидается: падение из-за отсутствующего экспорта `App` или отсутствия шапки.

- [ ] **Step 5: Реализовать каркас**

Заменить `frontend/src/styles/tokens.css` заготовкой (полное наполнение — Задача 2):

```css
@import "tailwindcss";
```

Заменить `frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./App";
import "./styles/tokens.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

Заменить `frontend/src/App.tsx`:

```tsx
import { Route, Routes } from "react-router";

function Placeholder({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

export default function App() {
  return (
    <div>
      <header role="banner">FreeTraining</header>
      <main>
        <Routes>
          <Route path="/" element={<Placeholder title="Главная" />} />
          <Route path="*" element={<Placeholder title="Страница не найдена" />} />
        </Routes>
      </main>
    </div>
  );
}
```

Удалить сгенерированные шаблоном файлы `src/App.css`, `src/index.css`, `src/assets/react.svg`, если они остались.

- [ ] **Step 6: Запустить тест и убедиться, что он проходит**

```bash
npm run test -- --run src/App.test.tsx && npm run typecheck
```

Ожидается: 2 теста PASSED, типы без ошибок.

- [ ] **Step 7: Проверить работу связки с бэкендом**

Поднять базу и бэкенд (из корня `docker compose up -d`, из `backend/` `uv run uvicorn app.main:app --port 8000`), затем из `frontend/`:

```bash
npm run dev
```

Проверить в браузере `http://localhost:5173` — страница открывается. Проверить прокси:

```bash
curl -s http://localhost:5173/api/health/content
```

Ожидается: `{"ok":true,...}` — тот же ответ, что и напрямую от бэкенда. Остановить сервер разработки.

- [ ] **Step 8: Породить типы API**

При запущенном бэкенде, из `frontend/`:

```bash
npm run api:types
```

Ожидается: создан `src/lib/api/schema.ts` с описанием всех маршрутов.

- [ ] **Step 9: Коммит**

```bash
git add frontend
git commit -m "feat: каркас фронтенда на Vite и React с прокси на бэкенд"
```

---

### Task 2: Токены оформления, темы и раскладка

**Files:**
- Modify: `frontend/src/styles/tokens.css`
- Create: `frontend/src/theme/ThemeProvider.tsx`
- Create: `frontend/src/components/ui/ThemeToggle.tsx`
- Create: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/main.tsx`
- Test: `frontend/src/theme/ThemeProvider.test.tsx`

**Interfaces:**
- Consumes: каркас Задачи 1.
- Produces:
  - Смысловые токены в `tokens.css`, порождающие классы Tailwind: `bg-surface`, `bg-raised`, `text-body`, `text-muted`, `border-line`, `bg-accent`, `text-accent`, `bg-success`, `bg-danger` и парные им.
  - `ThemeProvider` и хук `useTheme(): { theme: "light" | "dark"; toggle: () => void }` из `frontend/src/theme/ThemeProvider.tsx`.
  - `ThemeToggle` — кнопка переключения темы.
  - `Layout` — шапка со стеклом и контейнер страницы.

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/theme/ThemeProvider.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";

function Probe() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle}>
      тема: {theme}
    </button>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("по умолчанию берёт светлую тему, когда система её не переопределяет", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("тема: light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("переключает тему и запоминает выбор", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent("тема: dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("freetraining-theme")).toBe("dark");
  });

  it("восстанавливает сохранённый выбор при запуске", () => {
    localStorage.setItem("freetraining-theme", "dark");

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("тема: dark");
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

```bash
npm run test -- --run src/theme/ThemeProvider.test.tsx
```

Ожидается: `Failed to resolve import "./ThemeProvider"`.

- [ ] **Step 3: Написать токены**

Заменить `frontend/src/styles/tokens.css` целиком. Это единственный файл, где встречаются конкретные значения.

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* ---------- Слой 1: примитивы ---------- */
:root {
  --neutral-0: #ffffff;
  --neutral-50: #fafafa;
  --neutral-100: #f4f4f5;
  --neutral-200: #e4e4e7;
  --neutral-300: #d4d4d8;
  --neutral-500: #71717a;
  --neutral-600: #52525b;
  --neutral-700: #3f3f46;
  --neutral-800: #27272a;
  --neutral-900: #18181b;
  --neutral-950: #0b0b0d;

  --emerald-400: #34d399;
  --emerald-500: #10b981;
  --emerald-600: #059669;
  --emerald-700: #047857;

  --red-400: #f87171;
  --red-500: #ef4444;
  --red-600: #dc2626;

  --amber-500: #f59e0b;
}

/* ---------- Слой 2: смысловые токены, светлая тема ---------- */
:root {
  --surface: var(--neutral-50);
  --raised: var(--neutral-0);
  --sunken: var(--neutral-100);

  --text: var(--neutral-900);
  --text-muted: var(--neutral-600);
  --text-subtle: var(--neutral-500);
  --text-on-accent: var(--neutral-0);

  --line: var(--neutral-200);
  --line-strong: var(--neutral-300);

  --accent: var(--emerald-600);
  --accent-hover: var(--emerald-700);
  --accent-soft: color-mix(in srgb, var(--emerald-500) 12%, transparent);

  --success: var(--emerald-600);
  --success-soft: color-mix(in srgb, var(--emerald-500) 12%, transparent);
  --danger: var(--red-600);
  --danger-soft: color-mix(in srgb, var(--red-500) 12%, transparent);
  --warning: var(--amber-500);

  --ring: color-mix(in srgb, var(--emerald-500) 55%, transparent);

  --glass-bg: color-mix(in srgb, var(--neutral-0) 72%, transparent);
  --glass-line: color-mix(in srgb, var(--neutral-900) 8%, transparent);
  --glass-blur: 20px;

  --shadow-soft: 0 1px 2px rgb(0 0 0 / 4%), 0 4px 12px rgb(0 0 0 / 6%);
  --shadow-lift: 0 2px 4px rgb(0 0 0 / 5%), 0 12px 28px rgb(0 0 0 / 10%);
  --top-light: transparent;
}

/* ---------- Слой 2: смысловые токены, тёмная тема ---------- */
[data-theme="dark"] {
  --surface: var(--neutral-950);
  --raised: var(--neutral-900);
  --sunken: var(--neutral-800);

  --text: var(--neutral-100);
  --text-muted: var(--neutral-300);
  --text-subtle: var(--neutral-500);
  --text-on-accent: var(--neutral-950);

  --line: var(--neutral-800);
  --line-strong: var(--neutral-700);

  --accent: var(--emerald-400);
  --accent-hover: var(--emerald-500);
  --accent-soft: color-mix(in srgb, var(--emerald-400) 16%, transparent);

  --success: var(--emerald-400);
  --success-soft: color-mix(in srgb, var(--emerald-400) 16%, transparent);
  --danger: var(--red-400);
  --danger-soft: color-mix(in srgb, var(--red-400) 16%, transparent);
  --warning: var(--amber-500);

  --ring: color-mix(in srgb, var(--emerald-400) 55%, transparent);

  --glass-bg: color-mix(in srgb, var(--neutral-900) 62%, transparent);
  --glass-line: color-mix(in srgb, var(--neutral-0) 10%, transparent);

  --shadow-soft: 0 1px 2px rgb(0 0 0 / 40%);
  --shadow-lift: 0 12px 32px rgb(0 0 0 / 50%);
  /* В тёмной теме тени не читаются: глубину даёт светлая грань сверху */
  --top-light: inset 0 1px 0 rgb(255 255 255 / 6%);
}

/* ---------- Слой 3: связь токенов с Tailwind ---------- */
@theme inline {
  --color-surface: var(--surface);
  --color-raised: var(--raised);
  --color-sunken: var(--sunken);
  --color-body: var(--text);
  --color-muted: var(--text-muted);
  --color-subtle: var(--text-subtle);
  --color-on-accent: var(--text-on-accent);
  --color-line: var(--line);
  --color-line-strong: var(--line-strong);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-soft: var(--accent-soft);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-warning: var(--warning);
  --color-ring: var(--ring);

  --radius-control: 10px;
  --radius-card: 14px;
  --radius-panel: 20px;

  --shadow-soft: var(--shadow-soft);
  --shadow-lift: var(--shadow-lift);

  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter",
    "Segoe UI", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;

  --text-reading: 1.125rem;
  --text-reading--line-height: 1.7;
}

/* ---------- Основа ---------- */
html {
  color-scheme: light;
}

[data-theme="dark"] {
  color-scheme: dark;
}

body {
  margin: 0;
  background-color: var(--surface);
  color: var(--text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* ---------- Стекло: только шапка, навигация, выдвижная панель ---------- */
@utility glass {
  /* Запасной вариант идёт первым: без поддержки размытия остаётся плотный фон */
  background-color: var(--raised);
  border-color: var(--glass-line);
  box-shadow: var(--top-light);

  @supports (backdrop-filter: blur(1px)) {
    background-color: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur)) saturate(180%);
  }
}

/* ---------- Оформление текста урока ---------- */
@utility prose-lesson {
  color: var(--text);
  font-size: var(--text-reading);
  line-height: 1.7;
  max-width: 68ch;

  & h1 {
    font-size: 1.875rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    margin-block: 0 24px;
  }
  & h2 {
    font-size: 1.375rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin-block: 48px 16px;
  }
  & h3 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-block: 32px 12px;
  }
  & p {
    margin-block: 0 24px;
  }
  & ul,
  & ol {
    margin-block: 0 24px;
    padding-inline-start: 24px;
  }
  & li {
    margin-block: 8px;
  }
  & li::marker {
    color: var(--text-subtle);
  }
  & a {
    color: var(--accent);
    text-underline-offset: 3px;
  }
  & strong {
    font-weight: 650;
  }
  & blockquote {
    margin-block: 0 24px;
    padding-inline-start: 16px;
    border-inline-start: 3px solid var(--line-strong);
    color: var(--text-muted);
  }
  & code {
    font-family: var(--font-mono);
    font-size: 0.9em;
    background-color: var(--sunken);
    border-radius: 6px;
    padding: 2px 6px;
  }
  & pre {
    margin-block: 0 24px;
    padding: 16px;
    border-radius: var(--radius-card);
    background-color: var(--sunken);
    border: 1px solid var(--line);
    overflow-x: auto;
  }
  & pre code {
    background-color: transparent;
    padding: 0;
    font-size: 0.875rem;
    line-height: 1.6;
  }
  & table {
    width: 100%;
    margin-block: 0 24px;
    border-collapse: collapse;
    font-size: 1rem;
  }
  & th,
  & td {
    text-align: start;
    padding: 8px 12px;
    border-bottom: 1px solid var(--line);
  }
  & th {
    font-weight: 600;
    color: var(--text-muted);
  }
  & img {
    max-width: 100%;
    border-radius: var(--radius-card);
  }
}

/* ---------- Подсветка кода: те же токены, без внешней темы ---------- */
.hljs-comment,
.hljs-quote {
  color: var(--text-subtle);
  font-style: italic;
}
.hljs-keyword,
.hljs-selector-tag,
.hljs-literal,
.hljs-built_in {
  color: var(--accent);
}
.hljs-string,
.hljs-attr,
.hljs-addition {
  color: var(--success);
}
.hljs-number,
.hljs-symbol,
.hljs-deletion {
  color: var(--danger);
}
.hljs-title,
.hljs-section,
.hljs-name {
  color: var(--text);
  font-weight: 600;
}
.hljs-meta,
.hljs-type,
.hljs-params {
  color: var(--text-muted);
}
```

- [ ] **Step 4: Реализовать тему**

Создать `frontend/src/theme/ThemeProvider.tsx`:

```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "freetraining-theme";

type ThemeContextValue = { theme: Theme; toggle: () => void };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // приватный режим браузера — выбор просто не сохранится
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error("useTheme используется вне ThemeProvider");
  }
  return value;
}
```

- [ ] **Step 5: Запустить тест и убедиться, что он проходит**

```bash
npm run test -- --run src/theme/ThemeProvider.test.tsx
```

Ожидается: 3 теста PASSED. Если в окружении тестов нет `window.matchMedia`, добавить его заглушку в `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
```

- [ ] **Step 6: Реализовать переключатель и раскладку**

Создать `frontend/src/components/ui/ThemeToggle.tsx`:

```tsx
import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === "light" ? "Включить тёмную тему" : "Включить светлую тему";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-control border border-line
        text-muted transition-colors duration-150 hover:bg-sunken hover:text-body
        active:scale-95 focus-visible:text-body"
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
```

Создать `frontend/src/components/Layout.tsx`:

```tsx
import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { ThemeToggle } from "./ui/ThemeToggle";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-body">
      <header
        role="banner"
        className="glass sticky top-0 z-50 border-b border-line"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-semibold tracking-tight
              transition-opacity duration-150 hover:opacity-80"
          >
            <GraduationCap size={20} className="text-accent" />
            FreeTraining
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 7: Подключить тему и раскладку**

Заменить `frontend/src/App.tsx`:

```tsx
import { Route, Routes } from "react-router";

import { Layout } from "./components/Layout";

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Placeholder title="Главная" />} />
        <Route path="*" element={<Placeholder title="Страница не найдена" />} />
      </Routes>
    </Layout>
  );
}
```

Обернуть приложение в `ThemeProvider` в `frontend/src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./styles/tokens.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
```

Тест `src/App.test.tsx` из Задачи 1 использует `App` без провайдера темы, а `Layout` содержит `ThemeToggle`, которому нужен контекст. Обернуть отрисовку в тесте в `ThemeProvider`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("App", () => {
  it("показывает название платформы в шапке", () => {
    renderAt("/");
    expect(screen.getByRole("banner")).toHaveTextContent("FreeTraining");
  });

  it("показывает страницу «не найдено» для неизвестного адреса", () => {
    renderAt("/такой-страницы-нет");
    expect(screen.getByText("Страница не найдена")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Проверить всё и убедиться глазами**

```bash
npm run test -- --run && npm run typecheck
```

Ожидается: 5 тестов PASSED, типы без ошибок.

Затем `npm run dev` и проверить в браузере: шапка полупрозрачная с размытием при прокрутке, переключатель меняет тему, выбор сохраняется после перезагрузки страницы. Остановить сервер.

- [ ] **Step 9: Коммит**

```bash
git add frontend
git commit -m "feat: токены оформления, две темы и общая раскладка"
```

---

### Task 3: Компоненты дизайн-системы

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `ProgressBar.tsx`, `ProgressRing.tsx`, `GlassPanel.tsx`, `Callout.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `Breadcrumbs.tsx`, `Tabs.tsx`
- Test: `frontend/src/components/ui/ui.test.tsx`

**Interfaces:**
- Consumes: токены Задачи 2.
- Produces:
  - `Button({ variant?: "primary" | "secondary" | "ghost" | "danger", size?: "sm" | "md" | "lg", ...button })`
  - `Card({ as?, className?, children })`, `CardBody`, `CardTitle`
  - `Badge({ tone?: "neutral" | "accent" | "success" | "danger" | "warning", children })`
  - `ProgressBar({ value: number, label?: string })` — значение в процентах
  - `ProgressRing({ value: number, size?: number })`
  - `GlassPanel({ className?, children })`
  - `Callout({ tone?: "info" | "success" | "danger" | "warning", title?, children })`
  - `EmptyState({ icon?, title, description?, action? })`
  - `Skeleton({ className? })`
  - `Breadcrumbs({ items: { label: string; to?: string }[] })`
  - `Tabs({ items: { id: string; label: string }[], active: string, onChange: (id: string) => void })`

Ни один из этих компонентов не знает про курсы, уроки и тесты: они оперируют только оформлением.

- [ ] **Step 1: Написать падающие тесты**

Создать `frontend/src/components/ui/ui.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { Badge } from "./Badge";
import { Breadcrumbs } from "./Breadcrumbs";
import { Button } from "./Button";
import { Callout } from "./Callout";
import { Card, CardTitle } from "./Card";
import { EmptyState } from "./EmptyState";
import { ProgressBar } from "./ProgressBar";
import { ProgressRing } from "./ProgressRing";
import { Tabs } from "./Tabs";

describe("Button", () => {
  it("вызывает обработчик нажатия", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Продолжить</Button>);

    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("не вызывает обработчик, когда заблокирована", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Продолжить
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("ProgressBar", () => {
  it("сообщает значение вспомогательным технологиям", () => {
    render(<ProgressBar value={40} label="Прогресс курса" />);

    const bar = screen.getByRole("progressbar", { name: "Прогресс курса" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });

  it("ограничивает значение диапазоном от нуля до ста", () => {
    render(<ProgressBar value={140} label="Прогресс курса" />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("ProgressRing", () => {
  it("показывает округлённый процент", () => {
    render(<ProgressRing value={66.6} />);

    expect(screen.getByText("67%")).toBeInTheDocument();
  });
});

describe("Badge, Card, Callout, EmptyState", () => {
  it("отображают переданное содержимое", () => {
    render(
      <>
        <Badge tone="success">Пройден</Badge>
        <Card>
          <CardTitle>Основы Python</CardTitle>
        </Card>
        <Callout tone="danger" title="Ошибка">
          Что-то пошло не так
        </Callout>
        <EmptyState title="Курсов пока нет" description="Положите папку в content" />
      </>,
    );

    expect(screen.getByText("Пройден")).toBeInTheDocument();
    expect(screen.getByText("Основы Python")).toBeInTheDocument();
    expect(screen.getByText("Ошибка")).toBeInTheDocument();
    expect(screen.getByText("Что-то пошло не так")).toBeInTheDocument();
    expect(screen.getByText("Курсов пока нет")).toBeInTheDocument();
  });
});

describe("Breadcrumbs", () => {
  it("делает ссылкой всё, кроме последнего звена", () => {
    render(
      <MemoryRouter>
        <Breadcrumbs
          items={[
            { label: "Курсы", to: "/" },
            { label: "Основы Python", to: "/courses/python-basics" },
            { label: "Переменные" },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Курсы" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Переменные" })).not.toBeInTheDocument();
  });
});

describe("Tabs", () => {
  it("помечает активную вкладку и сообщает о переключении", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        items={[
          { id: "modules", label: "Модули" },
          { id: "cheatsheet", label: "Шпаргалка" },
        ]}
        active="modules"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("tab", { name: "Модули" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("tab", { name: "Шпаргалка" }));

    expect(onChange).toHaveBeenCalledWith("cheatsheet");
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
npm run test -- --run src/components/ui/ui.test.tsx
```

Ожидается: ошибки разрешения импортов — модулей ещё нет.

- [ ] **Step 3: Реализовать компоненты**

Создать `frontend/src/components/ui/Button.tsx`:

```tsx
import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover shadow-soft",
  secondary: "bg-raised text-body border border-line hover:bg-sunken",
  ghost: "text-muted hover:bg-sunken hover:text-body",
  danger: "bg-danger text-on-accent hover:opacity-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center rounded-control font-medium",
        "transition-[background-color,color,opacity,transform] duration-150",
        "active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  );
}
```

Создать `frontend/src/components/ui/Card.tsx`:

```tsx
import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-card border border-line bg-raised shadow-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={clsx("p-6", className)}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-base font-semibold tracking-tight text-body">{children}</h3>
  );
}
```

Создать `frontend/src/components/ui/Badge.tsx`:

```tsx
import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "success" | "danger" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "bg-sunken text-muted",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-sunken text-warning",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
```

Создать `frontend/src/components/ui/ProgressBar.tsx`:

```tsx
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-[250ms]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
```

Создать `frontend/src/components/ui/ProgressRing.tsx`:

```tsx
export function ProgressRing({ value, size = 56 }: { value: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-sunken"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-accent transition-[stroke-dashoffset] duration-[250ms]"
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums">{clamped}%</span>
    </div>
  );
}
```

Создать `frontend/src/components/ui/GlassPanel.tsx`:

```tsx
import clsx from "clsx";
import type { ReactNode } from "react";

export function GlassPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("glass rounded-panel border border-line", className)}>
      {children}
    </div>
  );
}
```

Создать `frontend/src/components/ui/Callout.tsx`:

```tsx
import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "info" | "success" | "danger" | "warning";

const TONES: Record<Tone, { box: string; icon: typeof Info }> = {
  info: { box: "bg-sunken text-body", icon: Info },
  success: { box: "bg-success-soft text-body", icon: CheckCircle2 },
  danger: { box: "bg-danger-soft text-body", icon: XCircle },
  warning: { box: "bg-sunken text-body", icon: AlertTriangle },
};

const ICON_TONES: Record<Tone, string> = {
  info: "text-subtle",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
};

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
}) {
  const Icon = TONES[tone].icon;

  return (
    <div className={clsx("flex gap-3 rounded-card p-4", TONES[tone].box)}>
      <Icon size={18} className={clsx("mt-0.5 shrink-0", ICON_TONES[tone])} />
      <div className="min-w-0 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-muted">{children}</div> : null}
      </div>
    </div>
  );
}
```

Создать `frontend/src/components/ui/EmptyState.tsx`:

```tsx
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed
      border-line px-6 py-16 text-center">
      <p className="text-base font-semibold tracking-tight">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
```

Создать `frontend/src/components/ui/Skeleton.tsx`:

```tsx
import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx("animate-pulse rounded-control bg-sunken", className)}
    />
  );
}
```

Создать `frontend/src/components/ui/Breadcrumbs.tsx`:

```tsx
import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router";

export type Crumb = { label: string; to?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-1
      text-sm text-muted">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={`${item.label}-${index}`}>
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="transition-colors duration-150 hover:text-body"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-body" : undefined}>{item.label}</span>
            )}
            {isLast ? null : (
              <ChevronRight size={14} className="text-subtle" aria-hidden="true" />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
```

Создать `frontend/src/components/ui/Tabs.tsx`:

```tsx
import clsx from "clsx";

export type TabItem = { id: string; label: string };

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-line">
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={clsx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150",
              selected
                ? "border-accent text-body"
                : "border-transparent text-muted hover:text-body",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Запустить тесты и убедиться, что они проходят**

```bash
npm run test -- --run src/components/ui/ui.test.tsx && npm run typecheck
```

Ожидается: 8 тестов PASSED, типы без ошибок.

- [ ] **Step 5: Коммит**

```bash
git add frontend/src/components/ui
git commit -m "feat: компоненты дизайн-системы на токенах"
```

---

### Task 4: Живой каталог дизайн-системы и документ правил

**Files:**
- Create: `frontend/src/pages/DesignPage.tsx`
- Create: `docs/design-system.md`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/pages/DesignPage.test.tsx`

**Interfaces:**
- Consumes: все компоненты Задачи 3, токены Задачи 2.
- Produces: страница по адресу `/design`, показывающая токены и все компоненты во всех состояниях; документ правил, по которому достраиваются новые экраны.

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/pages/DesignPage.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "../theme/ThemeProvider";
import { DesignPage } from "./DesignPage";

function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <DesignPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("DesignPage", () => {
  it("показывает все разделы каталога", () => {
    renderPage();

    for (const section of [
      "Цвет",
      "Типографика",
      "Пространство",
      "Скругления и глубина",
      "Стекло",
      "Компоненты",
    ]) {
      expect(screen.getByRole("heading", { name: section })).toBeInTheDocument();
    }
  });

  it("показывает кнопки во всех состояниях, включая заблокированное", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Основная" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Заблокирована" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

```bash
npm run test -- --run src/pages/DesignPage.test.tsx
```

Ожидается: `Failed to resolve import "./DesignPage"`.

- [ ] **Step 3: Реализовать страницу**

Создать `frontend/src/pages/DesignPage.tsx`:

```tsx
import type { ReactNode } from "react";

import { Badge } from "../components/ui/Badge";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { Card, CardBody, CardTitle } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassPanel } from "../components/ui/GlassPanel";
import { ProgressBar } from "../components/ui/ProgressBar";
import { ProgressRing } from "../components/ui/ProgressRing";
import { Skeleton } from "../components/ui/Skeleton";
import { Tabs } from "../components/ui/Tabs";

const COLORS = [
  ["surface", "Фон страницы"],
  ["raised", "Приподнятая поверхность"],
  ["sunken", "Утопленная поверхность"],
  ["accent", "Акцент"],
  ["success", "Верно"],
  ["danger", "Неверно"],
  ["line", "Граница"],
] as const;

const SPACE = [4, 8, 12, 16, 24, 32, 48, 64];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="mb-6 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-3">
      <span className="w-40 shrink-0 text-sm text-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function DesignPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Дизайн-система</h1>
        <p className="max-w-2xl text-sm text-muted">
          Всё оформление задано в одном файле — <code>src/styles/tokens.css</code>.
          Компоненты обращаются только к смысловым именам, поэтому смена темы или
          акцента не затрагивает их код. Правила словами — в{" "}
          <code>docs/design-system.md</code>.
        </p>
      </header>

      <Section title="Цвет">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {COLORS.map(([token, label]) => (
            <div key={token} className="flex flex-col gap-2">
              <div
                className="h-16 rounded-card border border-line"
                style={{ backgroundColor: `var(--${token})` }}
              />
              <div className="text-xs">
                <p className="font-medium">{label}</p>
                <p className="font-mono text-subtle">--{token}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Типографика">
        <div className="flex flex-col gap-3">
          <p className="text-3xl font-semibold tracking-tight">Заголовок страницы</p>
          <p className="text-xl font-semibold tracking-tight">Заголовок раздела</p>
          <p className="text-base">Обычный текст интерфейса</p>
          <p className="text-reading max-w-prose">
            Текст урока набирается крупнее интерфейсного и с большим межстрочным
            интервалом: читать его приходится долго, и именно ради этого чтения
            платформа существует.
          </p>
          <p className="text-sm text-muted">Второстепенный текст</p>
          <p className="font-mono text-sm">const answer = 42;</p>
        </div>
      </Section>

      <Section title="Пространство">
        <div className="flex flex-wrap items-end gap-4">
          {SPACE.map((step) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className="bg-accent-soft"
                style={{ width: step, height: step }}
              />
              <span className="font-mono text-xs text-subtle">{step}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Скругления и глубина">
        <div className="flex flex-wrap gap-4">
          <div className="flex h-20 w-32 items-center justify-center rounded-control
            border border-line bg-raised text-xs text-muted">
            control 10px
          </div>
          <div className="flex h-20 w-32 items-center justify-center rounded-card
            bg-raised text-xs text-muted shadow-soft">
            card 14px
          </div>
          <div className="flex h-20 w-32 items-center justify-center rounded-panel
            bg-raised text-xs text-muted shadow-lift">
            panel 20px
          </div>
        </div>
      </Section>

      <Section title="Стекло">
        <div className="relative overflow-hidden rounded-card">
          <div className="grid grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 bg-accent-soft odd:bg-sunken" />
            ))}
          </div>
          <GlassPanel className="absolute inset-x-6 top-6 p-4 text-sm">
            Стекло применяется только к шапке, навигации урока и выдвижной панели.
            Под текстом урока его нет никогда.
          </GlassPanel>
        </div>
      </Section>

      <Section title="Компоненты">
        <div className="flex flex-col divide-y divide-line">
          <Row label="Кнопки">
            <Button>Основная</Button>
            <Button variant="secondary">Вторичная</Button>
            <Button variant="ghost">Прозрачная</Button>
            <Button variant="danger">Опасная</Button>
            <Button disabled>Заблокирована</Button>
          </Row>
          <Row label="Размеры кнопок">
            <Button size="sm">Маленькая</Button>
            <Button size="md">Средняя</Button>
            <Button size="lg">Большая</Button>
          </Row>
          <Row label="Метки">
            <Badge>Новичок</Badge>
            <Badge tone="accent">В процессе</Badge>
            <Badge tone="success">Пройден</Badge>
            <Badge tone="danger">Незачёт</Badge>
            <Badge tone="warning">Предупреждение</Badge>
          </Row>
          <Row label="Прогресс">
            <div className="w-56">
              <ProgressBar value={40} label="Пример прогресса" />
            </div>
            <ProgressRing value={40} />
            <ProgressRing value={100} />
          </Row>
          <Row label="Карточка">
            <Card className="w-72">
              <CardBody>
                <CardTitle>Основы Python</CardTitle>
                <p className="mt-2 text-sm text-muted">
                  Синтаксис, типы данных и функции с нуля.
                </p>
              </CardBody>
            </Card>
          </Row>
          <Row label="Выноски">
            <div className="flex w-full flex-col gap-3">
              <Callout title="Подсказка">Обычное пояснение</Callout>
              <Callout tone="success" title="Верно">
                Ответ засчитан
              </Callout>
              <Callout tone="danger" title="Неверно">
                Правильный ответ другой
              </Callout>
              <Callout tone="warning" title="Предупреждение">
                В уроке нет заголовка
              </Callout>
            </div>
          </Row>
          <Row label="Вкладки">
            <Tabs
              items={[
                { id: "modules", label: "Модули" },
                { id: "cheatsheet", label: "Шпаргалка" },
              ]}
              active="modules"
              onChange={() => {}}
            />
          </Row>
          <Row label="Хлебные крошки">
            <Breadcrumbs
              items={[
                { label: "Курсы", to: "/" },
                { label: "Основы Python", to: "/courses/python-basics" },
                { label: "Переменные" },
              ]}
            />
          </Row>
          <Row label="Заглушки загрузки">
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Row>
          <Row label="Пустое состояние">
            <div className="w-full">
              <EmptyState
                title="Курсов пока нет"
                description="Положите папку с курсом в каталог content и обновите страницу."
                action={<Button variant="secondary">Как добавить курс</Button>}
              />
            </div>
          </Row>
        </div>
      </Section>
    </div>
  );
}
```

- [ ] **Step 4: Подключить маршрут**

В `frontend/src/App.tsx` добавить импорт и маршрут:

```tsx
import { Route, Routes } from "react-router";

import { Layout } from "./components/Layout";
import { DesignPage } from "./pages/DesignPage";

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Placeholder title="Главная" />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="*" element={<Placeholder title="Страница не найдена" />} />
      </Routes>
    </Layout>
  );
}
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

```bash
npm run test -- --run && npm run typecheck
```

Ожидается: все тесты PASSED, типы без ошибок.

- [ ] **Step 6: Написать документ правил**

Создать `docs/design-system.md`:

```markdown
# Дизайн-система FreeTraining

Этот документ читают перед тем, как нарисовать новый экран. Значения живут в
`frontend/src/styles/tokens.css`, живой каталог открывается по адресу `/design`.

## Характер

Нейтральная современная основа с заимствованиями из оформления macOS: крупные
скругления, полупрозрачные слои с размытием, мягкая глубина вместо жёстких
границ. Акцент изумрудный. Две темы. Просторная типографика.

## Восемь правил

1. В компонентах не встречается ни одного конкретного цвета, размера, радиуса
   или тени — только классы, порождённые из токенов.
2. Любой отступ берётся из шкалы, кратной четырём: 4, 8, 12, 16, 24, 32, 48, 64.
3. На экране одно акцентное действие. Остальные кнопки вторичные или прозрачные.
4. Стекло применяется только к шапке, навигации урока и выдвижной панели. Под
   текстом урока стекла нет никогда: размытие мешает читать.
5. Иерархия строится размером и насыщенностью текста, а не рамками и заливками.
6. У каждого интерактивного элемента описаны наведение, фокус с клавиатуры,
   нажатие и заблокированное состояние.
7. Контраст текста не ниже 4.5:1 в обеих темах.
8. Перед созданием нового компонента проверяется, нет ли подходящего в
   `src/components/ui`.

## Цвет

Смысловые токены: `surface`, `raised`, `sunken`, `body`, `muted`, `subtle`,
`line`, `line-strong`, `accent`, `accent-soft`, `success`, `danger`, `warning`,
`ring`. Примитивы (`--neutral-*`, `--emerald-*`) в компонентах не используются.

Изумрудный служит и акцентом, и признаком правильного ответа. Внутри теста
акцентные кнопки не применяются, поэтому зелёный там читается однозначно как
«верно», а неверный ответ обозначается красным.

## Типографика

Системный шрифт Apple с запасным Inter, моноширинный — SF Mono. Текст урока
крупнее интерфейсного, межстрочный интервал 1.7, ширина строки около 68
символов. Оформление Markdown собрано в `prose-lesson`.

## Глубина

В светлой теме глубину дают мягкие тени `shadow-soft` и `shadow-lift`. В тёмной
теме тени не читаются, поэтому там работает светлая грань сверху — приём из
macOS. Радиусы: 10 у кнопок, 14 у карточек, 20 у крупных панелей.

## Движение

150 миллисекунд для состояний элементов, 250 для панелей и полос прогресса.
Системный режим уменьшенной анимации отключает переходы — это уже прописано в
токенах и отдельных усилий не требует.
```

- [ ] **Step 7: Посмотреть глазами в обеих темах**

```bash
npm run dev
```

Открыть `http://localhost:5173/design`, просмотреть все разделы в светлой и
тёмной теме, проверить обход с клавиатуры: видимое кольцо фокуса на кнопках,
вкладках и ссылках. Остановить сервер.

- [ ] **Step 8: Коммит**

```bash
git add frontend docs/design-system.md
git commit -m "feat: живой каталог дизайн-системы и документ правил"
```

---

### Task 5: Клиент API, типы и хуки запросов

**Files:**
- Create: `frontend/src/lib/api/types.ts`, `frontend/src/lib/api/client.ts`, `frontend/src/lib/api/queries.ts`
- Create: `frontend/src/test/mocks.ts`, `frontend/src/test/server.ts`, `frontend/src/test/render.tsx`
- Create: `frontend/src/components/QueryState.tsx`
- Modify: `frontend/vitest.setup.ts`, `frontend/src/main.tsx`
- Test: `frontend/src/lib/api/client.test.ts`, `frontend/src/lib/api/queries.test.tsx`

**Interfaces:**
- Consumes: `frontend/src/lib/api/schema.ts`, порождённый в Задаче 1.
- Produces:
  - Псевдонимы типов в `types.ts`: `CourseSummary`, `CourseDetail`, `ModuleDetail`, `LessonRef`, `LessonDetail`, `StepLink`, `PageDetail`, `QuizPublic`, `QuizQuestionPublic`, `QuizResult`, `QuestionResult`, `AttemptSummary`, `ContentHealth`, `ResumePosition`.
  - `ApiError` и `apiFetch<T>(path, init?)` в `client.ts`.
  - Хуки в `queries.ts`: `useCourses`, `useCourse`, `useLesson`, `usePage`, `useModuleQuiz`, `useExam`, `useAttempts`, `useContentHealth`, `useCompleteLesson`, `useSavePosition`, `useSubmitQuiz`, `useResetCourse`; фабрика ключей `queryKeys`.
  - `QueryState` — единая отрисовка загрузки и ошибки.
  - Тестовая оснастка: `renderWithProviders` в `test/render.tsx`, перехватчик в `test/server.ts`, образцы ответов в `test/mocks.ts`.

- [ ] **Step 1: Написать падающие тесты**

Создать `frontend/src/test/mocks.ts`:

```ts
import type {
  AttemptSummary,
  ContentHealth,
  CourseDetail,
  CourseSummary,
  LessonDetail,
  PageDetail,
  QuizPublic,
  QuizResult,
} from "../lib/api/types";

export const courseSummary: CourseSummary = {
  id: "python-basics",
  title: "Основы Python",
  description: "Синтаксис, типы данных и функции с нуля.",
  tags: ["python", "backend"],
  level: "beginner",
  module_count: 2,
  lesson_count: 3,
  progress_percent: 0,
  status: "not_started",
  resume: null,
};

export const courseInProgress: CourseSummary = {
  ...courseSummary,
  progress_percent: 33,
  status: "in_progress",
  resume: {
    module_id: "02-syntax",
    lesson_id: "01-variables",
    lesson_title: "Переменные и типы данных",
  },
};

export const courseDetail: CourseDetail = {
  ...courseSummary,
  modules: [
    {
      id: "01-introduction",
      title: "Введение",
      lessons: [
        { id: "01-what-is-python", title: "Что такое Python", completed: true },
        { id: "02-installation", title: "Установка и запуск", completed: false },
      ],
      has_quiz: true,
      quiz_passed: false,
      quiz_best_score: null,
    },
    {
      id: "02-syntax",
      title: "Переменные и типы",
      lessons: [
        { id: "01-variables", title: "Переменные и типы данных", completed: false },
      ],
      has_quiz: true,
      quiz_passed: true,
      quiz_best_score: 100,
    },
  ],
  has_cheatsheet: true,
  has_glossary: true,
  has_exam: true,
  exam_passed: false,
  exam_best_score: null,
  progress_percent: 33,
  status: "in_progress",
};

export const lessonDetail: LessonDetail = {
  course_id: "python-basics",
  module_id: "01-introduction",
  lesson_id: "01-what-is-python",
  title: "Что такое Python",
  content: "# Что такое Python\n\nЯзык программирования общего назначения.",
  completed: false,
  prev: null,
  next: {
    kind: "lesson",
    module_id: "01-introduction",
    lesson_id: "02-installation",
    title: "Установка и запуск",
  },
};

export const lastLessonDetail: LessonDetail = {
  ...lessonDetail,
  lesson_id: "02-installation",
  title: "Установка и запуск",
  content: "# Установка и запуск\n\nПроверить версию.",
  prev: {
    kind: "lesson",
    module_id: "01-introduction",
    lesson_id: "01-what-is-python",
    title: "Что такое Python",
  },
  next: {
    kind: "quiz",
    module_id: "01-introduction",
    lesson_id: null,
    title: "Тест модуля: Введение",
  },
};

export const pageDetail: PageDetail = {
  course_id: "python-basics",
  page: "cheatsheet",
  title: "Шпаргалка по основам Python",
  content: "# Шпаргалка по основам Python\n\nКоротко о главном.",
};

export const quizPublic: QuizPublic = {
  course_id: "python-basics",
  scope: "module",
  module_id: "01-introduction",
  title: "Тест модуля: Введение",
  pass_score: 70,
  questions: [
    {
      index: 0,
      question: "Чем в Python выделяются блоки кода?",
      options: ["Фигурными скобками", "Отступами", "Ключевым словом end"],
      multiple: false,
    },
    {
      index: 1,
      question: "Что верно про Python?",
      options: ["Интерпретируемый язык", "Язык общего назначения", "Требует сборки"],
      multiple: true,
    },
  ],
};

export const quizResult: QuizResult = {
  attempt_id: 1,
  course_id: "python-basics",
  scope: "module",
  module_id: "01-introduction",
  total_questions: 2,
  correct_count: 1,
  score_percent: 50,
  passed: false,
  pass_score: 70,
  created_at: "2026-09-12T10:00:00Z",
  results: [
    {
      question: "Чем в Python выделяются блоки кода?",
      options: ["Фигурными скобками", "Отступами", "Ключевым словом end"],
      selected: ["Отступами"],
      correct_answer: ["Отступами"],
      is_correct: true,
      explanation: "Отступ — часть синтаксиса.",
    },
    {
      question: "Что верно про Python?",
      options: ["Интерпретируемый язык", "Язык общего назначения", "Требует сборки"],
      selected: ["Требует сборки"],
      correct_answer: ["Интерпретируемый язык", "Язык общего назначения"],
      is_correct: false,
      explanation: "Отдельный шаг сборки не требуется.",
    },
  ],
};

export const attempts: AttemptSummary[] = [
  {
    id: 2,
    course_id: "python-basics",
    scope: "module",
    module_id: "01-introduction",
    total_questions: 2,
    correct_count: 2,
    score_percent: 100,
    passed: true,
    created_at: "2026-09-12T12:00:00Z",
    results: quizResult.results,
  },
  {
    id: 1,
    course_id: "python-basics",
    scope: "module",
    module_id: "01-introduction",
    total_questions: 2,
    correct_count: 1,
    score_percent: 50,
    passed: false,
    created_at: "2026-09-12T10:00:00Z",
    results: quizResult.results,
  },
];

export const contentHealth: ContentHealth = {
  ok: true,
  course_count: 1,
  errors: [],
  warnings: [],
};
```

Создать `frontend/src/test/server.ts`:

```ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import {
  attempts,
  contentHealth,
  courseDetail,
  courseSummary,
  lessonDetail,
  pageDetail,
  quizPublic,
  quizResult,
} from "./mocks";

export const handlers = [
  http.get("/api/courses", () => HttpResponse.json([courseSummary])),
  http.get("/api/courses/:course", () => HttpResponse.json(courseDetail)),
  http.get("/api/courses/:course/lessons/:module/:lesson", () =>
    HttpResponse.json(lessonDetail),
  ),
  http.get("/api/courses/:course/pages/:page", () => HttpResponse.json(pageDetail)),
  http.get("/api/courses/:course/quizzes/:module", () => HttpResponse.json(quizPublic)),
  http.get("/api/courses/:course/exam", () => HttpResponse.json(quizPublic)),
  http.post("/api/quizzes/submit", () => HttpResponse.json(quizResult)),
  http.post("/api/progress/lessons/:course/:module/:lesson", () =>
    HttpResponse.json({
      course_id: "python-basics",
      module_id: "01-introduction",
      lesson_id: "01-what-is-python",
      completed: true,
      completed_at: "2026-09-12T10:00:00Z",
    }),
  ),
  http.put("/api/progress/position/:course", () =>
    HttpResponse.json({
      course_id: "python-basics",
      module_id: "01-introduction",
      lesson_id: "01-what-is-python",
      updated_at: "2026-09-12T10:00:00Z",
    }),
  ),
  http.get("/api/progress/attempts/:course", () => HttpResponse.json(attempts)),
  http.delete("/api/progress/courses/:course", () =>
    HttpResponse.json({ status: "ok" }),
  ),
  http.get("/api/health/content", () => HttpResponse.json(contentHealth)),
];

export const server = setupServer(...handlers);
```

Создать `frontend/src/test/render.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";

import { ThemeProvider } from "../theme/ThemeProvider";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: ReactNode,
  options: { route?: string; path?: string } = {},
) {
  const { route = "/", path } = options;
  const client = createTestQueryClient();

  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>
          {path ? (
            <Routes>
              <Route path={path} element={ui} />
            </Routes>
          ) : (
            ui
          )}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}
```

Создать `frontend/src/lib/api/client.test.ts`:

```ts
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { server } from "../../test/server";
import { ApiError, apiFetch } from "./client";

describe("apiFetch", () => {
  it("возвращает разобранный ответ", async () => {
    const courses = await apiFetch<{ id: string }[]>("/api/courses");

    expect(courses[0].id).toBe("python-basics");
  });

  it("бросает ApiError с текстом из поля detail", async () => {
    server.use(
      http.get("/api/courses/:course", () =>
        HttpResponse.json({ detail: "Курс не найден" }, { status: 404 }),
      ),
    );

    await expect(apiFetch("/api/courses/нет")).rejects.toThrowError(
      new ApiError(404, "Курс не найден"),
    );
  });

  it("не падает, когда тело ошибки не является JSON", async () => {
    server.use(
      http.get("/api/courses", () => new HttpResponse("сервер лежит", { status: 500 })),
    );

    await expect(apiFetch("/api/courses")).rejects.toThrow(/500/);
  });
});
```

Создать `frontend/src/lib/api/queries.test.tsx`:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { createTestQueryClient } from "../../test/render";
import { server } from "../../test/server";
import { useCompleteLesson, useCourse, useCourses } from "./queries";

function wrapper({ children }: { children: ReactNode }) {
  const client = createTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("хуки запросов", () => {
  it("useCourses отдаёт каталог", async () => {
    const { result } = renderHook(() => useCourses(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toBe("Основы Python");
  });

  it("useCourse отдаёт дерево курса", async () => {
    const { result } = renderHook(() => useCourse("python-basics"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.modules).toHaveLength(2);
  });

  it("useCourse сообщает об ошибке понятным текстом", async () => {
    server.use(
      http.get("/api/courses/:course", () =>
        HttpResponse.json({ detail: "Курс не найден" }, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useCourse("нет"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Курс не найден");
  });

  it("useCompleteLesson отмечает урок пройденным", async () => {
    const { result } = renderHook(() => useCompleteLesson("python-basics"), {
      wrapper,
    });

    result.current.mutate({
      moduleId: "01-introduction",
      lessonId: "01-what-is-python",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.completed).toBe(true);
  });
});
```

- [ ] **Step 2: Подключить перехватчик к тестовому окружению**

Заменить `frontend/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./src/test/server";

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Относительные пути вроде `/api/courses` в среде `jsdom` разрешаются относительно
базового адреса. Задать его в `frontend/vite.config.ts`, в блоке `test`:

```ts
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:5173" } },
```

- [ ] **Step 3: Запустить тесты и убедиться, что они падают**

```bash
npm run test -- --run src/lib/api
```

Ожидается: ошибки разрешения импортов `./client` и `./queries`.

- [ ] **Step 4: Реализовать типы и клиент**

Создать `frontend/src/lib/api/types.ts`:

```ts
import type { components } from "./schema";

type Schemas = components["schemas"];

export type CourseSummary = Schemas["CourseSummary"];
export type CourseDetail = Schemas["CourseDetail"];
export type ModuleDetail = Schemas["ModuleDetail"];
export type LessonRef = Schemas["LessonRef"];
export type LessonDetail = Schemas["LessonDetail"];
export type StepLink = Schemas["StepLink"];
export type PageDetail = Schemas["PageDetail"];
export type QuizPublic = Schemas["QuizPublic"];
export type QuizQuestionPublic = Schemas["QuizQuestionPublic"];
export type QuizSubmission = Schemas["QuizSubmission"];
export type QuizResult = Schemas["QuizResult"];
export type QuestionResult = Schemas["QuestionResult"];
export type AttemptSummary = Schemas["AttemptSummary"];
export type ContentHealth = Schemas["ContentHealth"];
export type ContentErrorOut = Schemas["ContentErrorOut"];
export type ResumePosition = Schemas["ResumePosition"];
```

Создать `frontend/src/lib/api/client.ts`:

```ts
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof (body as { detail: unknown }).detail === "string"
    ) {
      return (body as { detail: string }).detail;
    }
  } catch {
    // тело не является JSON — воспользуемся общим текстом
  }
  return `Сервер ответил ошибкой ${response.status}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Не удалось связаться с сервером. Он запущен?");
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
```

- [ ] **Step 5: Реализовать хуки запросов**

Создать `frontend/src/lib/api/queries.ts`:

```ts
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { ApiError, apiFetch } from "./client";
import type {
  AttemptSummary,
  ContentHealth,
  CourseDetail,
  CourseSummary,
  LessonDetail,
  PageDetail,
  QuizPublic,
  QuizResult,
  QuizSubmission,
} from "./types";

export const queryKeys = {
  courses: ["courses"] as const,
  course: (courseId: string) => ["courses", courseId] as const,
  lesson: (courseId: string, moduleId: string, lessonId: string) =>
    ["courses", courseId, "lessons", moduleId, lessonId] as const,
  page: (courseId: string, page: string) => ["courses", courseId, "pages", page] as const,
  moduleQuiz: (courseId: string, moduleId: string) =>
    ["courses", courseId, "quizzes", moduleId] as const,
  exam: (courseId: string) => ["courses", courseId, "exam"] as const,
  attempts: (courseId: string) => ["attempts", courseId] as const,
  health: ["health"] as const,
};

export function useCourses(): UseQueryResult<CourseSummary[], ApiError> {
  return useQuery({
    queryKey: queryKeys.courses,
    queryFn: () => apiFetch<CourseSummary[]>("/api/courses"),
  });
}

export function useCourse(courseId: string): UseQueryResult<CourseDetail, ApiError> {
  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => apiFetch<CourseDetail>(`/api/courses/${courseId}`),
  });
}

export function useLesson(
  courseId: string,
  moduleId: string,
  lessonId: string,
): UseQueryResult<LessonDetail, ApiError> {
  return useQuery({
    queryKey: queryKeys.lesson(courseId, moduleId, lessonId),
    queryFn: () =>
      apiFetch<LessonDetail>(
        `/api/courses/${courseId}/lessons/${moduleId}/${lessonId}`,
      ),
  });
}

export function usePage(
  courseId: string,
  page: string,
  enabled = true,
): UseQueryResult<PageDetail, ApiError> {
  return useQuery({
    queryKey: queryKeys.page(courseId, page),
    queryFn: () => apiFetch<PageDetail>(`/api/courses/${courseId}/pages/${page}`),
    enabled,
  });
}

export function useModuleQuiz(
  courseId: string,
  moduleId: string,
): UseQueryResult<QuizPublic, ApiError> {
  return useQuery({
    queryKey: queryKeys.moduleQuiz(courseId, moduleId),
    queryFn: () => apiFetch<QuizPublic>(`/api/courses/${courseId}/quizzes/${moduleId}`),
  });
}

export function useExam(courseId: string): UseQueryResult<QuizPublic, ApiError> {
  return useQuery({
    queryKey: queryKeys.exam(courseId),
    queryFn: () => apiFetch<QuizPublic>(`/api/courses/${courseId}/exam`),
  });
}

export function useAttempts(
  courseId: string,
): UseQueryResult<AttemptSummary[], ApiError> {
  return useQuery({
    queryKey: queryKeys.attempts(courseId),
    queryFn: () => apiFetch<AttemptSummary[]>(`/api/progress/attempts/${courseId}`),
  });
}

export function useContentHealth(): UseQueryResult<ContentHealth, ApiError> {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => apiFetch<ContentHealth>("/api/health/content"),
  });
}

export function useCompleteLesson(courseId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      apiFetch<{ completed: boolean }>(
        `/api/progress/lessons/${courseId}/${moduleId}/${lessonId}`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.courses });
      void client.invalidateQueries({ queryKey: queryKeys.course(courseId) });
    },
  });
}

export function useSavePosition(courseId: string) {
  return useMutation({
    mutationFn: ({ moduleId, lessonId }: { moduleId: string; lessonId: string }) =>
      apiFetch<unknown>(`/api/progress/position/${courseId}`, {
        method: "PUT",
        body: JSON.stringify({ module_id: moduleId, lesson_id: lessonId }),
      }),
  });
}

export function useSubmitQuiz(courseId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (submission: QuizSubmission) =>
      apiFetch<QuizResult>("/api/quizzes/submit", {
        method: "POST",
        body: JSON.stringify(submission),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.courses });
      void client.invalidateQueries({ queryKey: queryKeys.course(courseId) });
      void client.invalidateQueries({ queryKey: queryKeys.attempts(courseId) });
    },
  });
}

export function useResetCourse(courseId: string) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<unknown>(`/api/progress/courses/${courseId}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.courses });
      void client.invalidateQueries({ queryKey: queryKeys.course(courseId) });
      void client.invalidateQueries({ queryKey: queryKeys.attempts(courseId) });
    },
  });
}
```

- [ ] **Step 6: Реализовать единую отрисовку загрузки и ошибки**

Создать `frontend/src/components/QueryState.tsx`:

```tsx
import type { ReactNode } from "react";

import type { ApiError } from "../lib/api/client";
import { Callout } from "./ui/Callout";
import { Skeleton } from "./ui/Skeleton";

export function QueryState({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error: ApiError | null;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Callout tone="danger" title="Не удалось загрузить данные">
        {error.message}
      </Callout>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 7: Подключить TanStack Query к приложению**

Заменить `frontend/src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";
import "./styles/tokens.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, refetchOnWindowFocus: false, retry: 1 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

Содержимое курсов читается с диска при каждом запросе, поэтому `staleTime`
равен нулю: положил папку, обновил страницу — курс на месте.

- [ ] **Step 8: Запустить тесты и убедиться, что они проходят**

```bash
npm run test -- --run && npm run typecheck
```

Ожидается: все тесты PASSED (7 новых), типы без ошибок.

- [ ] **Step 9: Коммит**

```bash
git add frontend
git commit -m "feat: клиент API, типы из схемы бэкенда и хуки запросов"
```

---

### Task 6: Главная — продолжение обучения и каталог курсов

**Files:**
- Create: `frontend/src/pages/HomePage.tsx`
- Create: `frontend/src/components/CourseCard.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/pages/HomePage.test.tsx`

**Interfaces:**
- Consumes: `useCourses`, `QueryState`, компоненты дизайн-системы.
- Produces: страница `/`; `CourseCard({ course: CourseSummary })`.

Ссылка на продолжение ведёт на `/courses/{id}/{module_id}/{lesson_id}`.

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/pages/HomePage.test.tsx`:

```tsx
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { courseInProgress, courseSummary } from "../test/mocks";
import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  it("показывает каталог курсов", async () => {
    renderWithProviders(<HomePage />);

    expect(await screen.findByText("Основы Python")).toBeInTheDocument();
    expect(screen.getByText("2 модуля · 3 урока")).toBeInTheDocument();
  });

  it("предлагает начать курс, к которому ещё не приступали", async () => {
    renderWithProviders(<HomePage />);

    expect(await screen.findByRole("link", { name: "Начать курс" })).toHaveAttribute(
      "href",
      "/courses/python-basics",
    );
    expect(screen.queryByRole("heading", { name: "Продолжить обучение" })).toBeNull();
  });

  it("показывает блок продолжения с названием урока", async () => {
    server.use(http.get("/api/courses", () => HttpResponse.json([courseInProgress])));

    renderWithProviders(<HomePage />);

    expect(
      await screen.findByRole("heading", { name: "Продолжить обучение" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Переменные и типы данных/ }),
    ).toHaveAttribute("href", "/courses/python-basics/02-syntax/01-variables");
  });

  it("показывает пустое состояние, когда курсов нет", async () => {
    server.use(http.get("/api/courses", () => HttpResponse.json([])));

    renderWithProviders(<HomePage />);

    expect(await screen.findByText("Курсов пока нет")).toBeInTheDocument();
  });

  it("показывает понятную ошибку, когда сервер недоступен", async () => {
    server.use(
      http.get("/api/courses", () =>
        HttpResponse.json({ detail: "Внутренняя ошибка" }, { status: 500 }),
      ),
    );

    renderWithProviders(<HomePage />);

    await waitFor(() =>
      expect(screen.getByText("Не удалось загрузить данные")).toBeInTheDocument(),
    );
  });

  it("не показывает блок продолжения, пока курсы грузятся", () => {
    renderWithProviders(<HomePage />);

    expect(screen.queryByText(courseSummary.title)).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

```bash
npm run test -- --run src/pages/HomePage.test.tsx
```

Ожидается: `Failed to resolve import "./HomePage"`.

- [ ] **Step 3: Реализовать карточку курса**

Создать `frontend/src/components/CourseCard.tsx`:

```tsx
import { Link } from "react-router";

import type { CourseSummary } from "../lib/api/types";
import { Badge } from "./ui/Badge";
import { Card, CardBody } from "./ui/Card";
import { ProgressRing } from "./ui/ProgressRing";

const LEVELS: Record<string, string> = {
  beginner: "Начальный",
  intermediate: "Средний",
  advanced: "Продвинутый",
};

const STATUS_TONE = {
  completed: "success",
  in_progress: "accent",
  not_started: "neutral",
} as const;

const STATUS_LABEL: Record<string, string> = {
  completed: "Пройден",
  in_progress: "В процессе",
  not_started: "Не начат",
};

function plural(count: number, forms: [string, string, string]): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function CourseCard({ course }: { course: CourseSummary }) {
  const status = course.status as keyof typeof STATUS_TONE;
  const target = course.resume
    ? `/courses/${course.id}/${course.resume.module_id}/${course.resume.lesson_id}`
    : `/courses/${course.id}`;
  const action = course.resume
    ? "Продолжить"
    : course.status === "completed"
      ? "Повторить"
      : "Начать курс";

  return (
    <Card className="transition-shadow duration-150 hover:shadow-lift">
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Link
              to={`/courses/${course.id}`}
              className="text-base font-semibold tracking-tight
                transition-colors duration-150 hover:text-accent"
            >
              {course.title}
            </Link>
            <p className="line-clamp-2 text-sm text-muted">{course.description}</p>
          </div>
          <ProgressRing value={course.progress_percent} size={48} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[status] ?? "neutral"}>
            {STATUS_LABEL[course.status] ?? course.status}
          </Badge>
          <Badge>{LEVELS[course.level] ?? course.level}</Badge>
          {course.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <span>
            {course.module_count}{" "}
            {plural(course.module_count, ["модуль", "модуля", "модулей"])} ·{" "}
            {course.lesson_count}{" "}
            {plural(course.lesson_count, ["урок", "урока", "уроков"])}
          </span>
          <Link
            to={target}
            className="font-medium text-accent transition-opacity duration-150
              hover:opacity-80"
          >
            {action}
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 4: Реализовать главную**

Создать `frontend/src/pages/HomePage.tsx`:

```tsx
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CourseCard } from "../components/CourseCard";
import { QueryState } from "../components/QueryState";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useCourses } from "../lib/api/queries";
import type { CourseSummary } from "../lib/api/types";

function ResumeCard({ course }: { course: CourseSummary }) {
  if (!course.resume) return null;

  return (
    <Card className="transition-shadow duration-150 hover:shadow-lift">
      <CardBody className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
          {course.title}
        </p>
        <Link
          to={`/courses/${course.id}/${course.resume.module_id}/${course.resume.lesson_id}`}
          className="inline-flex items-center gap-2 text-base font-semibold
            tracking-tight transition-colors duration-150 hover:text-accent"
        >
          {course.resume.lesson_title}
          <ArrowRight size={16} />
        </Link>
        <ProgressBar
          value={course.progress_percent}
          label={`Прогресс курса «${course.title}»`}
        />
      </CardBody>
    </Card>
  );
}

export function HomePage() {
  const { data: courses, isLoading, error } = useCourses();
  const resumable = (courses ?? []).filter((course) => course.resume !== null);

  return (
    <div className="flex flex-col gap-12">
      <QueryState isLoading={isLoading} error={error}>
        {resumable.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Продолжить обучение
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {resumable.slice(0, 2).map((course) => (
                <ResumeCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Курсы</h1>
          {courses && courses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Курсов пока нет"
              description="Положите папку с курсом в каталог content и обновите страницу.
                Формат описан в docs/course-format.md."
            />
          )}
        </section>
      </QueryState>
    </div>
  );
}
```

- [ ] **Step 5: Подключить маршрут**

В `frontend/src/App.tsx` заменить заглушку главной на `HomePage`:

```tsx
import { Route, Routes } from "react-router";

import { Layout } from "./components/Layout";
import { DesignPage } from "./pages/DesignPage";
import { HomePage } from "./pages/HomePage";

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="*" element={<Placeholder title="Страница не найдена" />} />
      </Routes>
    </Layout>
  );
}
```

Тест `src/App.test.tsx` отрисовывает `App` без провайдера запросов, а `HomePage`
обращается к серверу. Обернуть его отрисовку в `QueryClientProvider`, используя
`createTestQueryClient` из `src/test/render.tsx`:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import App from "./App";
import { createTestQueryClient } from "./test/render";
import { ThemeProvider } from "./theme/ThemeProvider";

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("App", () => {
  it("показывает название платформы в шапке", () => {
    renderAt("/");
    expect(screen.getByRole("banner")).toHaveTextContent("FreeTraining");
  });

  it("показывает страницу «не найдено» для неизвестного адреса", () => {
    renderAt("/такой-страницы-нет");
    expect(screen.getByText("Страница не найдена")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

```bash
npm run test -- --run && npm run typecheck
```

Ожидается: все тесты PASSED (6 новых), типы без ошибок.

- [ ] **Step 7: Коммит**

```bash
git add frontend
git commit -m "feat: главная страница с продолжением обучения и каталогом"
```

---

### Task 7: Страница курса — дерево модулей, шпаргалка и термины

**Files:**
- Create: `frontend/src/components/Markdown.tsx`
- Create: `frontend/src/components/ModuleTree.tsx`
- Create: `frontend/src/pages/CoursePage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/pages/CoursePage.test.tsx`

**Interfaces:**
- Consumes: `useCourse`, `usePage`, `useResetCourse`, `QueryState`, компоненты дизайн-системы.
- Produces:
  - `Markdown({ content: string })` — отображение Markdown в оформлении `prose-lesson`.
  - `ModuleTree({ course: CourseDetail, activeLessonId?: string })` — дерево модулей и уроков с отметками и ссылками на тесты.
  - Страница `/courses/:courseId`.

Вкладки «Шпаргалка» и «Термины» показываются только тогда, когда соответствующие
файлы есть у курса (`has_cheatsheet`, `has_glossary`).

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/pages/CoursePage.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { courseDetail } from "../test/mocks";
import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { CoursePage } from "./CoursePage";

function renderPage() {
  return renderWithProviders(<CoursePage />, {
    route: "/courses/python-basics",
    path: "/courses/:courseId",
  });
}

describe("CoursePage", () => {
  it("показывает название, описание и прогресс курса", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Основы Python", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(courseDetail.description)).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("показывает модули и уроки со ссылками", async () => {
    renderPage();

    expect(await screen.findByText("Введение")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Что такое Python/ }),
    ).toHaveAttribute(
      "href",
      "/courses/python-basics/01-introduction/01-what-is-python",
    );
  });

  it("ведёт на тест модуля и показывает лучший результат", async () => {
    renderPage();

    expect(
      await screen.findByRole("link", { name: /Тест модуля/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("показывает кнопку продолжения, когда есть место остановки", async () => {
    server.use(
      http.get("/api/courses/:course", () =>
        HttpResponse.json({
          ...courseDetail,
          resume: {
            module_id: "02-syntax",
            lesson_id: "01-variables",
            lesson_title: "Переменные и типы данных",
          },
        }),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("link", { name: /Продолжить/ }),
    ).toHaveAttribute("href", "/courses/python-basics/02-syntax/01-variables");
  });

  it("предлагает начать курс, когда места остановки нет", async () => {
    renderPage();

    expect(await screen.findByRole("link", { name: /Начать курс/ })).toHaveAttribute(
      "href",
      "/courses/python-basics/01-introduction/01-what-is-python",
    );
  });

  it("открывает шпаргалку по вкладке", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("tab", { name: "Шпаргалка" }));

    expect(await screen.findByText("Коротко о главном.")).toBeInTheDocument();
  });

  it("не показывает вкладку терминов, когда файла нет", async () => {
    server.use(
      http.get("/api/courses/:course", () =>
        HttpResponse.json({ ...courseDetail, has_glossary: false }),
      ),
    );

    renderPage();

    await screen.findByRole("tab", { name: "Модули" });
    expect(screen.queryByRole("tab", { name: "Термины" })).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

```bash
npm run test -- --run src/pages/CoursePage.test.tsx
```

Ожидается: `Failed to resolve import "./CoursePage"`.

- [ ] **Step 3: Реализовать отображение Markdown**

Создать `frontend/src/components/Markdown.tsx`:

```tsx
import rehypeHighlight from "rehype-highlight";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-lesson">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

Сырой HTML не включается намеренно: `react-markdown` по умолчанию его не
отрисовывает, и этого достаточно — содержимое приходит из файлов на диске, но
лишняя поверхность нам не нужна.

- [ ] **Step 4: Реализовать дерево модулей**

Создать `frontend/src/components/ModuleTree.tsx`:

```tsx
import clsx from "clsx";
import { Check, CircleDashed, FileText, ListChecks } from "lucide-react";
import { Link } from "react-router";

import type { CourseDetail } from "../lib/api/types";
import { Badge } from "./ui/Badge";

export function ModuleTree({
  course,
  activeLessonId,
}: {
  course: CourseDetail;
  activeLessonId?: string;
}) {
  return (
    <nav aria-label="Содержание курса" className="flex flex-col gap-6">
      {course.modules.map((module, index) => (
        <section key={module.id} className="flex flex-col gap-2">
          <header className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-tight">
              <span className="text-subtle">{index + 1}.</span> {module.title}
            </h3>
            {module.quiz_passed ? <Badge tone="success">Сдан</Badge> : null}
          </header>

          <ul className="flex flex-col gap-0.5">
            {module.lessons.map((lesson) => {
              const active = lesson.id === activeLessonId;
              return (
                <li key={lesson.id}>
                  <Link
                    to={`/courses/${course.id}/${module.id}/${lesson.id}`}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-2 rounded-control px-2 py-1.5 text-sm",
                      "transition-colors duration-150",
                      active
                        ? "bg-accent-soft text-body"
                        : "text-muted hover:bg-sunken hover:text-body",
                    )}
                  >
                    {lesson.completed ? (
                      <Check size={14} className="shrink-0 text-success" />
                    ) : (
                      <CircleDashed size={14} className="shrink-0 text-subtle" />
                    )}
                    <span className="min-w-0 truncate">{lesson.title}</span>
                  </Link>
                </li>
              );
            })}

            {module.has_quiz ? (
              <li>
                <Link
                  to={`/courses/${course.id}/${module.id}/quiz`}
                  className="flex items-center gap-2 rounded-control px-2 py-1.5 text-sm
                    text-muted transition-colors duration-150
                    hover:bg-sunken hover:text-body"
                >
                  <ListChecks size={14} className="shrink-0 text-subtle" />
                  <span className="min-w-0 truncate">Тест модуля</span>
                  {module.quiz_best_score !== null ? (
                    <span className="ml-auto text-xs tabular-nums text-subtle">
                      {module.quiz_best_score}%
                    </span>
                  ) : null}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ))}

      {course.has_exam ? (
        <Link
          to={`/courses/${course.id}/exam`}
          className="flex items-center gap-2 rounded-control border border-line px-3 py-2
            text-sm font-medium transition-colors duration-150 hover:bg-sunken"
        >
          <FileText size={14} className="shrink-0 text-subtle" />
          Финальный экзамен
          {course.exam_best_score !== null ? (
            <span className="ml-auto text-xs tabular-nums text-subtle">
              {course.exam_best_score}%
            </span>
          ) : null}
        </Link>
      ) : null}
    </nav>
  );
}
```

- [ ] **Step 5: Реализовать страницу курса**

Создать `frontend/src/pages/CoursePage.tsx`:

```tsx
import { ArrowRight, History, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { Markdown } from "../components/Markdown";
import { ModuleTree } from "../components/ModuleTree";
import { QueryState } from "../components/QueryState";
import { Badge } from "../components/ui/Badge";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { Card, CardBody } from "../components/ui/Card";
import { ProgressRing } from "../components/ui/ProgressRing";
import { Skeleton } from "../components/ui/Skeleton";
import { Tabs, type TabItem } from "../components/ui/Tabs";
import { useCourse, usePage, useResetCourse } from "../lib/api/queries";
import type { CourseDetail } from "../lib/api/types";

function firstLessonPath(course: CourseDetail): string | null {
  for (const module of course.modules) {
    const lesson = module.lessons[0];
    if (lesson) return `/courses/${course.id}/${module.id}/${lesson.id}`;
  }
  return null;
}

function PageTab({ courseId, page }: { courseId: string; page: string }) {
  const { data, isLoading, error } = usePage(courseId, page);

  return (
    <QueryState isLoading={isLoading} error={error}>
      {data ? <Markdown content={data.content} /> : null}
    </QueryState>
  );
}

export function CoursePage() {
  const { courseId = "" } = useParams();
  const { data: course, isLoading, error } = useCourse(courseId);
  const reset = useResetCourse(courseId);
  const [tab, setTab] = useState("modules");

  const tabs: TabItem[] = [{ id: "modules", label: "Модули" }];
  if (course?.has_cheatsheet) tabs.push({ id: "cheatsheet", label: "Шпаргалка" });
  if (course?.has_glossary) tabs.push({ id: "glossary", label: "Термины" });

  const startPath = course
    ? course.resume
      ? `/courses/${course.id}/${course.resume.module_id}/${course.resume.lesson_id}`
      : firstLessonPath(course)
    : null;

  const startLabel = course?.resume
    ? `Продолжить · ${course.resume.lesson_title}`
    : course?.status === "completed"
      ? "Повторить курс"
      : "Начать курс";

  return (
    <QueryState isLoading={isLoading} error={error}>
      {course ? (
        <div className="flex flex-col gap-8">
          <Breadcrumbs items={[{ label: "Курсы", to: "/" }, { label: course.title }]} />

          <header className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 flex-col gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
              <p className="max-w-2xl text-sm text-muted">{course.description}</p>
              <div className="flex flex-wrap gap-2">
                {course.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </div>
            <ProgressRing value={course.progress_percent} size={64} />
          </header>

          <div className="flex flex-wrap items-center gap-3">
            {startPath ? (
              <Link to={startPath}>
                <Button size="lg">
                  {startLabel}
                  <ArrowRight size={16} />
                </Button>
              </Link>
            ) : null}
            <Link to={`/courses/${course.id}/results`}>
              <Button variant="secondary">
                <History size={16} />
                История попыток
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                if (
                  window.confirm(
                    `Сбросить весь прогресс курса «${course.title}»? Отменить это нельзя.`,
                  )
                ) {
                  reset.mutate();
                }
              }}
              disabled={reset.isPending}
            >
              <RotateCcw size={16} />
              Сбросить прогресс
            </Button>
          </div>

          <Tabs items={tabs} active={tab} onChange={setTab} />

          {tab === "modules" ? (
            <Card>
              <CardBody>
                <ModuleTree course={course} />
              </CardBody>
            </Card>
          ) : null}
          {tab === "cheatsheet" ? <PageTab courseId={course.id} page="cheatsheet" /> : null}
          {tab === "glossary" ? <PageTab courseId={course.id} page="glossary" /> : null}
        </div>
      ) : (
        <Skeleton className="h-64 w-full" />
      )}
    </QueryState>
  );
}
```

- [ ] **Step 6: Подключить маршрут**

В `frontend/src/App.tsx` добавить импорт `CoursePage` и маршрут перед запасным:

```tsx
        <Route path="/courses/:courseId" element={<CoursePage />} />
```

- [ ] **Step 7: Запустить тесты и убедиться, что они проходят**

```bash
npm run test -- --run && npm run typecheck
```

Ожидается: все тесты PASSED (7 новых), типы без ошибок.

- [ ] **Step 8: Коммит**

```bash
git add frontend
git commit -m "feat: страница курса с деревом модулей, шпаргалкой и терминами"
```

---

### Task 8: Страница урока

**Files:**
- Create: `frontend/src/pages/LessonPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/pages/LessonPage.test.tsx`

**Interfaces:**
- Consumes: `useLesson`, `useCourse`, `useCompleteLesson`, `useSavePosition`, `Markdown`, `ModuleTree`, компоненты дизайн-системы.
- Produces: страница `/courses/:courseId/:moduleId/:lessonId`.

Поведение главной кнопки внизу урока:
- следующий шаг — урок: «Пройдено, дальше», ведёт на следующий урок;
- следующий шаг — тест модуля: «Пройдено, к тесту модуля», ведёт на `/courses/:courseId/:moduleId/quiz`;
- следующий шаг — экзамен: «Пройдено, к экзамену», ведёт на `/courses/:courseId/exam`;
- следующего шага нет: «Пройдено», возвращает на страницу курса.

В любом случае кнопка сперва отмечает урок пройденным, затем переходит. Место
остановки сохраняется при открытии урока.

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/pages/LessonPage.test.tsx`:

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { lastLessonDetail, lessonDetail } from "../test/mocks";
import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { LessonPage } from "./LessonPage";

function renderPage(
  route = "/courses/python-basics/01-introduction/01-what-is-python",
) {
  return renderWithProviders(<LessonPage />, {
    route,
    path: "/courses/:courseId/:moduleId/:lessonId",
  });
}

describe("LessonPage", () => {
  it("отображает текст урока", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Что такое Python", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Язык программирования общего назначения."),
    ).toBeInTheDocument();
  });

  it("сохраняет место остановки при открытии урока", async () => {
    const saved = vi.fn();
    server.use(
      http.put("/api/progress/position/:course", async ({ request }) => {
        saved(await request.json());
        return HttpResponse.json({
          course_id: "python-basics",
          module_id: "01-introduction",
          lesson_id: "01-what-is-python",
          updated_at: "2026-09-12T10:00:00Z",
        });
      }),
    );

    renderPage();
    await screen.findByRole("heading", { name: "Что такое Python", level: 1 });

    await waitFor(() =>
      expect(saved).toHaveBeenCalledWith({
        module_id: "01-introduction",
        lesson_id: "01-what-is-python",
      }),
    );
  });

  it("отмечает урок пройденным по главной кнопке", async () => {
    const completed = vi.fn();
    server.use(
      http.post("/api/progress/lessons/:course/:module/:lesson", ({ params }) => {
        completed(params.lesson);
        return HttpResponse.json({
          course_id: "python-basics",
          module_id: "01-introduction",
          lesson_id: "01-what-is-python",
          completed: true,
          completed_at: "2026-09-12T10:00:00Z",
        });
      }),
    );

    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole("button", { name: "Пройдено, дальше" }),
    );

    await waitFor(() => expect(completed).toHaveBeenCalledWith("01-what-is-python"));
  });

  it("предлагает перейти к тесту после последнего урока модуля", async () => {
    server.use(
      http.get("/api/courses/:course/lessons/:module/:lesson", () =>
        HttpResponse.json(lastLessonDetail),
      ),
    );

    renderPage("/courses/python-basics/01-introduction/02-installation");

    expect(
      await screen.findByRole("button", { name: "Пройдено, к тесту модуля" }),
    ).toBeInTheDocument();
  });

  it("показывает ссылку на предыдущий шаг, когда он есть", async () => {
    server.use(
      http.get("/api/courses/:course/lessons/:module/:lesson", () =>
        HttpResponse.json(lastLessonDetail),
      ),
    );

    renderPage("/courses/python-basics/01-introduction/02-installation");

    expect(
      await screen.findByRole("link", { name: /Что такое Python/ }),
    ).toBeInTheDocument();
  });

  it("показывает отметку о том, что урок уже пройден", async () => {
    server.use(
      http.get("/api/courses/:course/lessons/:module/:lesson", () =>
        HttpResponse.json({ ...lessonDetail, completed: true }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Пройден")).toBeInTheDocument();
  });

  it("показывает понятную ошибку, когда урока нет", async () => {
    server.use(
      http.get("/api/courses/:course/lessons/:module/:lesson", () =>
        HttpResponse.json({ detail: "Урок не найден" }, { status: 404 }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Урок не найден")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

```bash
npm run test -- --run src/pages/LessonPage.test.tsx
```

Ожидается: `Failed to resolve import "./LessonPage"`.

- [ ] **Step 3: Реализовать страницу урока**

Создать `frontend/src/pages/LessonPage.tsx`:

```tsx
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { Markdown } from "../components/Markdown";
import { ModuleTree } from "../components/ModuleTree";
import { QueryState } from "../components/QueryState";
import { Badge } from "../components/ui/Badge";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { GlassPanel } from "../components/ui/GlassPanel";
import {
  useCompleteLesson,
  useCourse,
  useLesson,
  useSavePosition,
} from "../lib/api/queries";
import type { StepLink } from "../lib/api/types";

function stepPath(courseId: string, step: StepLink): string {
  if (step.kind === "exam") return `/courses/${courseId}/exam`;
  if (step.kind === "quiz") return `/courses/${courseId}/${step.module_id}/quiz`;
  return `/courses/${courseId}/${step.module_id}/${step.lesson_id}`;
}

function nextLabel(step: StepLink | null | undefined): string {
  if (!step) return "Пройдено";
  if (step.kind === "quiz") return "Пройдено, к тесту модуля";
  if (step.kind === "exam") return "Пройдено, к экзамену";
  return "Пройдено, дальше";
}

export function LessonPage() {
  const { courseId = "", moduleId = "", lessonId = "" } = useParams();
  const navigate = useNavigate();

  const lesson = useLesson(courseId, moduleId, lessonId);
  const course = useCourse(courseId);
  const complete = useCompleteLesson(courseId);
  const savePosition = useSavePosition(courseId);

  const { mutate: remember } = savePosition;
  useEffect(() => {
    if (lesson.isSuccess) {
      remember({ moduleId, lessonId });
    }
  }, [lesson.isSuccess, remember, moduleId, lessonId]);

  const next = lesson.data?.next ?? null;

  function goNext() {
    complete.mutate(
      { moduleId, lessonId },
      {
        onSettled: () => {
          void navigate(next ? stepPath(courseId, next) : `/courses/${courseId}`);
        },
      },
    );
  }

  return (
    <QueryState isLoading={lesson.isLoading} error={lesson.error}>
      {lesson.data ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          {course.data ? (
            <GlassPanel className="hidden shrink-0 self-start p-4 lg:sticky lg:top-20
              lg:block lg:w-64">
              <ModuleTree course={course.data} activeLessonId={lessonId} />
            </GlassPanel>
          ) : null}

          <article className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Breadcrumbs
                items={[
                  { label: "Курсы", to: "/" },
                  { label: course.data?.title ?? "Курс", to: `/courses/${courseId}` },
                  { label: lesson.data.title },
                ]}
              />
              {lesson.data.completed ? <Badge tone="success">Пройден</Badge> : null}
            </div>

            <Markdown content={lesson.data.content} />

            <footer className="flex flex-wrap items-center justify-between gap-4
              border-t border-line pt-6">
              {lesson.data.prev ? (
                <Link
                  to={stepPath(courseId, lesson.data.prev)}
                  className="inline-flex items-center gap-2 text-sm text-muted
                    transition-colors duration-150 hover:text-body"
                >
                  <ArrowLeft size={16} />
                  {lesson.data.prev.title}
                </Link>
              ) : (
                <span />
              )}

              <Button size="lg" onClick={goNext} disabled={complete.isPending}>
                {lesson.data.completed ? <Check size={16} /> : null}
                {nextLabel(next)}
                <ArrowRight size={16} />
              </Button>
            </footer>
          </article>
        </div>
      ) : null}
    </QueryState>
  );
}
```

- [ ] **Step 4: Подключить маршрут**

В `frontend/src/App.tsx` добавить импорт `LessonPage` и маршрут. Маршрут теста
модуля появится в Задаче 9 и совпадёт по форме с этим; беспокоиться об этом не
нужно: React Router выбирает маршрут по точности совпадения, а не по порядку
записи, поэтому статический отрезок `quiz` всегда выигрывает у изменяемого
`:lessonId`.

```tsx
        <Route path="/courses/:courseId/:moduleId/:lessonId" element={<LessonPage />} />
```

- [ ] **Step 5: Запустить тесты и убедиться, что они проходят**

```bash
npm run test -- --run && npm run typecheck
```

Ожидается: все тесты PASSED (7 новых), типы без ошибок.

- [ ] **Step 6: Коммит**

```bash
git add frontend
git commit -m "feat: страница урока с навигацией и отметкой о прохождении"
```

---

### Task 9: Прохождение теста и разбор

**Files:**
- Create: `frontend/src/features/quiz/AnswerOption.tsx`, `frontend/src/features/quiz/ResultBanner.tsx`, `frontend/src/features/quiz/QuizRunner.tsx`
- Create: `frontend/src/pages/QuizPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/features/quiz/QuizRunner.test.tsx`

**Interfaces:**
- Consumes: `useModuleQuiz`, `useExam`, `useSubmitQuiz`, `QueryState`, компоненты дизайн-системы.
- Produces:
  - `AnswerOption({ label, multiple, checked, disabled, state, onChange })`, где `state` — `"idle" | "correct" | "wrong" | "missed"`.
  - `ResultBanner({ result: QuizResult, onRetry })`.
  - `QuizRunner({ quiz: QuizPublic })` — прохождение и разбор.
  - Страница `QuizPage`, обслуживающая и тест модуля, и экзамен.

Все вопросы показываются одним списком; внизу одна кнопка проверки. После
проверки структура страницы не меняется: варианты окрашиваются, под каждым
вопросом появляется пояснение, сверху встаёт итог.

Состояния варианта после проверки: `correct` — выбран и верен; `wrong` — выбран и
неверен; `missed` — не выбран, но входит в правильный ответ.

- [ ] **Step 1: Написать падающий тест**

Создать `frontend/src/features/quiz/QuizRunner.test.tsx`:

```tsx
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { quizPublic, quizResult } from "../../test/mocks";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";
import { QuizRunner } from "./QuizRunner";

describe("QuizRunner", () => {
  it("показывает все вопросы сразу", () => {
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    expect(
      screen.getByText("Чем в Python выделяются блоки кода?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Что верно про Python?")).toBeInTheDocument();
  });

  it("использует переключатели для одиночного выбора и флажки для множественного", () => {
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("не даёт проверить, пока отвечены не все вопросы", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    expect(screen.getByRole("button", { name: "Проверить" })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    expect(screen.getByRole("button", { name: "Проверить" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Интерпретируемый язык" }));
    expect(screen.getByRole("button", { name: "Проверить" })).toBeEnabled();
  });

  it("отправляет выбранные варианты в порядке вопросов", async () => {
    const sent = vi.fn();
    server.use(
      http.post("/api/quizzes/submit", async ({ request }) => {
        sent(await request.json());
        return HttpResponse.json(quizResult);
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    await user.click(screen.getByRole("checkbox", { name: "Интерпретируемый язык" }));
    await user.click(screen.getByRole("checkbox", { name: "Язык общего назначения" }));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    await waitFor(() =>
      expect(sent).toHaveBeenCalledWith({
        course_id: "python-basics",
        scope: "module",
        module_id: "01-introduction",
        answers: [
          ["Отступами"],
          ["Интерпретируемый язык", "Язык общего назначения"],
        ],
      }),
    );
  });

  it("показывает итог и пояснения после проверки", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    await user.click(screen.getByRole("checkbox", { name: "Требует сборки" }));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    expect(await screen.findByText("1 из 2 · 50% · Незачёт")).toBeInTheDocument();
    expect(screen.getByText("Отступ — часть синтаксиса.")).toBeInTheDocument();
    expect(
      screen.getByText("Отдельный шаг сборки не требуется."),
    ).toBeInTheDocument();
  });

  it("позволяет пройти заново и очищает выбор", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    await user.click(screen.getByRole("checkbox", { name: "Требует сборки" }));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    await user.click(await screen.findByRole("button", { name: "Пройти заново" }));

    expect(screen.getByRole("radio", { name: "Отступами" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Проверить" })).toBeDisabled();
  });

  it("сообщает об ошибке отправки, не теряя выбранные ответы", async () => {
    server.use(
      http.post("/api/quizzes/submit", () =>
        HttpResponse.json({ detail: "Тест не найден" }, { status: 404 }),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    await user.click(screen.getByRole("checkbox", { name: "Требует сборки" }));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    expect(await screen.findByText("Тест не найден")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Отступами" })).toBeChecked();
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

```bash
npm run test -- --run src/features/quiz/QuizRunner.test.tsx
```

Ожидается: `Failed to resolve import "./QuizRunner"`.

- [ ] **Step 3: Реализовать вариант ответа**

Создать `frontend/src/features/quiz/AnswerOption.tsx`:

```tsx
import clsx from "clsx";

export type OptionState = "idle" | "correct" | "wrong" | "missed";

const STATES: Record<OptionState, string> = {
  idle: "border-line hover:bg-sunken",
  correct: "border-success bg-success-soft",
  wrong: "border-danger bg-danger-soft",
  missed: "border-success border-dashed",
};

export function AnswerOption({
  name,
  label,
  multiple,
  checked,
  disabled,
  state = "idle",
  onChange,
}: {
  name: string;
  label: string;
  multiple: boolean;
  checked: boolean;
  disabled?: boolean;
  state?: OptionState;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-start gap-3 rounded-control border p-3 text-sm",
        "transition-colors duration-150",
        disabled && "cursor-default",
        STATES[state],
      )}
    >
      <input
        type={multiple ? "checkbox" : "radio"}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
      />
      <span className="min-w-0">{label}</span>
    </label>
  );
}
```

- [ ] **Step 4: Реализовать итог попытки**

Создать `frontend/src/features/quiz/ResultBanner.tsx`:

```tsx
import clsx from "clsx";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";

import { Button } from "../../components/ui/Button";
import type { QuizResult } from "../../lib/api/types";

export function ResultBanner({
  result,
  onRetry,
}: {
  result: QuizResult;
  onRetry: () => void;
}) {
  const Icon = result.passed ? CheckCircle2 : XCircle;

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center justify-between gap-4 rounded-card p-4",
        result.passed ? "bg-success-soft" : "bg-danger-soft",
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          size={22}
          className={result.passed ? "text-success" : "text-danger"}
          aria-hidden="true"
        />
        <div>
          <p className="text-base font-semibold tabular-nums tracking-tight">
            {result.correct_count} из {result.total_questions} ·{" "}
            {result.score_percent}% · {result.passed ? "Зачёт" : "Незачёт"}
          </p>
          <p className="text-sm text-muted">
            Проходной балл — {result.pass_score}%
          </p>
        </div>
      </div>
      <Button variant="secondary" onClick={onRetry}>
        <RotateCcw size={16} />
        Пройти заново
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Реализовать прохождение теста**

Создать `frontend/src/features/quiz/QuizRunner.tsx`:

```tsx
import { useMemo, useState } from "react";

import { Callout } from "../../components/ui/Callout";
import { Button } from "../../components/ui/Button";
import { useSubmitQuiz } from "../../lib/api/queries";
import type { QuizPublic, QuizResult } from "../../lib/api/types";
import { AnswerOption, type OptionState } from "./AnswerOption";
import { ResultBanner } from "./ResultBanner";

function optionState(
  result: QuizResult | undefined,
  questionIndex: number,
  option: string,
): OptionState {
  if (!result) return "idle";
  const review = result.results[questionIndex];
  if (!review) return "idle";

  const selected = review.selected.includes(option);
  const correct = review.correct_answer.includes(option);

  if (selected && correct) return "correct";
  if (selected && !correct) return "wrong";
  if (!selected && correct) return "missed";
  return "idle";
}

export function QuizRunner({ quiz }: { quiz: QuizPublic }) {
  const [selections, setSelections] = useState<string[][]>(() =>
    quiz.questions.map(() => []),
  );
  const submit = useSubmitQuiz(quiz.course_id);
  const result = submit.data;
  const reviewing = result !== undefined;

  const answered = useMemo(
    () => selections.every((selected) => selected.length > 0),
    [selections],
  );

  function toggle(questionIndex: number, option: string, multiple: boolean) {
    setSelections((current) =>
      current.map((selected, index) => {
        if (index !== questionIndex) return selected;
        if (!multiple) return [option];
        return selected.includes(option)
          ? selected.filter((value) => value !== option)
          : [...selected, option];
      }),
    );
  }

  function check() {
    submit.mutate({
      course_id: quiz.course_id,
      scope: quiz.scope,
      module_id: quiz.module_id,
      answers: selections,
    });
  }

  function retry() {
    submit.reset();
    setSelections(quiz.questions.map(() => []));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-8">
      {result ? <ResultBanner result={result} onRetry={retry} /> : null}

      <ol className="flex flex-col gap-8">
        {quiz.questions.map((question, index) => {
          const review = result?.results[index];
          return (
            <li key={question.index} className="flex flex-col gap-3">
              <p className="font-medium">
                <span className="text-subtle">{index + 1}.</span> {question.question}
              </p>

              <div className="flex flex-col gap-2">
                {question.options.map((option) => (
                  <AnswerOption
                    key={option}
                    name={`question-${question.index}`}
                    label={option}
                    multiple={question.multiple}
                    checked={selections[index]?.includes(option) ?? false}
                    disabled={reviewing}
                    state={optionState(result, index, option)}
                    onChange={() => toggle(index, option, question.multiple)}
                  />
                ))}
              </div>

              {review ? (
                <Callout
                  tone={review.is_correct ? "success" : "danger"}
                  title={review.is_correct ? "Верно" : "Неверно"}
                >
                  {review.explanation}
                </Callout>
              ) : null}
            </li>
          );
        })}
      </ol>

      {submit.error ? (
        <Callout tone="danger" title="Не удалось отправить ответы">
          {submit.error.message}
        </Callout>
      ) : null}

      {reviewing ? null : (
        <div className="flex items-center gap-4 border-t border-line pt-6">
          <Button size="lg" onClick={check} disabled={!answered || submit.isPending}>
            Проверить
          </Button>
          {answered ? null : (
            <span className="text-sm text-muted">Ответьте на все вопросы</span>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Реализовать страницу теста**

Создать `frontend/src/pages/QuizPage.tsx`:

```tsx
import { useParams } from "react-router";

import { QueryState } from "../components/QueryState";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { QuizRunner } from "../features/quiz/QuizRunner";
import { useCourse, useExam, useModuleQuiz } from "../lib/api/queries";

export function QuizPage({ scope }: { scope: "module" | "exam" }) {
  const { courseId = "", moduleId = "" } = useParams();

  const moduleQuiz = useModuleQuiz(courseId, moduleId);
  const exam = useExam(courseId);
  const quiz = scope === "exam" ? exam : moduleQuiz;
  const course = useCourse(courseId);

  return (
    <QueryState isLoading={quiz.isLoading} error={quiz.error}>
      {quiz.data ? (
        <div className="flex flex-col gap-8">
          <Breadcrumbs
            items={[
              { label: "Курсы", to: "/" },
              { label: course.data?.title ?? "Курс", to: `/courses/${courseId}` },
              { label: quiz.data.title },
            ]}
          />
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{quiz.data.title}</h1>
            <p className="text-sm text-muted">
              {quiz.data.questions.length} вопросов · проходной балл{" "}
              {quiz.data.pass_score}%
            </p>
          </header>

          <QuizRunner quiz={quiz.data} />
        </div>
      ) : null}
    </QueryState>
  );
}
```

Хук `useExam` вызывается всегда, но при `scope === "module"` его результат не
используется. Чтобы не дёргать сервер зря, экзамен запрашивается только когда он
нужен: передать в `useExam` признак включения. Дополнить `useExam` в
`frontend/src/lib/api/queries.ts` необязательным параметром:

```ts
export function useExam(
  courseId: string,
  enabled = true,
): UseQueryResult<QuizPublic, ApiError> {
  return useQuery({
    queryKey: queryKeys.exam(courseId),
    queryFn: () => apiFetch<QuizPublic>(`/api/courses/${courseId}/exam`),
    enabled,
  });
}
```

И так же дополнить `useModuleQuiz`:

```ts
export function useModuleQuiz(
  courseId: string,
  moduleId: string,
  enabled = true,
): UseQueryResult<QuizPublic, ApiError> {
  return useQuery({
    queryKey: queryKeys.moduleQuiz(courseId, moduleId),
    queryFn: () => apiFetch<QuizPublic>(`/api/courses/${courseId}/quizzes/${moduleId}`),
    enabled,
  });
}
```

В `QuizPage` вызывать их с признаком:

```tsx
  const moduleQuiz = useModuleQuiz(courseId, moduleId, scope === "module");
  const exam = useExam(courseId, scope === "exam");
```

- [ ] **Step 7: Подключить маршруты**

В `frontend/src/App.tsx` добавить два маршрута:

```tsx
        <Route path="/courses/:courseId/exam" element={<QuizPage scope="exam" />} />
        <Route
          path="/courses/:courseId/:moduleId/quiz"
          element={<QuizPage scope="module" />}
        />
```

React Router выбирает маршрут по точности совпадения, а не по порядку записи:
статический отрезок `quiz` всегда выигрывает у изменяемого `:lessonId`, поэтому
адрес `/courses/python-basics/01-introduction/quiz` попадёт на тест, а не на урок
с именем `quiz`. Порядок строк в файле на это не влияет.

- [ ] **Step 8: Запустить тесты и убедиться, что они проходят**

```bash
npm run test -- --run && npm run typecheck
```

Ожидается: все тесты PASSED (7 новых), типы без ошибок.

- [ ] **Step 9: Коммит**

```bash
git add frontend
git commit -m "feat: прохождение теста с разбором ответов"
```

---

### Task 10: История попыток и страница состояния содержимого

**Files:**
- Create: `frontend/src/pages/ResultsPage.tsx`, `frontend/src/pages/HealthPage.tsx`, `frontend/src/pages/NotFoundPage.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/components/Layout.tsx`
- Test: `frontend/src/pages/ResultsPage.test.tsx`, `frontend/src/pages/HealthPage.test.tsx`

**Interfaces:**
- Consumes: `useAttempts`, `useContentHealth`, `useCourse`, компоненты дизайн-системы.
- Produces: страницы `/courses/:courseId/results`, `/health`, страница «не найдено»; ссылка на состояние содержимого в шапке.

- [ ] **Step 1: Написать падающие тесты**

Создать `frontend/src/pages/ResultsPage.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { ResultsPage } from "./ResultsPage";

function renderPage() {
  return renderWithProviders(<ResultsPage />, {
    route: "/courses/python-basics/results",
    path: "/courses/:courseId/results",
  });
}

describe("ResultsPage", () => {
  it("показывает попытки, новые сверху", async () => {
    renderPage();

    const scores = await screen.findAllByTestId("attempt-score");
    expect(scores[0]).toHaveTextContent("100%");
    expect(scores[1]).toHaveTextContent("50%");
  });

  it("отмечает зачёт и незачёт", async () => {
    renderPage();

    expect(await screen.findByText("Зачёт")).toBeInTheDocument();
    expect(screen.getByText("Незачёт")).toBeInTheDocument();
  });

  it("раскрывает разбор попытки", async () => {
    const user = userEvent.setup();
    renderPage();

    const buttons = await screen.findAllByRole("button", { name: /Разбор/ });
    await user.click(buttons[0]);

    expect(
      await screen.findByText("Отступ — часть синтаксиса."),
    ).toBeInTheDocument();
  });

  it("показывает пустое состояние, когда попыток нет", async () => {
    server.use(http.get("/api/progress/attempts/:course", () => HttpResponse.json([])));

    renderPage();

    expect(await screen.findByText("Попыток пока нет")).toBeInTheDocument();
  });
});
```

Создать `frontend/src/pages/HealthPage.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { HealthPage } from "./HealthPage";

describe("HealthPage", () => {
  it("сообщает, что с курсами всё в порядке", async () => {
    renderWithProviders(<HealthPage />);

    expect(await screen.findByText("Все курсы читаются")).toBeInTheDocument();
  });

  it("показывает ошибки с точным местом", async () => {
    server.use(
      http.get("/api/health/content", () =>
        HttpResponse.json({
          ok: false,
          course_count: 0,
          errors: [
            {
              course_id: "python-basics",
              location: "02-syntax/quiz.yaml",
              message: 'ответ "9" отсутствует среди вариантов',
            },
          ],
          warnings: [],
        }),
      ),
    );

    renderWithProviders(<HealthPage />);

    expect(await screen.findByText("02-syntax/quiz.yaml")).toBeInTheDocument();
    expect(
      screen.getByText('ответ "9" отсутствует среди вариантов'),
    ).toBeInTheDocument();
  });

  it("показывает предупреждения отдельно от ошибок", async () => {
    server.use(
      http.get("/api/health/content", () =>
        HttpResponse.json({
          ok: true,
          course_count: 1,
          errors: [],
          warnings: [
            {
              course_id: "python-basics",
              location: "01-introduction/03-extra.md",
              message: "нет заголовка первого уровня, название взято из имени файла",
            },
          ],
        }),
      ),
    );

    renderWithProviders(<HealthPage />);

    expect(await screen.findByText("Предупреждения")).toBeInTheDocument();
    expect(screen.getByText("01-introduction/03-extra.md")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
npm run test -- --run src/pages/ResultsPage.test.tsx src/pages/HealthPage.test.tsx
```

Ожидается: ошибки разрешения импортов.

- [ ] **Step 3: Реализовать историю попыток**

Создать `frontend/src/pages/ResultsPage.tsx`:

```tsx
import { useState } from "react";
import { useParams } from "react-router";

import { QueryState } from "../components/QueryState";
import { Badge } from "../components/ui/Badge";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { useAttempts, useCourse } from "../lib/api/queries";
import type { AttemptSummary } from "../lib/api/types";

function formatMoment(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AttemptCard({ attempt }: { attempt: AttemptSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              {attempt.scope === "exam" ? "Финальный экзамен" : "Тест модуля"}
              {attempt.module_id ? (
                <span className="text-muted"> · {attempt.module_id}</span>
              ) : null}
            </p>
            <p className="text-xs text-subtle">{formatMoment(attempt.created_at)}</p>
          </div>

          <div className="flex items-center gap-3">
            <span
              data-testid="attempt-score"
              className="text-base font-semibold tabular-nums"
            >
              {attempt.score_percent}%
            </span>
            <Badge tone={attempt.passed ? "success" : "danger"}>
              {attempt.passed ? "Зачёт" : "Незачёт"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>
              {open ? "Скрыть разбор" : "Разбор"}
            </Button>
          </div>
        </div>

        {open ? (
          <ol className="flex flex-col gap-4 border-t border-line pt-4">
            {attempt.results.map((review, index) => (
              <li key={index} className="flex flex-col gap-2 text-sm">
                <p className="font-medium">
                  <span className="text-subtle">{index + 1}.</span> {review.question}
                </p>
                <p className="text-muted">
                  Ваш ответ: {review.selected.join(", ") || "нет ответа"}
                </p>
                {review.is_correct ? null : (
                  <p className="text-muted">
                    Правильный ответ: {review.correct_answer.join(", ")}
                  </p>
                )}
                <Callout tone={review.is_correct ? "success" : "danger"}>
                  {review.explanation}
                </Callout>
              </li>
            ))}
          </ol>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function ResultsPage() {
  const { courseId = "" } = useParams();
  const attempts = useAttempts(courseId);
  const course = useCourse(courseId);

  return (
    <QueryState isLoading={attempts.isLoading} error={attempts.error}>
      <div className="flex flex-col gap-8">
        <Breadcrumbs
          items={[
            { label: "Курсы", to: "/" },
            { label: course.data?.title ?? "Курс", to: `/courses/${courseId}` },
            { label: "История попыток" },
          ]}
        />
        <h1 className="text-2xl font-semibold tracking-tight">История попыток</h1>

        {attempts.data && attempts.data.length > 0 ? (
          <div className="flex flex-col gap-4">
            {attempts.data.map((attempt) => (
              <AttemptCard key={attempt.id} attempt={attempt} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Попыток пока нет"
            description="Пройдите тест модуля или финальный экзамен — результат появится здесь."
          />
        )}
      </div>
    </QueryState>
  );
}
```

- [ ] **Step 4: Реализовать страницу состояния и страницу «не найдено»**

Создать `frontend/src/pages/HealthPage.tsx`:

```tsx
import { QueryState } from "../components/QueryState";
import { Callout } from "../components/ui/Callout";
import { Card, CardBody } from "../components/ui/Card";
import { useContentHealth } from "../lib/api/queries";
import type { ContentErrorOut } from "../lib/api/types";

function IssueList({ items }: { items: ContentErrorOut[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item, index) => (
        <li key={index} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <p className="font-mono text-xs text-subtle">
            {item.course_id} / {item.location}
          </p>
          <p className="text-sm">{item.message}</p>
        </li>
      ))}
    </ul>
  );
}

export function HealthPage() {
  const { data, isLoading, error } = useContentHealth();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {data ? (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Состояние содержимого
            </h1>
            <p className="text-sm text-muted">
              Курсов прочитано: {data.course_count}. Здесь видно, что мешает курсу
              попасть в каталог. Формат описан в docs/course-format.md.
            </p>
          </header>

          {data.ok ? (
            <Callout tone="success" title="Все курсы читаются">
              Ошибок в файлах курсов нет.
            </Callout>
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Ошибки</h2>
              <Card>
                <CardBody>
                  <IssueList items={data.errors} />
                </CardBody>
              </Card>
            </section>
          )}

          {data.warnings.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Предупреждения</h2>
              <Card>
                <CardBody>
                  <IssueList items={data.warnings} />
                </CardBody>
              </Card>
            </section>
          ) : null}
        </div>
      ) : null}
    </QueryState>
  );
}
```

Создать `frontend/src/pages/NotFoundPage.tsx`:

```tsx
import { Link } from "react-router";

import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export function NotFoundPage() {
  return (
    <EmptyState
      title="Страница не найдена"
      description="Похоже, такого адреса здесь нет."
      action={
        <Link to="/">
          <Button variant="secondary">Вернуться к курсам</Button>
        </Link>
      }
    />
  );
}
```

- [ ] **Step 5: Подключить маршруты и ссылку на состояние**

Заменить `frontend/src/App.tsx` целиком:

```tsx
import { Route, Routes } from "react-router";

import { Layout } from "./components/Layout";
import { CoursePage } from "./pages/CoursePage";
import { DesignPage } from "./pages/DesignPage";
import { HealthPage } from "./pages/HealthPage";
import { HomePage } from "./pages/HomePage";
import { LessonPage } from "./pages/LessonPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { QuizPage } from "./pages/QuizPage";
import { ResultsPage } from "./pages/ResultsPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/courses/:courseId" element={<CoursePage />} />
        <Route path="/courses/:courseId/results" element={<ResultsPage />} />
        <Route path="/courses/:courseId/exam" element={<QuizPage scope="exam" />} />
        <Route
          path="/courses/:courseId/:moduleId/quiz"
          element={<QuizPage scope="module" />}
        />
        <Route path="/courses/:courseId/:moduleId/:lessonId" element={<LessonPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
```

В `frontend/src/components/Layout.tsx` добавить в шапку ссылку на состояние
содержимого, слева от переключателя темы:

```tsx
          <div className="flex items-center gap-2">
            <Link
              to="/health"
              title="Состояние содержимого"
              className="inline-flex size-9 items-center justify-center rounded-control
                border border-line text-muted transition-colors duration-150
                hover:bg-sunken hover:text-body"
            >
              <Stethoscope size={18} />
            </Link>
            <ThemeToggle />
          </div>
```

Импорт значка дополнить: `import { GraduationCap, Stethoscope } from "lucide-react";`

Тест `src/App.test.tsx` проверяет текст «Страница не найдена» — он остаётся
верным, так как `NotFoundPage` показывает тот же заголовок.

- [ ] **Step 6: Запустить тесты и убедиться, что они проходят**

```bash
npm run test -- --run && npm run typecheck
```

Ожидается: все тесты PASSED (7 новых), типы без ошибок.

- [ ] **Step 7: Коммит**

```bash
git add frontend
git commit -m "feat: история попыток, состояние содержимого и страница «не найдено»"
```

---

### Task 11: Итоговая сверка и документация запуска

**Files:**
- Modify: `README.md`
- Test: ручная сверка с критериями готовности спецификации

**Interfaces:**
- Consumes: всё построенное ранее.
- Produces: описание запуска фронтенда в README и подтверждённые критерии готовности версии 1.0.

- [ ] **Step 1: Прогнать всю проверку**

Из `frontend/`:

```bash
npm run test -- --run && npm run typecheck && npm run build
```

Ожидается: все тесты PASSED, типы без ошибок, сборка проходит.

- [ ] **Step 2: Поднять всё вместе**

Из корня репозитория:

```bash
docker compose up -d
```

В отдельном окне из `backend/`:

```bash
uv run uvicorn app.main:app --reload --port 8000
```

В отдельном окне из `frontend/`:

```bash
npm run dev
```

- [ ] **Step 3: Сверить с критериями готовности раздела 10 спецификации**

Проверить вживую и записать фактический результат по каждому пункту:

1. Создать папку `content/test-course` с минимальным `course.yaml`, одним модулем и уроком; обновить главную — курс появился без перезапуска и пересборки. Удалить папку, обновить — исчез.
2. Сломать `content/python-basics/02-syntax/quiz.yaml` (например, заменить правильный ответ на отсутствующий среди вариантов); открыть `/health` — ошибка видна понятным текстом с указанием файла. Восстановить файл, убедиться, что страница снова чистая.
3. Пройти курс от начала до конца, нажимая только главную кнопку на каждом экране: уроки, тест модуля, следующий модуль, финальный экзамен.
4. Перезапустить бэкенд и перезагрузить браузер — прогресс на месте.
5. Главная предлагает продолжить с того урока, на котором остановились, и называет его.
6. Пройти тест модуля дважды с разными ответами; обе попытки видны на `/courses/python-basics/results`, разбор раскрывается.
7. Открыть вкладку сети в браузере, запросить тест модуля — в ответе нет ни правильных ответов, ни пояснений.
8. Переключить тему на каждом экране — ни один не теряет читаемость.
9. Открыть `/design` — все токены и компоненты отображаются.
10. Выгрузить прогресс: `curl -s http://localhost:8000/api/progress/export` возвращает JSON со всеми тремя разделами.

Если какой-либо пункт не выполняется, это дефект: доложить его контроллеру, а не
подгонять критерий.

- [ ] **Step 4: Дополнить README**

В `README.md` добавить раздел про фронтенд после раздела про запуск бэкенда:

```markdown
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

## Дизайн

Все значения оформления заданы в `frontend/src/styles/tokens.css` — это
единственное место, где их правят. Живой каталог компонентов открывается по
адресу `http://localhost:5173/design`, правила словами — в
`docs/design-system.md`.
```

- [ ] **Step 5: Коммит**

```bash
git add README.md
git commit -m "docs: запуск фронтенда и дизайн-системы"
```

---

## Проверка плана на полноту

Разделы спецификации и задачи, которые их реализуют:

| Раздел спецификации | Задачи |
| --- | --- |
| 7.1 Экраны | 4, 6, 7, 8, 9, 10 |
| 7.2 Возврат к месту остановки | 6, 7, 8 |
| 7.3 Раскладка урока | 7, 8 |
| 7.4 Прохождение теста | 9 |
| 7.5 Организация кода и состояние | 1, 5 |
| 8.1 Размещение дизайн-системы | 2, 3, 4 |
| 8.2 Токены | 2 |
| 8.3 Правила | 4 |
| 8.4 Состав компонентов | 3 |
| 10 Критерии готовности | 11 |

Компоненты `GlassPanel`, `Tabs`, `ModuleTree`, `AnswerOption`, `ResultBanner`,
`Callout`, `Breadcrumbs`, `EmptyState`, `Skeleton`, `ThemeToggle`, `ProgressBar`,
`ProgressRing`, `Badge`, `Card`, `Button` — все из раздела 8.4 спецификации —
созданы в Задачах 3 и 9 и показаны в каталоге Задачи 4.
