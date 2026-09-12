import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Markdown } from "./Markdown";

vi.mock("./MermaidDiagram", () => ({
  MermaidDiagram: ({ code }: { code: string }) => (
    <div data-testid="mermaid-mock">{code}</div>
  ),
}));

describe("Markdown", () => {
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
});
