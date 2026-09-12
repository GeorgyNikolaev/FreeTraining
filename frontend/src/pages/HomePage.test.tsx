import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { courseCompletedWithResume, courseInProgress, courseSummary } from "../test/mocks";
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

  it("предлагает повторить пройденный курс и не показывает его в блоке продолжения", async () => {
    server.use(
      http.get("/api/courses", () => HttpResponse.json([courseCompletedWithResume])),
    );

    renderWithProviders(<HomePage />);

    expect(await screen.findByText("Повторить")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Продолжить обучение" })).toBeNull();
  });
});
