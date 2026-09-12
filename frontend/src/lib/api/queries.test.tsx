import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { createTestQueryClient } from "../../test/render";
import { server } from "../../test/server";
import { useCompleteLesson, useCourse, useCourses } from "./queries";

function wrapper({ children }: { children: ReactNode }) {
  const client = createTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("хуки запросов", () => {
  it("useCourses отдаёт каталог", async () => {
    const { result } = renderHook(() => useCourses(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toBe("Основы Python");
  });

  it("useCourse отдаёт дерево курса", async () => {
    const { result } = renderHook(() => useCourse("python-basics"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.modules).toHaveLength(2);
  });

  it("useCourse сообщает об ошибке понятным текстом", async () => {
    server.use(
      http.get("/api/courses/:course", () =>
        HttpResponse.json({ detail: "Курс не найден" }, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useCourse("нет"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Курс не найден");
  });

  it("useCompleteLesson отмечает урок пройденным", async () => {
    const { result } = renderHook(() => useCompleteLesson("python-basics"), {
      wrapper,
    });

    result.current.mutate({
      moduleId: "01-introduction",
      lessonId: "01-what-is-python",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.completed).toBe(true);
  });
});
