import { ArrowRight, Download } from "lucide-react";
import { Link } from "react-router";

import { CourseCard } from "../components/CourseCard";
import { QueryState } from "../components/QueryState";
import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useCourses, useExportProgress } from "../lib/api/queries";
import type { CourseSummary } from "../lib/api/types";

function formatDateStamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ResumeCard({ course }: { course: CourseSummary }) {
  if (!course.resume) return null;

  return (
    <Card className="transition-shadow duration-150 hover:shadow-lift">
      <CardBody className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-subtle">
          {course.title}
        </p>
        <Link
          to={`/courses/${course.id}/${course.resume.module_id}/${course.resume.lesson_id}`}
          className="inline-flex items-center gap-2 text-base font-semibold
            tracking-tight transition-colors duration-150 hover:text-accent"
        >
          {course.resume.lesson_title}
          <ArrowRight size={16} />
        </Link>
        <ProgressBar
          value={course.progress_percent}
          label={`Прогресс курса «${course.title}»`}
        />
      </CardBody>
    </Card>
  );
}

export function HomePage() {
  const { data: courses, isLoading, error } = useCourses();
  const exportProgress = useExportProgress();
  const resumable = (courses ?? []).filter(
    (course) => course.resume !== null && course.status !== "completed",
  );

  function handleExport() {
    exportProgress.mutate(undefined, {
      onSuccess: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `freetraining-progress-${formatDateStamp(new Date())}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      },
    });
  }

  return (
    <div className="flex flex-col gap-12">
      <QueryState isLoading={isLoading} error={error}>
        {resumable.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">
              Продолжить обучение
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {resumable.slice(0, 2).map((course) => (
                <ResumeCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight">Курсы</h1>
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={exportProgress.isPending}
            >
              <Download size={16} />
              Выгрузить прогресс
            </Button>
          </div>

          {exportProgress.isError ? (
            <Callout tone="danger" title="Не удалось выгрузить прогресс">
              {exportProgress.error.message}
            </Callout>
          ) : null}

          {courses && courses.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Курсов пока нет"
              description="Положите папку с курсом в каталог content и обновите страницу.
                Формат описан в docs/course-format.md."
            />
          )}
        </section>
      </QueryState>
    </div>
  );
}
