import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { quizPublic, quizResult } from "../../test/mocks";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";
import { QuizRunner } from "./QuizRunner";

describe("QuizRunner", () => {
  it("показывает все вопросы сразу", () => {
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    expect(
      screen.getByText("Чем в Python выделяются блоки кода?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Что верно про Python?")).toBeInTheDocument();
  });

  it("использует переключатели для одиночного выбора и флажки для множественного", () => {
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("не даёт проверить, пока отвечены не все вопросы", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    expect(screen.getByRole("button", { name: "Проверить" })).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    expect(screen.getByRole("button", { name: "Проверить" })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "Интерпретируемый язык" }));
    expect(screen.getByRole("button", { name: "Проверить" })).toBeEnabled();
  });

  it("отправляет выбранные варианты в порядке вопросов", async () => {
    const sent = vi.fn();
    server.use(
      http.post("/api/quizzes/submit", async ({ request }) => {
        sent(await request.json());
        return HttpResponse.json(quizResult);
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    await user.click(screen.getByRole("checkbox", { name: "Интерпретируемый язык" }));
    await user.click(screen.getByRole("checkbox", { name: "Язык общего назначения" }));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    await waitFor(() =>
      expect(sent).toHaveBeenCalledWith({
        course_id: "python-basics",
        scope: "module",
        module_id: "01-introduction",
        answers: [
          ["Отступами"],
          ["Интерпретируемый язык", "Язык общего назначения"],
        ],
      }),
    );
  });

  it("показывает итог и пояснения после проверки", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    await user.click(screen.getByRole("checkbox", { name: "Требует сборки" }));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    expect(await screen.findByText("1 из 2 · 50% · Незачёт")).toBeInTheDocument();
    expect(screen.getByText("Отступ — часть синтаксиса.")).toBeInTheDocument();
    expect(
      screen.getByText("Отдельный шаг сборки не требуется."),
    ).toBeInTheDocument();
  });

  it("позволяет пройти заново и очищает выбор", async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    await user.click(screen.getByRole("checkbox", { name: "Требует сборки" }));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    await user.click(await screen.findByRole("button", { name: "Пройти заново" }));

    expect(screen.getByRole("radio", { name: "Отступами" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Проверить" })).toBeDisabled();
  });

  it("сообщает об ошибке отправки, не теряя выбранные ответы", async () => {
    server.use(
      http.post("/api/quizzes/submit", () =>
        HttpResponse.json({ detail: "Тест не найден" }, { status: 404 }),
      ),
    );

    const user = userEvent.setup();
    renderWithProviders(<QuizRunner quiz={quizPublic} />);

    await user.click(screen.getByRole("radio", { name: "Отступами" }));
    await user.click(screen.getByRole("checkbox", { name: "Требует сборки" }));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    expect(await screen.findByText("Тест не найден")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Отступами" })).toBeChecked();
  });
});
