import type { CourseDetail, StepLink } from "./api/types";

/** Строит адрес шага курса — урока, теста модуля или экзамена. */
export function stepPath(courseId: string, step: StepLink): string {
  if (step.kind === "exam") return `/courses/${courseId}/exam`;
  if (step.kind === "quiz") return `/courses/${courseId}/${step.module_id}/quiz`;
  return `/courses/${courseId}/${step.module_id}/${step.lesson_id}`;
}

/**
 * Что идёт следующим после проверки теста.
 *
 * Тест модуля: первый урок следующего модуля, если он есть; иначе экзамен
 * курса, если он есть; иначе конец курса. Экзамен всегда завершает курс.
 */
export function nextAfterQuiz(
  course: CourseDetail,
  scope: "module" | "exam",
  moduleId: string | null,
): StepLink | null {
  if (scope === "exam") return null;

  const index = course.modules.findIndex((module) => module.id === moduleId);
  const nextModule = index === -1 ? undefined : course.modules[index + 1];
  const firstLesson = nextModule?.lessons[0];

  if (nextModule && firstLesson) {
    return {
      kind: "lesson",
      module_id: nextModule.id,
      lesson_id: firstLesson.id,
      title: firstLesson.title,
    };
  }

  if (course.has_exam) {
    return {
      kind: "exam",
      module_id: null,
      lesson_id: null,
      title: "Финальный экзамен",
    };
  }

  return null;
}

/** Подпись главного действия в подвале теста после проверки. */
export function nextAfterQuizLabel(
  step: StepLink | null,
  scope: "module" | "exam",
): string {
  if (step?.kind === "lesson") return "К следующему модулю";
  if (step?.kind === "exam") return "К экзамену";
  return scope === "exam" ? "Завершить курс" : "Вернуться к курсу";
}
