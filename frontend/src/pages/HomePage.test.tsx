import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import {
  courseCompletedWithResume,
  courseInProgress,
  courseSummary,
} from "../test/mocks";
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

  it("выгружает прогресс в JSON по нажатию кнопки", async () => {
    const requested = vi.fn();
    server.use(
      http.get("/api/progress/export", () => {
        requested();
        return HttpResponse.json({
          user_id: "local-user",
          exported_at: "2026-09-13T09:00:00Z",
          lessons: [],
          attempts: [],
          positions: [],
        });
      }),
    );

    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    try {
      const user = userEvent.setup();
      renderWithProviders(<HomePage />);

      await user.click(
        await screen.findByRole("button", { name: "Выгрузить прогресс" }),
      );

      await waitFor(() => expect(requested).toHaveBeenCalled());
      await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
      expect(await screen.findByText("Основы Python")).toBeInTheDocument();
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it("показывает ошибку, когда выгрузка прогресса не удалась", async () => {
    server.use(
      http.get("/api/progress/export", () =>
        HttpResponse.json({ detail: "Внутренняя ошибка" }, { status: 500 }),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<HomePage />);

    await user.click(
      await screen.findByRole("button", { name: "Выгрузить прогресс" }),
    );

    expect(await screen.findByText("Внутренняя ошибка")).toBeInTheDocument();
  });
});
