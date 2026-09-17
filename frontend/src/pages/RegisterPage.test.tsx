import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { authSession } from "../test/mocks";
import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { RegisterPage } from "./RegisterPage";

function renderRegister() {
  return renderWithProviders(
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<p>Главная</p>} />
    </Routes>,
    { route: "/register" },
  );
}

describe("RegisterPage", () => {
  it("проверяет поля до отправки", async () => {
    const user = userEvent.setup();
    let sent = false;
    server.use(
      http.post("/api/auth/register", () => {
        sent = true;
        return HttpResponse.json(authSession, { status: 201 });
      }),
    );
    renderRegister();

    await user.type(await screen.findByLabelText("Почта"), "не почта");
    await user.type(screen.getByLabelText("Пароль"), "short");
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(screen.getByText("Введите имя")).toBeInTheDocument();
    expect(screen.getByText("Проверьте почту")).toBeInTheDocument();
    expect(screen.getByLabelText("Пароль")).toHaveAttribute("aria-invalid", "true");
    expect(sent).toBe(false);
  });

  it("регистрирует и переводит на главную", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(await screen.findByLabelText("Имя"), "Анна");
    await user.type(screen.getByLabelText("Почта"), "anna@example.com");
    await user.type(screen.getByLabelText("Пароль"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(await screen.findByText("Главная")).toBeInTheDocument();
  });

  it("показывает, что почта занята", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/auth/register", () =>
        HttpResponse.json({ detail: "Эта почта уже зарегистрирована" }, { status: 409 }),
      ),
    );
    renderRegister();

    await user.type(await screen.findByLabelText("Имя"), "Анна");
    await user.type(screen.getByLabelText("Почта"), "anna@example.com");
    await user.type(screen.getByLabelText("Пароль"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    expect(await screen.findByText("Эта почта уже зарегистрирована")).toBeInTheDocument();
  });
});
