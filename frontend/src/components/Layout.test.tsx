import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { authSession } from "../test/mocks";
import { renderWithProviders } from "../test/render";
import { server } from "../test/server";
import { Layout } from "./Layout";

describe("Layout", () => {
  it("гостю предлагает войти с возвратом на текущую страницу", async () => {
    renderWithProviders(<Layout>Текст</Layout>, { route: "/courses/python-basics" });

    expect(await screen.findByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/login?next=%2Fcourses%2Fpython-basics",
    );
  });

  it("вошедшему показывает меню с именем и выходом", async () => {
    const user = userEvent.setup();
    let loggedOut = false;
    server.use(
      http.post("/api/auth/refresh", () => HttpResponse.json(authSession)),
      http.post("/api/auth/logout", () => {
        loggedOut = true;
        return HttpResponse.json({ status: "ok" });
      }),
    );
    renderWithProviders(<Layout>Текст</Layout>);

    await user.click(await screen.findByRole("button", { name: "Аккаунт" }));
    expect(screen.getByText("anna@example.com")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Выйти" }));

    expect(await screen.findByRole("link", { name: "Войти" })).toBeInTheDocument();
    expect(loggedOut).toBe(true);
  });
});
