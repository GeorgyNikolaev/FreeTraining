import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { LoginPage } from "./LoginPage";

function renderLogin(route = "/login?next=%2Fcourses%2Fpython-basics") {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/courses/:courseId" element={<p>Страница курса</p>} />
    </Routes>,
    { route },
  );
}

describe("LoginPage", () => {
  it("входит и возвращает на страницу из next", async () => {
    const user = userEvent.setup();
    let body: unknown;
    server.use(
      http.post("/api/auth/login", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({
          access_token: "t",
          token_type: "bearer",
          expires_in: 900,
          user: { id: "1", name: "Анна", email: "anna@example.com", email_verified: false },
          guest_progress: null,
        });
      }),
    );
    renderLogin();

    await user.type(await screen.findByLabelText("Почта"), "anna@example.com");
    await user.type(screen.getByLabelText("Пароль"), "correct-horse");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Страница курса")).toBeInTheDocument();
    expect(body).toEqual({ email: "anna@example.com", password: "correct-horse" });
  });

  it("показывает ошибку сервера", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/auth/login", () =>
        HttpResponse.json({ detail: "Неверная почта или пароль" }, { status: 401 }),
      ),
    );
    renderLogin();

    await user.type(await screen.findByLabelText("Почта"), "anna@example.com");
    await user.type(screen.getByLabelText("Пароль"), "wrong");
    await user.click(screen.getByRole("button", { name: "Войти" }));

    expect(await screen.findByText("Неверная почта или пароль")).toBeInTheDocument();
  });

  it("сохраняет next в ссылке на регистрацию", async () => {
    renderLogin();

    expect(await screen.findByRole("link", { name: "Зарегистрироваться" })).toHaveAttribute(
      "href",
      "/register?next=%2Fcourses%2Fpython-basics",
    );
  });

  it("не уводит на чужой сайт через next", async () => {
    renderLogin("/login?next=%2F%2Fevil.example");

    expect(await screen.findByRole("link", { name: "Зарегистрироваться" })).toHaveAttribute(
      "href",
      "/register",
    );
  });
});
