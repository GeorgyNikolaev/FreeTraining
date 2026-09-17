import { Star } from "lucide-react";
import { Link } from "react-router";

import type { CourseSummary } from "../lib/api/types";
import { plural } from "../lib/plural";
import { Badge } from "./ui/Badge";
import { Card, CardBody } from "./ui/Card";
import { ProgressRing } from "./ui/ProgressRing";
import { formatRating } from "./ui/StarRating";

const LEVELS: Record<string, string> = {
  beginner: "Начальный",
  intermediate: "Средний",
  advanced: "Продвинутый",
};

const STATUS_TONE = {
  completed: "success",
  in_progress: "accent",
  not_started: "neutral",
} as const;

const STATUS_LABEL: Record<string, string> = {
  completed: "Пройден",
  in_progress: "В процессе",
  not_started: "Не начат",
};

export function CourseCard({ course }: { course: CourseSummary }) {
  const status = course.status as keyof typeof STATUS_TONE;
  const target = course.resume
    ? `/courses/${course.id}/${course.resume.module_id}/${course.resume.lesson_id}`
    : `/courses/${course.id}`;
  const action =
    course.status === "completed"
      ? "Повторить"
      : course.resume
        ? "Продолжить"
        : "Начать курс";

  return (
    <Card className="transition-shadow duration-150 hover:shadow-lift">
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Link
              to={`/courses/${course.id}`}
              className="text-base font-semibold tracking-tight
                transition-colors duration-150 hover:text-accent"
            >
              {course.title}
            </Link>
            <p className="line-clamp-2 text-sm text-muted">{course.description}</p>
          </div>
          <ProgressRing value={course.progress_percent} size={48} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[status] ?? "neutral"}>
            {STATUS_LABEL[course.status] ?? course.status}
          </Badge>
          <Badge>{LEVELS[course.level] ?? course.level}</Badge>
          {course.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {course.module_count}{" "}
              {plural(course.module_count, ["модуль", "модуля", "модулей"])} ·{" "}
              {course.lesson_count}{" "}
              {plural(course.lesson_count, ["урок", "урока", "уроков"])}
            </span>
            {course.rating_average != null ? (
              <Link
                to={`/courses/${course.id}?tab=reviews`}
                aria-label={`Оценка ${formatRating(course.rating_average)} из 5, оценок: ${course.rating_count}`}
                className="inline-flex items-center gap-1 transition-colors duration-150
                  hover:text-body"
              >
                <Star size={14} className="fill-rating text-rating" aria-hidden />
                <span className="font-medium text-body">
                  {formatRating(course.rating_average)}
                </span>
                <span>({course.rating_count})</span>
              </Link>
            ) : null}
          </span>
          <Link
            to={target}
            className="font-medium text-accent transition-opacity duration-150
              hover:opacity-80"
          >
            {action}
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
