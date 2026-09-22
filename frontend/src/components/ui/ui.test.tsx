import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { Badge } from "./Badge";
import { Breadcrumbs } from "./Breadcrumbs";
import { Button } from "./Button";
import { Callout } from "./Callout";
import { Card, CardTitle } from "./Card";
import { CopyButton } from "./CopyButton";
import { Dialog } from "./Dialog";
import { EmptyState } from "./EmptyState";
import { Menu } from "./Menu";
import { PasswordField } from "./PasswordField";
import { ProgressBar } from "./ProgressBar";
import { ProgressRing } from "./ProgressRing";
import { Skeleton } from "./Skeleton";
import { StarRating, StarRatingInput } from "./StarRating";
import { Tabs } from "./Tabs";
import { TextField } from "./TextField";

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

describe("StarRating", () => {
  it("подписывает среднюю оценку для экранного диктора", () => {
    render(<StarRating value={4.3} count={12} />);

    expect(screen.getByRole("img", { name: "Оценка 4,3 из 5, оценок: 12" })).toBeInTheDocument();
  });

  it("выбирает оценку мышью и стрелками", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRatingInput value={3} onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "5 из 5" }));
    expect(onChange).toHaveBeenLastCalledWith(5);

    screen.getByRole("radio", { name: "3 из 5" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).toHaveBeenLastCalledWith(2);
  });
});

describe("TextField", () => {
  it("связывает подпись и показывает ошибку вместо подсказки", () => {
    render(<TextField label="Почта" hint="Подсказка" error="Проверьте почту" />);

    const input = screen.getByLabelText("Почта");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Проверьте почту");
    expect(screen.queryByText("Подсказка")).not.toBeInTheDocument();
  });
});

describe("PasswordField", () => {
  it("показывает и скрывает пароль", async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Пароль" defaultValue="secret" />);

    const input = screen.getByLabelText("Пароль");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Показать пароль" }));
    expect(input).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Скрыть пароль" }));
    expect(input).toHaveAttribute("type", "password");
  });
});

describe("Menu", () => {
  it("открывается, выполняет пункт и закрывается по Escape", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Menu
        label="Аккаунт"
        trigger="Анна"
        items={[
          { id: "a", label: "Первый", onSelect: vi.fn() },
          { id: "b", label: "Выйти", onSelect },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Аккаунт" });
    await user.click(trigger);
    expect(screen.getByRole("menuitem", { name: "Первый" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Выйти" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Выйти" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("Dialog", () => {
  it("показывает заголовок, текст и действия, только когда открыт", () => {
    const { rerender } = render(
      <Dialog open onClose={() => {}} title="Перенести?" actions={<Button>Да</Button>}>
        Пояснение
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "Перенести?" })).toBeInTheDocument();
    expect(screen.getByText("Пояснение")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Да" })).toBeInTheDocument();

    rerender(<Dialog open={false} onClose={() => {}} title="Перенести?" />);
    expect(screen.queryByText("Пояснение")).not.toBeInTheDocument();
  });
});

describe("CopyButton", () => {
  it("кладёт текст в буфер обмена и на время меняет подпись", async () => {
    const user = userEvent.setup();
    render(<CopyButton text="print('привет')" />);

    await user.click(screen.getByRole("button", { name: "Копировать" }));

    await expect(navigator.clipboard.readText()).resolves.toBe("print('привет')");
    expect(await screen.findByRole("button", { name: "Скопировано" })).toBeInTheDocument();
  });

  it("не падает и оставляет обычную подпись, когда буфер обмена недоступен", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("отказано"));

    render(<CopyButton text="print('привет')" />);
    await user.click(screen.getByRole("button", { name: "Копировать" }));

    expect(screen.getByRole("button", { name: "Копировать" })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
