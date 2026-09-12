import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { Markdown } from "../components/Markdown";
import { ModuleTree } from "../components/ModuleTree";
import { QueryState } from "../components/QueryState";
import { Badge } from "../components/ui/Badge";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { GlassPanel } from "../components/ui/GlassPanel";
import {
  useCompleteLesson,
  useCourse,
  useLesson,
  useSavePosition,
} from "../lib/api/queries";
import type { StepLink } from "../lib/api/types";

function stepPath(courseId: string, step: StepLink): string {
  if (step.kind === "exam") return `/courses/${courseId}/exam`;
  if (step.kind === "quiz") return `/courses/${courseId}/${step.module_id}/quiz`;
  return `/courses/${courseId}/${step.module_id}/${step.lesson_id}`;
}

function nextLabel(step: StepLink | null | undefined): string {
  if (!step) return "Пройдено";
  if (step.kind === "quiz") return "Пройдено, к тесту модуля";
  if (step.kind === "exam") return "Пройдено, к экзамену";
  return "Пройдено, дальше";
}

export function LessonPage() {
  const { courseId = "", moduleId = "", lessonId = "" } = useParams();
  const navigate = useNavigate();

  const lesson = useLesson(courseId, moduleId, lessonId);
  const course = useCourse(courseId);
  const complete = useCompleteLesson(courseId);
  const savePosition = useSavePosition(courseId);

  const { mutate: remember } = savePosition;
  useEffect(() => {
    if (lesson.isSuccess) {
      remember({ moduleId, lessonId });
    }
  }, [lesson.isSuccess, remember, moduleId, lessonId]);

  const next = lesson.data?.next ?? null;

  function goNext() {
    complete.mutate(
      { moduleId, lessonId },
      {
        onSettled: () => {
          void navigate(next ? stepPath(courseId, next) : `/courses/${courseId}`);
        },
      },
    );
  }

  return (
    <QueryState isLoading={lesson.isLoading} error={lesson.error}>
      {lesson.data ? (
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
          {course.data ? (
            <GlassPanel className="hidden shrink-0 self-start p-4 lg:sticky lg:top-20
              lg:block lg:w-64">
              <ModuleTree course={course.data} activeLessonId={lessonId} />
            </GlassPanel>
          ) : null}

          <article className="flex min-w-0 flex-1 flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Breadcrumbs
                items={[
                  { label: "Курсы", to: "/" },
                  { label: course.data?.title ?? "Курс", to: `/courses/${courseId}` },
                  { label: lesson.data.title },
                ]}
              />
              {lesson.data.completed ? <Badge tone="success">Пройден</Badge> : null}
            </div>

            <Markdown content={lesson.data.content} />

            <footer className="flex flex-wrap items-center justify-between gap-4
              border-t border-line pt-6">
              {lesson.data.prev ? (
                <Link
                  to={stepPath(courseId, lesson.data.prev)}
                  className="inline-flex items-center gap-2 text-sm text-muted
                    transition-colors duration-150 hover:text-body"
                >
                  <ArrowLeft size={16} />
                  {lesson.data.prev.title}
                </Link>
              ) : (
                <span />
              )}

              <Button size="lg" onClick={goNext} disabled={complete.isPending}>
                {lesson.data.completed ? <Check size={16} /> : null}
                {nextLabel(next)}
                <ArrowRight size={16} />
              </Button>
            </footer>
          </article>
        </div>
      ) : null}
    </QueryState>
  );
}
