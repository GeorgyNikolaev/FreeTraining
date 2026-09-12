import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../test/render";
import { useTheme } from "../theme/ThemeProvider";
import { MermaidDiagram } from "./MermaidDiagram";

const renderMock = vi.fn();
const initializeMock = vi.fn();

vi.mock("mermaid", () => ({
  default: {
    initialize: (...args: unknown[]) => initializeMock(...args),
    render: (...args: unknown[]) => renderMock(...args),
  },
}));

function ThemeSwitcher() {
  const { toggle } = useTheme();
  return (
    <button type="button" onClick={toggle}>
      переключить тему
    </button>
  );
}

describe("MermaidDiagram", () => {
  beforeEach(() => {
    renderMock.mockReset();
    initializeMock.mockReset();
    localStorage.clear();
  });

  it("отрисовывает схему, полученную от mermaid, с подписью для скринридера", async () => {
    renderMock.mockResolvedValue({ svg: "<svg><text>граф последовательности</text></svg>" });

    renderWithProviders(<MermaidDiagram code="graph TD; A-->B;" />);

    const diagram = await screen.findByRole("img", {
      name: /диаграмма/i,
    });
    await waitFor(() =>
      expect(diagram.innerHTML).toContain("граф последовательности"),
    );
    expect(renderMock).toHaveBeenCalledWith(
      expect.any(String),
      "graph TD; A-->B;",
    );
  });

  it("при ошибке разбора показывает сообщение об ошибке и исходный текст схемы", async () => {
    renderMock.mockRejectedValue(new Error("Parse error on line 1: неверный узел"));

    renderWithProviders(<MermaidDiagram code="это не схема" />);

    expect(
      await screen.findByText("Не удалось построить схему"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Parse error on line 1: неверный узел/),
    ).toBeInTheDocument();
    expect(screen.getByText("это не схема")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("инициализирует mermaid темой приложения и перерисовывает схему при её смене", async () => {
    renderMock.mockResolvedValue({ svg: "<svg></svg>" });
    localStorage.setItem("freetraining-theme", "light");

    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ThemeSwitcher />
        <MermaidDiagram code="graph TD; A-->B;" />
      </>,
    );

    await waitFor(() =>
      expect(initializeMock).toHaveBeenCalledWith(
        expect.objectContaining({ theme: "default" }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "переключить тему" }));

    await waitFor(() =>
      expect(initializeMock).toHaveBeenCalledWith(
        expect.objectContaining({ theme: "dark" }),
      ),
    );
  });
});
