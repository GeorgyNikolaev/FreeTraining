import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("показывает название платформы в шапке", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("banner")).toHaveTextContent("FreeTraining");
  });

  it("показывает страницу «не найдено» для неизвестного адреса", () => {
    render(
      <MemoryRouter initialEntries={["/такой-страницы-нет"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("Страница не найдена")).toBeInTheDocument();
  });
});
