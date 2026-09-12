import { describe, expect, it } from "vitest";

import type { CourseDetail } from "./api/types";
import { nextAfterQuiz, nextAfterQuizLabel, stepPath } from "./nextStep";

function makeCourse(overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    id: "python-basics",
    title: "Основы Python",
    description: "",
    tags: [],
    level: "beginner",
    has_cheatsheet: false,
    has_glossary: false,
    has_exam: false,
    exam_passed: false,
    exam_best_score: null,
    progress_percent: 0,
    status: "in_progress",
    modules: [
      {
        id: "01-introduction",
        title: "Введение",
        lessons: [{ id: "01-what-is-python", title: "Что такое Python", completed: true }],
        has_quiz: true,
        quiz_passed: false,
        quiz_best_score: null,
      },
      {
        id: "02-syntax",
        title: "Синтаксис",
        lessons: [{ id: "01-variables", title: "Переменные", completed: false }],
        has_quiz: true,
        quiz_passed: false,
        quiz_best_score: null,
      },
    ],
    ...overrides,
  } as CourseDetail;
}

describe("stepPath", () => {
  it("строит адрес урока", () => {
    expect(
      stepPath("python-basics", {
        kind: "lesson",
        module_id: "01-introduction",
        lesson_id: "01-what-is-python",
        title: "Что такое Python",
      }),
    ).toBe("/courses/python-basics/01-introduction/01-what-is-python");
  });

  it("строит адрес теста модуля", () => {
    expect(
      stepPath("python-basics", {
        kind: "quiz",
        module_id: "01-introduction",
        lesson_id: null,
        title: "Тест модуля",
      }),
    ).toBe("/courses/python-basics/01-introduction/quiz");
  });

  it("строит адрес экзамена", () => {
    expect(
      stepPath("python-basics", {
        kind: "exam",
        module_id: null,
        lesson_id: null,
        title: "Экзамен",
      }),
    ).toBe("/courses/python-basics/exam");
  });
});

describe("nextAfterQuiz", () => {
  it("после теста модуля ведёт к первому уроку следующего модуля", () => {
    const course = makeCourse();

    const step = nextAfterQuiz(course, "module", "01-introduction");

    expect(step).toEqual({
      kind: "lesson",
      module_id: "02-syntax",
      lesson_id: "01-variables",
      title: "Переменные",
    });
  });

  it("после теста последнего модуля ведёт к экзамену, если он есть", () => {
    const course = makeCourse({ has_exam: true });

    const step = nextAfterQuiz(course, "module", "02-syntax");

    expect(step).toEqual({
      kind: "exam",
      module_id: null,
      lesson_id: null,
      title: "Финальный экзамен",
    });
  });

  it("после теста последнего модуля без экзамена не ведёт никуда", () => {
    const course = makeCourse({ has_exam: false });

    const step = nextAfterQuiz(course, "module", "02-syntax");

    expect(step).toBeNull();
  });

  it("после экзамена не ведёт никуда, даже если модуль указан", () => {
    const course = makeCourse({ has_exam: true });

    const step = nextAfterQuiz(course, "exam", "01-introduction");

    expect(step).toBeNull();
  });
});

describe("nextAfterQuizLabel", () => {
  it("подписывает переход к уроку следующего модуля", () => {
    expect(
      nextAfterQuizLabel(
        { kind: "lesson", module_id: "02-syntax", lesson_id: "01-variables", title: "Переменные" },
        "module",
      ),
    ).toBe("К следующему модулю");
  });

  it("подписывает переход к экзамену", () => {
    expect(
      nextAfterQuizLabel(
        { kind: "exam", module_id: null, lesson_id: null, title: "Экзамен" },
        "module",
      ),
    ).toBe("К экзамену");
  });

  it("подписывает конец теста модуля возвратом к курсу", () => {
    expect(nextAfterQuizLabel(null, "module")).toBe("Вернуться к курсу");
  });

  it("подписывает конец экзамена завершением курса", () => {
    expect(nextAfterQuizLabel(null, "exam")).toBe("Завершить курс");
  });
});
