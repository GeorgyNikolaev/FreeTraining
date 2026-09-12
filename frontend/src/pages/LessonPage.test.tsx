import { screen, waitFor, within } from "@testing-library/react";
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

    const article = await screen.findByRole("article");
    expect(
      within(article).getByRole("link", { name: /Что такое Python/ }),
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
