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
