import { useParams } from "react-router";

import { CourseShell } from "../components/CourseShell";
import { QueryState } from "../components/QueryState";
import { QuizRunner } from "../features/quiz/QuizRunner";
import { useCourse, useExam, useModuleQuiz } from "../lib/api/queries";
import { nextAfterQuiz, nextAfterQuizLabel, stepPath } from "../lib/nextStep";

export function QuizPage({ scope }: { scope: "module" | "exam" }) {
  const { courseId = "", moduleId = "" } = useParams();

  const moduleQuiz = useModuleQuiz(courseId, moduleId, scope === "module");
  const exam = useExam(courseId, scope === "exam");
  const quiz = scope === "exam" ? exam : moduleQuiz;
  const course = useCourse(courseId);

  // Куда вести после проверки: следующий модуль, экзамен или назад к курсу.
  // Вычисляется здесь, а не в компонентах экрана.
  const activeModuleId = scope === "module" ? moduleId : null;
  const nextStep = course.data ? nextAfterQuiz(course.data, scope, activeModuleId) : null;
  const nextStepHref = course.data
    ? nextStep
      ? stepPath(courseId, nextStep)
      : `/courses/${courseId}`
    : undefined;

  return (
    <CourseShell
      course={course.data}
      courseId={courseId}
      crumbs={[
        { label: "Курсы", to: "/" },
        { label: course.data?.title ?? "Курс", to: `/courses/${courseId}` },
        {
          label:
            quiz.data?.title ?? (scope === "exam" ? "Экзамен" : "Тест модуля"),
        },
      ]}
    >
      <article className="flex min-w-0 flex-1 flex-col gap-8">
        <QueryState isLoading={quiz.isLoading} error={quiz.error}>
          {quiz.data ? (
            <>
              <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {quiz.data.title}
                </h1>
                <p className="text-sm text-muted">
                  {quiz.data.questions.length} вопросов · проходной балл{" "}
                  {quiz.data.pass_score}%
                </p>
              </header>

              <QuizRunner
                key={scope === "exam" ? "exam" : moduleId}
                quiz={quiz.data}
                nextStep={
                  nextStepHref
                    ? { href: nextStepHref, label: nextAfterQuizLabel(nextStep, scope) }
                    : undefined
                }
              />
            </>
          ) : null}
        </QueryState>
      </article>
    </CourseShell>
  );
}
