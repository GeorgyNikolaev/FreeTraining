import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { homeworkDetail } from "../test/mocks";
import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { HomeworkPage } from "./HomeworkPage";

function renderPage(route = "/courses/python-basics/01-introduction/homework") {
  return renderWithProviders(<HomeworkPage />, {
    route,
    path: "/courses/:courseId/:moduleId/homework",
  });
}

describe("HomeworkPage", () => {
  it("отображает текст задания", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        name: "Домашнее задание к введению",
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Установите Python и выведите версию."),
    ).toBeInTheDocument();
  });

  it("сообщает, что задание не проверяется", async () => {
    renderPage();

    expect(await screen.findByText("Без проверки")).toBeInTheDocument();
  });

  it("ведёт к тесту модуля и обратно к последнему уроку", async () => {
    renderPage();
    await screen.findByRole("heading", {
      name: "Домашнее задание к введению",
      level: 1,
    });

    const article = screen.getByRole("article");
    expect(
      within(article).getByRole("link", { name: /Установка и запуск/ }),
    ).toHaveAttribute(
      "href",
      "/courses/python-basics/01-introduction/02-installation",
    );
    expect(
      within(article).getByRole("link", { name: /К тесту модуля/ }),
    ).toHaveAttribute("href", "/courses/python-basics/01-introduction/quiz");
  });

  it("после задания без следующего шага возвращает к курсу", async () => {
    server.use(
      http.get("/api/courses/:course/homework/:module", () =>
        HttpResponse.json({ ...homeworkDetail, next: null }),
      ),
    );

    renderPage();
    await screen.findByRole("heading", {
      name: "Домашнее задание к введению",
      level: 1,
    });

    const article = screen.getByRole("article");
    expect(
      within(article).getByRole("link", { name: /Вернуться к курсу/ }),
    ).toHaveAttribute("href", "/courses/python-basics");
  });

  it("показывает понятную ошибку, когда задания нет", async () => {
    server.use(
      http.get("/api/courses/:course/homework/:module", () =>
        HttpResponse.json({ detail: "Домашнее задание не найдено" }, { status: 404 }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Домашнее задание не найдено")).toBeInTheDocument();
  });
});
