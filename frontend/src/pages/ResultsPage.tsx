import { useState } from "react";
import { useParams } from "react-router";

import { QueryState } from "../components/QueryState";
import { Badge } from "../components/ui/Badge";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { Card, CardBody } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { useAttempts, useCourse } from "../lib/api/queries";
import type { AttemptSummary, CourseDetail } from "../lib/api/types";

function formatMoment(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AttemptCard({
  attempt,
  course,
}: {
  attempt: AttemptSummary;
  course?: CourseDetail;
}) {
  const [open, setOpen] = useState(false);
  const moduleTitle = attempt.module_id
    ? course?.modules.find((module) => module.id === attempt.module_id)?.title
    : undefined;

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              {attempt.scope === "exam" ? "Финальный экзамен" : "Тест модуля"}
              {moduleTitle ? <span className="text-muted"> · {moduleTitle}</span> : null}
            </p>
            <p className="text-xs text-subtle">{formatMoment(attempt.created_at)}</p>
          </div>

          <div className="flex items-center gap-3">
            <span
              data-testid="attempt-score"
              className="text-base font-semibold tabular-nums"
            >
              {attempt.score_percent}%
            </span>
            <Badge tone={attempt.passed ? "success" : "danger"}>
              {attempt.passed ? "Зачёт" : "Незачёт"}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setOpen((value) => !value)}>
              {open ? "Скрыть разбор" : "Разбор"}
            </Button>
          </div>
        </div>

        {open ? (
          <ol className="flex flex-col gap-4 border-t border-line pt-4">
            {attempt.results.map((review, index) => (
              <li key={index} className="flex flex-col gap-2 text-sm">
                <p className="font-medium">
                  <span className="text-subtle">{index + 1}.</span> {review.question}
                </p>
                <p className="text-muted">
                  Ваш ответ: {review.selected.join(", ") || "нет ответа"}
                </p>
                {review.is_correct ? null : (
                  <p className="text-muted">
                    Правильный ответ: {review.correct_answer.join(", ")}
                  </p>
                )}
                <Callout tone={review.is_correct ? "success" : "danger"}>
                  {review.explanation}
                </Callout>
              </li>
            ))}
          </ol>
        ) : null}
      </CardBody>
    </Card>
  );
}

export function ResultsPage() {
  const { courseId = "" } = useParams();
  const attempts = useAttempts(courseId);
  const course = useCourse(courseId);

  return (
    <QueryState isLoading={attempts.isLoading} error={attempts.error}>
      <div className="flex flex-col gap-8">
        <Breadcrumbs
          items={[
            { label: "Курсы", to: "/" },
            { label: course.data?.title ?? "Курс", to: `/courses/${courseId}` },
            { label: "История попыток" },
          ]}
        />
        <h1 className="text-2xl font-semibold tracking-tight">История попыток</h1>

        {attempts.data && attempts.data.length > 0 ? (
          <div className="flex flex-col gap-4">
            {attempts.data.map((attempt) => (
              <AttemptCard key={attempt.id} attempt={attempt} course={course.data} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Попыток пока нет"
            description="Пройдите тест модуля или финальный экзамен — результат появится здесь."
          />
        )}
      </div>
    </QueryState>
  );
}
