import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "../theme/ThemeProvider";
import { DesignPage } from "./DesignPage";

function renderPage() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <DesignPage />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("DesignPage", () => {
  it("показывает все разделы каталога", () => {
    renderPage();

    for (const section of [
      "Цвет",
      "Типографика",
      "Пространство",
      "Скругления и глубина",
      "Стекло",
      "Компоненты",
    ]) {
      expect(screen.getByRole("heading", { name: section })).toBeInTheDocument();
    }
  });

  it("показывает кнопки во всех состояниях, включая заблокированное", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Основная" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Заблокирована" })).toBeDisabled();
  });
});
