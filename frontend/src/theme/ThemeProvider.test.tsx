import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { setPrefersDark } from "../../vitest.setup";
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
    setPrefersDark(false);
  });

  it("по умолчанию берёт светлую тему, когда система предпочитает светлую", () => {
    setPrefersDark(false);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("тема: light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("берёт тёмную тему, когда система её предпочитает и сохранённого выбора нет", () => {
    setPrefersDark(true);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("тема: dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("сохранённый выбор побеждает системную настройку", () => {
    localStorage.setItem("freetraining-theme", "light");
    setPrefersDark(true);

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole("button")).toHaveTextContent("тема: light");
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
