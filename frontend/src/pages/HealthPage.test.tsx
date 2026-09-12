import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { HealthPage } from "./HealthPage";

describe("HealthPage", () => {
  it("сообщает, что с курсами всё в порядке", async () => {
    renderWithProviders(<HealthPage />);

    expect(await screen.findByText("Все курсы читаются")).toBeInTheDocument();
  });

  it("показывает ошибки с точным местом", async () => {
    server.use(
      http.get("/api/health/content", () =>
        HttpResponse.json({
          ok: false,
          course_count: 0,
          errors: [
            {
              course_id: "python-basics",
              location: "02-syntax/quiz.yaml",
              message: 'ответ "9" отсутствует среди вариантов',
            },
          ],
          warnings: [],
        }),
      ),
    );

    renderWithProviders(<HealthPage />);

    expect(await screen.findByText("02-syntax/quiz.yaml")).toBeInTheDocument();
    expect(
      screen.getByText('ответ "9" отсутствует среди вариантов'),
    ).toBeInTheDocument();
  });

  it("показывает предупреждения отдельно от ошибок", async () => {
    server.use(
      http.get("/api/health/content", () =>
        HttpResponse.json({
          ok: true,
          course_count: 1,
          errors: [],
          warnings: [
            {
              course_id: "python-basics",
              location: "01-introduction/03-extra.md",
              message: "нет заголовка первого уровня, название взято из имени файла",
            },
          ],
        }),
      ),
    );

    renderWithProviders(<HealthPage />);

    expect(await screen.findByText("Предупреждения")).toBeInTheDocument();
    expect(screen.getByText("01-introduction/03-extra.md")).toBeInTheDocument();
  });
});
