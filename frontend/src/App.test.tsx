import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import App from "./App";
import { AuthProvider } from "./lib/auth/AuthProvider";
import { createTestQueryClient } from "./test/render";
import { ThemeProvider } from "./theme/ThemeProvider";

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("App", () => {
  it("показывает название платформы в шапке", () => {
    renderAt("/");
    expect(screen.getByRole("banner")).toHaveTextContent("FreeTraining");
  });

  it("показывает страницу «не найдено» для неизвестного адреса", async () => {
    renderAt("/такой-страницы-нет");
    expect(await screen.findByText("Страница не найдена")).toBeInTheDocument();
  });
});
