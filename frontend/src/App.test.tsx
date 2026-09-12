import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import App from "./App";
import { ThemeProvider } from "./theme/ThemeProvider";

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("App", () => {
  it("показывает название платформы в шапке", () => {
    renderAt("/");
    expect(screen.getByRole("banner")).toHaveTextContent("FreeTraining");
  });

  it("показывает страницу «не найдено» для неизвестного адреса", () => {
    renderAt("/такой-страницы-нет");
    expect(screen.getByText("Страница не найдена")).toBeInTheDocument();
  });
});
