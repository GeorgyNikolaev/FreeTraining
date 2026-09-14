import clsx from "clsx";
import { Check, CircleDashed, FileText, ListChecks, PencilLine } from "lucide-react";
import { Link } from "react-router";

import type { CourseDetail } from "../lib/api/types";
import { Badge } from "./ui/Badge";

export function ModuleTree({
  course,
  activeLessonId,
}: {
  course: CourseDetail;
  activeLessonId?: string;
}) {
  return (
    <nav aria-label="Содержание курса" className="flex flex-col gap-6">
      {course.modules.map((module, index) => (
        <section key={module.id} className="flex flex-col gap-2">
          <header className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-tight">
              <span className="text-subtle">{index + 1}.</span> {module.title}
            </h3>
            {module.quiz_passed ? <Badge tone="success">Сдан</Badge> : null}
          </header>

          <ul className="flex flex-col gap-0.5">
            {module.lessons.map((lesson) => {
              const active = lesson.id === activeLessonId;
              return (
                <li key={lesson.id}>
                  <Link
                    to={`/courses/${course.id}/${module.id}/${lesson.id}`}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-2 rounded-control px-2 py-1.5 text-sm",
                      "transition-colors duration-150",
                      active
                        ? "bg-accent-soft text-body"
                        : "text-muted hover:bg-sunken hover:text-body",
                    )}
                  >
                    {lesson.completed ? (
                      <Check size={14} className="shrink-0 text-success" />
                    ) : (
                      <CircleDashed size={14} className="shrink-0 text-subtle" />
                    )}
                    <span className="min-w-0 truncate">{lesson.title}</span>
                  </Link>
                </li>
              );
            })}

            {module.has_homework ? (
              <li>
                <Link
                  to={`/courses/${course.id}/${module.id}/homework`}
                  className="flex items-center gap-2 rounded-control px-2 py-1.5 text-sm
                    text-muted transition-colors duration-150
                    hover:bg-sunken hover:text-body"
                >
                  <PencilLine size={14} className="shrink-0 text-subtle" />
                  <span className="min-w-0 truncate">Домашнее задание</span>
                </Link>
              </li>
            ) : null}

            {module.has_quiz ? (
              <li>
                <Link
                  to={`/courses/${course.id}/${module.id}/quiz`}
                  className="flex items-center gap-2 rounded-control px-2 py-1.5 text-sm
                    text-muted transition-colors duration-150
                    hover:bg-sunken hover:text-body"
                >
                  <ListChecks size={14} className="shrink-0 text-subtle" />
                  <span className="min-w-0 truncate">Тест модуля</span>
                  {module.quiz_best_score !== null ? (
                    <span className="ml-auto text-xs tabular-nums text-subtle">
                      {module.quiz_best_score}%
                    </span>
                  ) : null}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ))}

      {course.has_exam ? (
        <Link
          to={`/courses/${course.id}/exam`}
          className="flex items-center gap-2 rounded-control border border-line px-3 py-2
            text-sm font-medium transition-colors duration-150 hover:bg-sunken"
        >
          <FileText size={14} className="shrink-0 text-subtle" />
          Финальный экзамен
          {course.exam_best_score !== null ? (
            <span className="ml-auto text-xs tabular-nums text-subtle">
              {course.exam_best_score}%
            </span>
          ) : null}
        </Link>
      ) : null}
    </nav>
  );
}
