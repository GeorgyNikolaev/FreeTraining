import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "../theme/ThemeProvider";
import { QuizPage } from "./QuizPage";

// Хост-компонент имитирует переход между тестами разных модулей внутри
// одного и того же роутера (как в приложении), а не полный перемонтаж
// страницы. Данные уже посещённого теста остаются в кеше react-query, что и
// воспроизводит условия дефекта: возврат к тесту модуля A происходит без
// паузы на загрузку.
function Harness() {
  const navigate = useNavigate();

  return (
    <div>
      <button onClick={() => navigate("/courses/python-basics/module-a/quiz")}>
        К тесту модуля A
      </button>
      <button onClick={() => navigate("/courses/python-basics/module-b/quiz")}>
        К тесту модуля B
      </button>
      <Routes>
        <Route
          path="/courses/:courseId/:moduleId/quiz"
          element={<QuizPage scope="module" />}
        />
      </Routes>
    </div>
  );
}

function renderHarness() {
  // Обычный QueryClient (не тестовый с gcTime: 0) — здесь важно, чтобы
  // данные уже посещённого теста модуля оставались в кеше между переходами.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <MemoryRouter initialEntries={["/courses/python-basics/module-a/quiz"]}>
          <Harness />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("QuizPage", () => {
  it("не залипает на разборе другого теста при возврате к уже закешированному", async () => {
    const user = userEvent.setup();
    renderHarness();

    // Посещаем тест модуля A первым, чтобы его данные попали в кеш.
    await screen.findByRole("button", { name: "Проверить" });

    // Переходим к тесту модуля B и проходим его.
    await user.click(screen.getByRole("button", { name: "К тесту модуля B" }));
    await user.click(await screen.findByRole("radio", { name: "Отступами" }));
    await user.click(screen.getByRole("checkbox", { name: "Требует сборки" }));
    await user.click(screen.getByRole("button", { name: "Проверить" }));

    expect(await screen.findByText("1 из 2 · 50% · Незачёт")).toBeInTheDocument();

    // Возвращаемся к тесту модуля A — он уже в кеше, паузы на загрузку нет.
    await user.click(screen.getByRole("button", { name: "К тесту модуля A" }));

    expect(screen.queryByText(/из 2 ·/)).toBeNull();
    const freshRadio = await screen.findByRole("radio", { name: "Отступами" });
    expect(freshRadio).toBeEnabled();
    expect(freshRadio).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Проверить" })).toBeDisabled();
  });
});
