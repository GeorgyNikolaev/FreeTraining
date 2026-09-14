import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router";

import { CourseShell } from "../components/CourseShell";
import { Markdown } from "../components/Markdown";
import { QueryState } from "../components/QueryState";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useCourse, useHomework } from "../lib/api/queries";
import type { StepLink } from "../lib/api/types";
import { stepPath } from "../lib/nextStep";

function nextLabel(step: StepLink | null | undefined): string {
  if (!step) return "Вернуться к курсу";
  if (step.kind === "quiz") return "К тесту модуля";
  if (step.kind === "exam") return "К экзамену";
  return "Дальше";
}

/**
 * Домашнее задание модуля: текст из `homework.md` рядом с уроками.
 *
 * Работу никто не проверяет, поэтому страница ничего не отмечает в прогрессе
 * и служит только шагом между последним уроком модуля и его тестом.
 */
export function HomeworkPage() {
  const { courseId = "", moduleId = "" } = useParams();

  const homework = useHomework(courseId, moduleId);
  const course = useCourse(courseId);
  const next = homework.data?.next ?? null;

  return (
    <CourseShell
      course={course.data}
      courseId={courseId}
      crumbs={[
        { label: "Курсы", to: "/" },
        { label: course.data?.title ?? "Курс", to: `/courses/${courseId}` },
        { label: "Домашнее задание" },
      ]}
      aside={<Badge>Без проверки</Badge>}
    >
      <article className="flex min-w-0 flex-1 flex-col gap-6">
        <QueryState isLoading={homework.isLoading} error={homework.error}>
          {homework.data ? (
            <>
              <Markdown content={homework.data.content} />

              <footer className="flex flex-wrap items-center justify-between gap-4
                border-t border-line pt-6">
                {homework.data.prev ? (
                  <Link
                    to={stepPath(courseId, homework.data.prev)}
                    className="inline-flex items-center gap-2 text-sm text-muted
                      transition-colors duration-150 hover:text-body"
                  >
                    <ArrowLeft size={16} />
                    {homework.data.prev.title}
                  </Link>
                ) : (
                  <span />
                )}

                <Link to={next ? stepPath(courseId, next) : `/courses/${courseId}`}>
                  <Button size="lg">
                    {nextLabel(next)}
                    <ArrowRight size={16} />
                  </Button>
                </Link>
              </footer>
            </>
          ) : null}
        </QueryState>
      </article>
    </CourseShell>
  );
}
