import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { authSession } from "../../test/mocks";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";
import { GuestProgressDialog } from "./GuestProgressDialog";

const withGuestProgress = {
  ...authSession,
  guest_progress: { courses: 2, lessons: 3, attempts: 1 },
};

describe("GuestProgressDialog", () => {
  it("не показывается, если прогресса без входа нет", async () => {
    server.use(http.post("/api/auth/refresh", () => HttpResponse.json(authSession)));
    renderWithProviders(<GuestProgressDialog />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("спрашивает и переносит прогресс", async () => {
    const user = userEvent.setup();
    let merged = false;
    server.use(
      http.post("/api/auth/refresh", () => HttpResponse.json(withGuestProgress)),
      http.post("/api/auth/guest/merge", () => {
        merged = true;
        return HttpResponse.json({ status: "ok" });
      }),
    );
    renderWithProviders(<GuestProgressDialog />);

    expect(
      await screen.findByRole("dialog", { name: "Перенести прогресс в аккаунт?" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 курсах: 3 урока и 1 попытка теста/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Перенести" }));

    expect(merged).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("удаляет прогресс, если переносить не нужно", async () => {
    const user = userEvent.setup();
    let discarded = false;
    server.use(
      http.post("/api/auth/refresh", () => HttpResponse.json(withGuestProgress)),
      http.post("/api/auth/guest/discard", () => {
        discarded = true;
        return HttpResponse.json({ status: "ok" });
      }),
    );
    renderWithProviders(<GuestProgressDialog />);

    await user.click(await screen.findByRole("button", { name: "Не переносить" }));

    expect(discarded).toBe(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
