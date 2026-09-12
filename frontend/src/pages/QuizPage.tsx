import { useParams } from "react-router";

import { QueryState } from "../components/QueryState";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { QuizRunner } from "../features/quiz/QuizRunner";
import { useCourse, useExam, useModuleQuiz } from "../lib/api/queries";

export function QuizPage({ scope }: { scope: "module" | "exam" }) {
  const { courseId = "", moduleId = "" } = useParams();

  const moduleQuiz = useModuleQuiz(courseId, moduleId, scope === "module");
  const exam = useExam(courseId, scope === "exam");
  const quiz = scope === "exam" ? exam : moduleQuiz;
  const course = useCourse(courseId);

  return (
    <QueryState isLoading={quiz.isLoading} error={quiz.error}>
      {quiz.data ? (
        <div className="flex flex-col gap-8">
          <Breadcrumbs
            items={[
              { label: "Курсы", to: "/" },
              { label: course.data?.title ?? "Курс", to: `/courses/${courseId}` },
              { label: quiz.data.title },
            ]}
          />
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{quiz.data.title}</h1>
            <p className="text-sm text-muted">
              {quiz.data.questions.length} вопросов · проходной балл{" "}
              {quiz.data.pass_score}%
            </p>
          </header>

          <QuizRunner key={scope === "exam" ? "exam" : moduleId} quiz={quiz.data} />
        </div>
      ) : null}
    </QueryState>
  );
}
