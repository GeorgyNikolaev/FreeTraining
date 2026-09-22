import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { courseDetail } from "../test/mocks";
import { renderWithProviders } from "../test/render";
import { CourseShell } from "./CourseShell";

function renderShell() {
  return renderWithProviders(
    <CourseShell
      course={courseDetail}
      courseId={courseDetail.id}
      activeLessonId="01-what-is-python"
      crumbs={[{ label: "Курсы", to: "/" }, { label: courseDetail.title }]}
    >
      <p>Содержимое</p>
    </CourseShell>,
  );
}

describe("CourseShell", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("сворачивает и разворачивает боковую панель, запоминая выбор", async () => {
    const user = userEvent.setup();
    renderShell();

    const collapseButton = screen.getByRole("button", {
      name: "Свернуть содержание курса",
    });
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("navigation", { name: "Содержание курса" }),
    ).toBeInTheDocument();

    await user.click(collapseButton);

    const expandButton = screen.getByRole("button", {
      name: "Показать содержание курса",
    });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("navigation", { name: "Содержание курса" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem("freetraining-sidebar")).toBe("collapsed");

    await user.click(expandButton);

    expect(
      screen.getByRole("navigation", { name: "Содержание курса" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Свернуть содержание курса" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(localStorage.getItem("freetraining-sidebar")).toBe("open");
  });

  it("восстанавливает свёрнутое состояние, сохранённое ранее", () => {
    localStorage.setItem("freetraining-sidebar", "collapsed");

    renderShell();

    expect(
      screen.getByRole("button", { name: "Показать содержание курса" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("navigation", { name: "Содержание курса" }),
    ).not.toBeInTheDocument();
  });

  it("не рисует боковую панель, пока курс не загружен", () => {
    renderWithProviders(
      <CourseShell
        courseId="python-basics"
        crumbs={[{ label: "Курсы", to: "/" }, { label: "Курс" }]}
      >
        <p>Содержимое</p>
      </CourseShell>,
    );

    expect(
      screen.queryByRole("navigation", { name: "Содержание курса" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Свернуть содержание курса" }),
    ).not.toBeInTheDocument();
  });

  /*
   * Свёрнутое дерево остаётся в разметке: иначе анимировать закрытие нечего.
   * Для скринридера и для запросов по роли его при этом нет — прячет
   * `aria-hidden`, а `inert` заодно убирает ссылки из обхода по Tab.
   */
  it("оставляет свёрнутое дерево в разметке, но прячет его от доступности", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "Свернуть содержание курса" }));

    const tree = document.querySelector("nav[aria-label='Содержание курса']");
    expect(tree).toBeInTheDocument();
    expect(tree?.closest("[aria-hidden='true']")).not.toBeNull();
    expect(tree?.closest("[inert]")).not.toBeNull();
  });
});
