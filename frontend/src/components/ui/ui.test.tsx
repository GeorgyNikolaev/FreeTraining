import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { Badge } from "./Badge";
import { Breadcrumbs } from "./Breadcrumbs";
import { Button } from "./Button";
import { Callout } from "./Callout";
import { Card, CardTitle } from "./Card";
import { EmptyState } from "./EmptyState";
import { ProgressBar } from "./ProgressBar";
import { ProgressRing } from "./ProgressRing";
import { Skeleton } from "./Skeleton";
import { Tabs } from "./Tabs";

describe("Button", () => {
  it("вызывает обработчик нажатия", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Продолжить</Button>);

    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("не вызывает обработчик, когда заблокирована", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Продолжить
      </Button>,
    );

    await user.click(screen.getByRole("button", { name: "Продолжить" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("ProgressBar", () => {
  it("сообщает значение вспомогательным технологиям", () => {
    render(<ProgressBar value={40} label="Прогресс курса" />);

    const bar = screen.getByRole("progressbar", { name: "Прогресс курса" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });

  it("ограничивает значение диапазоном от нуля до ста", () => {
    render(<ProgressBar value={140} label="Прогресс курса" />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("ProgressRing", () => {
  it("показывает округлённый процент", () => {
    render(<ProgressRing value={66.6} />);

    expect(screen.getByText("67%")).toBeInTheDocument();
  });
});

describe("Badge, Card, Callout, EmptyState", () => {
  it("отображают переданное содержимое", () => {
    render(
      <>
        <Badge tone="success">Пройден</Badge>
        <Card>
          <CardTitle>Основы Python</CardTitle>
        </Card>
        <Callout tone="danger" title="Ошибка">
          Что-то пошло не так
        </Callout>
        <EmptyState title="Курсов пока нет" description="Положите папку в content" />
      </>,
    );

    expect(screen.getByText("Пройден")).toBeInTheDocument();
    expect(screen.getByText("Основы Python")).toBeInTheDocument();
    expect(screen.getByText("Ошибка")).toBeInTheDocument();
    expect(screen.getByText("Что-то пошло не так")).toBeInTheDocument();
    expect(screen.getByText("Курсов пока нет")).toBeInTheDocument();
  });
});

describe("Breadcrumbs", () => {
  it("делает ссылкой всё, кроме последнего звена", () => {
    render(
      <MemoryRouter>
        <Breadcrumbs
          items={[
            { label: "Курсы", to: "/" },
            { label: "Основы Python", to: "/courses/python-basics" },
            { label: "Переменные" },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Курсы" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Переменные" })).not.toBeInTheDocument();
  });
});

describe("Skeleton", () => {
  it("отрисовывается с классом фона заглушки", () => {
    const { container } = render(<Skeleton className="h-4 w-full" />);

    expect(container.firstChild).toHaveClass("bg-skeleton");
  });
});

describe("Tabs", () => {
  it("помечает активную вкладку и сообщает о переключении", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        items={[
          { id: "modules", label: "Модули" },
          { id: "cheatsheet", label: "Шпаргалка" },
        ]}
        active="modules"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("tab", { name: "Модули" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("tab", { name: "Шпаргалка" }));

    expect(onChange).toHaveBeenCalledWith("cheatsheet");
  });
});
