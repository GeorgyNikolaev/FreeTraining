import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { attempts } from "../test/mocks";
import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { ResultsPage } from "./ResultsPage";

function renderPage() {
  return renderWithProviders(<ResultsPage />, {
    route: "/courses/python-basics/results",
    path: "/courses/:courseId/results",
  });
}

describe("ResultsPage", () => {
  it("показывает попытки в том порядке, в котором их прислал сервер", async () => {
    renderPage();

    const scores = await screen.findAllByTestId("attempt-score");
    expect(scores[0]).toHaveTextContent("100%");
    expect(scores[1]).toHaveTextContent("50%");
  });

  it("отмечает зачёт и незачёт", async () => {
    renderPage();

    expect(await screen.findByText("Зачёт")).toBeInTheDocument();
    expect(screen.getByText("Незачёт")).toBeInTheDocument();
  });

  it("раскрывает разбор попытки", async () => {
    const user = userEvent.setup();
    renderPage();

    const buttons = await screen.findAllByRole("button", { name: /Разбор/ });
    await user.click(buttons[0]);

    expect(
      await screen.findByText("Отступ — часть синтаксиса."),
    ).toBeInTheDocument();
  });

  it("показывает пустое состояние, когда попыток нет", async () => {
    server.use(http.get("/api/progress/attempts/:course", () => HttpResponse.json([])));

    renderPage();

    expect(await screen.findByText("Попыток пока нет")).toBeInTheDocument();
  });

  it("показывает название модуля, а не идентификатор папки", async () => {
    renderPage();

    expect((await screen.findAllByText(/Введение/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/01-introduction/)).toBeNull();
  });

  it("скрывает подпись модуля, если модуль не найден в курсе", async () => {
    server.use(
      http.get("/api/progress/attempts/:course", () =>
        HttpResponse.json([{ ...attempts[0], module_id: "removed-module" }]),
      ),
    );

    renderPage();

    await screen.findAllByTestId("attempt-score");
    expect(screen.queryByText(/removed-module/)).toBeNull();
  });
});
