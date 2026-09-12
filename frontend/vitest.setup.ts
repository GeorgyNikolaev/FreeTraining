import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";

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

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
