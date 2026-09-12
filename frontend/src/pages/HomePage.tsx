import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { CourseCard } from "../components/CourseCard";
import { QueryState } from "../components/QueryState";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ProgressBar } from "../components/ui/ProgressBar";
import { useCourses } from "../lib/api/queries";
import type { CourseSummary } from "../lib/api/types";

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
  const resumable = (courses ?? []).filter(
    (course) => course.resume !== null && course.status !== "completed",
  );

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
          <h1 className="text-2xl font-semibold tracking-tight">Курсы</h1>
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
