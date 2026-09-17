import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { courseReviews } from "../../test/mocks";
import { renderWithProviders } from "../../test/render";
import { server } from "../../test/server";
import { ReviewsTab } from "./ReviewsTab";

describe("ReviewsTab", () => {
  it("гостю вместо формы предлагает войти", async () => {
    server.use(
      http.get("/api/courses/:course/reviews", () =>
        HttpResponse.json({ ...courseReviews, is_authenticated: false, can_review: false }),
      ),
    );
    renderWithProviders(<ReviewsTab courseId="python-basics" />);

    expect(await screen.findByText("Войдите, чтобы оставить отзыв")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute(
      "href",
      "/login?next=%2Fcourses%2Fpython-basics%3Ftab%3Dreviews",
    );
    expect(screen.queryByRole("button", { name: "Сохранить" })).not.toBeInTheDocument();
  });

  it("показывает имя автора отзыва", async () => {
    server.use(
      http.get("/api/courses/:course/reviews", () =>
        HttpResponse.json({
          ...courseReviews,
          rating_average: 5,
          rating_count: 1,
          reviews: [
            {
              id: 1,
              course_id: "python-basics",
              rating: 5,
              text: "Отлично",
              is_mine: false,
              author_name: "Борис",
              author_progress_percent: 80,
              created_at: "2026-09-12T10:00:00Z",
              updated_at: "2026-09-12T10:00:00Z",
            },
          ],
        }),
      ),
    );
    renderWithProviders(<ReviewsTab courseId="python-basics" />);

    expect(await screen.findByText("Борис")).toBeInTheDocument();
  });
});
