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
      await screen.findByRole("link", { name: /Тест модуля.*100%/ }),
    ).toBeInTheDocument();
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
