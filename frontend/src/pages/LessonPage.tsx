import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { CourseShell } from "../components/CourseShell";
import { Markdown } from "../components/Markdown";
import { QueryState } from "../components/QueryState";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import {
  useCompleteLesson,
  useCourse,
  useLesson,
  useSavePosition,
} from "../lib/api/queries";
import type { CourseDetail, LessonRef, StepLink } from "../lib/api/types";
import { stepPath } from "../lib/nextStep";

function findLesson(
  course: CourseDetail | undefined,
  moduleId: string,
  lessonId: string,
): LessonRef | undefined {
  return course?.modules
    .find((module) => module.id === moduleId)
    ?.lessons.find((lesson) => lesson.id === lessonId);
}

function nextLabel(step: StepLink | null | undefined): string {
  if (!step) return "Пройдено";
  if (step.kind === "homework") return "Пройдено, к домашнему заданию";
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
  // Крошки строятся из уже загруженных данных курса, а не из данных урока,
  // поэтому переход между уроками не сбрасывает их в состояние загрузки.
  const currentLesson = findLesson(course.data, moduleId, lessonId);
  const lessonTitle = currentLesson?.title ?? lesson.data?.title ?? "Урок";

  function goNext() {
    complete.mutate(
      { moduleId, lessonId },
      {
        onSuccess: () => {
          void navigate(next ? stepPath(courseId, next) : `/courses/${courseId}`);
        },
      },
    );
  }

  return (
    <CourseShell
      course={course.data}
      courseId={courseId}
      activeLessonId={lessonId}
      crumbs={[
        { label: "Курсы", to: "/" },
        { label: course.data?.title ?? "Курс", to: `/courses/${courseId}` },
        { label: lessonTitle },
      ]}
      aside={lesson.data?.completed ? <Badge tone="success">Пройден</Badge> : null}
    >
      <article className="flex min-w-0 flex-1 flex-col gap-6">
        <QueryState isLoading={lesson.isLoading} error={lesson.error}>
          {lesson.data ? (
            <>
              <Markdown content={lesson.data.content} />

              {complete.error ? (
                <Callout tone="danger" title="Не удалось отметить урок пройденным">
                  {complete.error.message}
                </Callout>
              ) : null}

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
            </>
          ) : null}
        </QueryState>
      </article>
    </CourseShell>
  );
}
