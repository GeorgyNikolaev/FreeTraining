import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// Тот же пакет, из которого `Markdown` берёт оформление формул.
import katex from "katex";
import { describe, expect, it, vi } from "vitest";

import { Markdown } from "./Markdown";

vi.mock("./MermaidDiagram", () => ({
  MermaidDiagram: ({ code }: { code: string }) => (
    <div data-testid="mermaid-mock">{code}</div>
  ),
}));

describe("Markdown", () => {
  it("отрисовывает строчные и блочные формулы через KaTeX", () => {
    const content = ["Цена $C = S N(d_1)$.", "", "$$", "\\int_0^T \\sigma^2 \\, dt", "$$"].join("\n");

    render(<Markdown content={content} />);

    expect(document.querySelectorAll(".katex").length).toBe(2);
    expect(document.querySelector(".katex-display")).toBeInTheDocument();
  });

  /*
   * Формулы рисует копия KaTeX, которую тянет за собой `rehype-katex`, а
   * оформление берётся из `katex/dist/katex.min.css` — то есть из пакета
   * `katex` в зависимостях. Если версии разойдутся, вёрстка останется
   * правильной, но правила размера к ней не применятся: у класса обёртки
   * в 0.18 другое имя (`katex-sizing` вместо `sizing`). Внешне это выглядит
   * как индексы и степени размером с обычный текст и срезанные глифы,
   * вылезшие за посчитанные коробки. Проверяется поэтому не номер версии,
   * а то, что обе копии называют обёртку размера одинаково.
   */
  it("рисует формулы той же версией KaTeX, из которой берётся оформление", () => {
    render(<Markdown content="Формула $S_0 e^{\\sigma^2}$." />);

    const sized = document.querySelector(".katex-html [class$='sizing'], .katex-html [class*='sizing ']");
    const sizingClass = [...(sized?.classList ?? [])].find((name) =>
      name.endsWith("sizing"),
    );
    expect(sizingClass).toBeDefined();

    expect(katex.renderToString("S_0 e^{\\sigma^2}")).toContain(
      `class="${sizingClass} `,
    );
  });

  it("отдаёт блок кода с языком mermaid отрисовщику схем, а не выводит его как код", () => {
    const content = ["```mermaid", "graph TD;", "  A-->B;", "```"].join("\n");

    render(<Markdown content={content} />);

    const mock = screen.getByTestId("mermaid-mock");
    expect(mock).toHaveTextContent("graph TD;");
    expect(mock).toHaveTextContent("A-->B;");
    expect(document.querySelector("pre code.language-mermaid")).not.toBeInTheDocument();
  });

  it("обычный блок кода по-прежнему выводится как подсвеченный код", () => {
    const content = ["```python", "print('привет')", "```"].join("\n");

    render(<Markdown content={content} />);

    expect(screen.queryByTestId("mermaid-mock")).not.toBeInTheDocument();
    const codeElement = document.querySelector("pre code.language-python");
    expect(codeElement).toBeInTheDocument();
    expect(codeElement).toHaveTextContent("print('привет')");
  });

  it("не оборачивает схему в блок кода pre", () => {
    const content = ["```mermaid", "graph TD;", "  A-->B;", "```"].join("\n");

    render(<Markdown content={content} />);

    const mock = screen.getByTestId("mermaid-mock");
    expect(mock.closest("pre")).toBeNull();
    expect(document.querySelector("pre")).not.toBeInTheDocument();
  });

  it("по-прежнему оборачивает обычный блок кода в pre", () => {
    const content = ["```python", "print('привет')", "```"].join("\n");

    render(<Markdown content={content} />);

    const codeElement = document.querySelector("code.language-python");
    expect(codeElement?.closest("pre")).not.toBeNull();
  });

  it("даёт к блоку кода кнопку, копирующую исходный текст", async () => {
    const user = userEvent.setup();
    const content = ["```python", "print('привет')", "x = 1", "```"].join("\n");

    render(<Markdown content={content} />);

    await user.click(screen.getByRole("button", { name: "Копировать" }));

    await expect(navigator.clipboard.readText()).resolves.toBe("print('привет')\nx = 1\n");
  });

  it("не даёт кнопку копирования схеме mermaid", () => {
    const content = ["```mermaid", "graph TD;", "  A-->B;", "```"].join("\n");

    render(<Markdown content={content} />);

    expect(screen.queryByRole("button", { name: "Копировать" })).not.toBeInTheDocument();
  });
});
