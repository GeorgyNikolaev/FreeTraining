import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";

import { applySession } from "./src/lib/auth/session";
import { server } from "./src/test/server";

// jsdom не реализует window.matchMedia. Даём управляемую заглушку: тесты
// явно задают системное предпочтение через setPrefersDark(), а не полагаются
// на молчаливое отсутствие API (как было бы с необязательной цепочкой в коде).
let prefersDark = false;

export function setPrefersDark(value: boolean): void {
  prefersDark = value;
}

window.matchMedia = ((query: string) => ({
  matches: query.includes("prefers-color-scheme: dark") ? prefersDark : false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;

// jsdom не умеет прокручивать окно и печатает «Not implemented» на каждый
// вызов. Заглушка убирает шум и позволяет тестам следить за сбросом прокрутки.
window.scrollTo = (() => {}) as typeof window.scrollTo;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  applySession(null);
});
afterAll(() => server.close());
