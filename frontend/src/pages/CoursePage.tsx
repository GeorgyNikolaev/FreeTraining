import { ArrowRight, History, RotateCcw } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router";

import { Markdown } from "../components/Markdown";
import { ModuleTree } from "../components/ModuleTree";
import { QueryState } from "../components/QueryState";
import { Badge } from "../components/ui/Badge";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { Card, CardBody } from "../components/ui/Card";
import { ProgressRing } from "../components/ui/ProgressRing";
import { Skeleton } from "../components/ui/Skeleton";
import { StarRating } from "../components/ui/StarRating";
import { Tabs, type TabItem } from "../components/ui/Tabs";
import { ReviewPrompt } from "../features/reviews/ReviewPrompt";
import { ReviewsTab } from "../features/reviews/ReviewsTab";
import { useCourse, usePage, useResetCourse, useReviews } from "../lib/api/queries";
import type { CourseDetail } from "../lib/api/types";

function firstLessonPath(course: CourseDetail): string | null {
  for (const module of course.modules) {
    const lesson = module.lessons[0];
    if (lesson) return `/courses/${course.id}/${module.id}/${lesson.id}`;
  }
  return null;
}

function PageTab({ courseId, page }: { courseId: string; page: string }) {
  const { data, isLoading, error } = usePage(courseId, page);

  return (
    <QueryState isLoading={isLoading} error={error}>
      {data ? <Markdown content={data.content} /> : null}
    </QueryState>
  );
}

export function CoursePage() {
  const { courseId = "" } = useParams();
  const { data: course, isLoading, error } = useCourse(courseId);
  const reset = useResetCourse(courseId);
  // Сводка отзывов нужна в шапке, только чтобы решить, показывать ли «Оценить курс»
  const reviews = useReviews(courseId, course?.rating_count === 0);
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: TabItem[] = [{ id: "modules", label: "Модули" }];
  if (course?.has_cheatsheet) tabs.push({ id: "cheatsheet", label: "Шпаргалка" });
  if (course?.has_glossary) tabs.push({ id: "glossary", label: "Термины" });
  tabs.push({
    id: "reviews",
    label: course?.rating_count ? `Отзывы · ${course.rating_count}` : "Отзывы",
  });

  const requestedTab = searchParams.get("tab");
  const tab = tabs.some((item) => item.id === requestedTab) ? requestedTab! : "modules";

  function setTab(next: string) {
    setSearchParams(next === "modules" ? {} : { tab: next }, { replace: true });
  }

  const startPath = course
    ? course.resume
      ? `/courses/${course.id}/${course.resume.module_id}/${course.resume.lesson_id}`
      : firstLessonPath(course)
    : null;

  const startLabel =
    course?.status === "completed"
      ? "Повторить курс"
      : course?.resume
        ? `Продолжить · ${course.resume.lesson_title}`
        : "Начать курс";

  return (
    <QueryState isLoading={isLoading} error={error}>
      {course ? (
        <div className="flex flex-col gap-8">
          <Breadcrumbs items={[{ label: "Курсы", to: "/" }, { label: course.title }]} />

          <header className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 flex-col gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
              <p className="max-w-2xl text-sm text-muted">{course.description}</p>
              {course.rating_average != null ? (
                <button
                  type="button"
                  onClick={() => setTab("reviews")}
                  className="self-start rounded-control transition-opacity duration-150
                    hover:opacity-80"
                >
                  <StarRating value={course.rating_average} count={course.rating_count} />
                </button>
              ) : reviews.data?.can_review ? (
                <button
                  type="button"
                  onClick={() => setTab("reviews")}
                  className="self-start text-sm font-medium text-accent transition-opacity
                    duration-150 hover:opacity-80"
                >
                  Оценить курс
                </button>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {course.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            </div>
            <ProgressRing value={course.progress_percent} size={64} />
          </header>

          {course.prerequisites.length > 0 ? (
            <Callout title="Что нужно знать заранее">
              <ul className="mt-1 flex list-disc flex-col gap-1 pl-4">
                {course.prerequisites.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Callout>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {startPath ? (
              <Link to={startPath}>
                <Button size="lg">
                  {startLabel}
                  <ArrowRight size={16} />
                </Button>
              </Link>
            ) : null}
            <Link to={`/courses/${course.id}/results`}>
              <Button variant="secondary">
                <History size={16} />
                История попыток
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                if (
                  window.confirm(
                    `Сбросить весь прогресс курса «${course.title}»? Отменить это нельзя.`,
                  )
                ) {
                  reset.mutate();
                }
              }}
              disabled={reset.isPending}
            >
              <RotateCcw size={16} />
              Сбросить прогресс
            </Button>
          </div>

          {tab === "reviews" ? null : (
            <ReviewPrompt course={course} onRate={() => setTab("reviews")} />
          )}

          <Tabs items={tabs} active={tab} onChange={setTab} />

          {tab === "modules" ? (
            <Card>
              <CardBody>
                <ModuleTree course={course} activeLessonId={course.resume?.lesson_id} />
              </CardBody>
            </Card>
          ) : null}
          {tab === "cheatsheet" ? <PageTab courseId={course.id} page="cheatsheet" /> : null}
          {tab === "glossary" ? <PageTab courseId={course.id} page="glossary" /> : null}
          {tab === "reviews" ? <ReviewsTab courseId={course.id} /> : null}
        </div>
      ) : (
        <Skeleton className="h-64 w-full" />
      )}
    </QueryState>
  );
}
