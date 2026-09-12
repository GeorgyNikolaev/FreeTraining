# Фронтенд FreeTraining

Каталог с фронтендом платформы (Vite + React + TypeScript). Обращения к API идут на относительный путь `/api/...`, который Vite проксирует на бэкенд (`http://localhost:8000`).

- Разработка: `npm run dev` — сервер на `http://localhost:5173` (бэкенд должен быть запущен отдельно).
- Проверка перед коммитом: `npm run test -- --run` и `npm run typecheck`.
- Сборка: `npm run build`.
- Типы API порождаются из схемы работающего бэкенда командой `npm run api:types` (файл `src/lib/api/schema.ts` не редактируется вручную).
