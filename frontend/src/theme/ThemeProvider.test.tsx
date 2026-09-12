import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";

function Probe() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle}>
      тема: {theme}
    </button>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("по умолчанию берёт светлую тему, когда система её не переопределяет", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("тема: light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("переключает тему и запоминает выбор", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent("тема: dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("freetraining-theme")).toBe("dark");
  });

  it("восстанавливает сохранённый выбор при запуске", () => {
    localStorage.setItem("freetraining-theme", "dark");

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("тема: dark");
  });
});
