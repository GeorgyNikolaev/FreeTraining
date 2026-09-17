import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { authSession } from "../../test/mocks";
import { server } from "../../test/server";
import { applySession } from "../auth/session";
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

describe("apiFetch и сессия", () => {
  it("на 401 обновляет токен и повторяет запрос с новым", async () => {
    const seen: (string | null)[] = [];
    server.use(
      http.get("/api/courses/:course", ({ request }) => {
        const header = request.headers.get("Authorization");
        seen.push(header);
        return header === "Bearer fresh"
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ detail: "Сессия истекла" }, { status: 401 });
      }),
      http.post("/api/auth/refresh", () =>
        HttpResponse.json({ ...authSession, access_token: "fresh" }),
      ),
    );
    applySession({ ...authSession, access_token: "stale" });

    await expect(apiFetch("/api/courses/python-basics")).resolves.toEqual({ ok: true });
    expect(seen).toEqual(["Bearer stale", "Bearer fresh"]);
  });
});
