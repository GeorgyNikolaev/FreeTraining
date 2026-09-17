import { LogIn, Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import { QueryState } from "../../components/QueryState";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Callout } from "../../components/ui/Callout";
import { Card, CardBody } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { StarRating, StarRatingInput } from "../../components/ui/StarRating";
import { TextArea } from "../../components/ui/TextArea";
import { useDeleteReview, useReviews, useSaveReview } from "../../lib/api/queries";
import { authPath } from "../../lib/auth/AuthProvider";
import type { CourseReviews, ReviewOut } from "../../lib/api/types";
import { plural } from "../../lib/plural";

const TEXT_LIMIT = 2000;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ReviewForm({
  courseId,
  initial,
  onDone,
}: {
  courseId: string;
  initial: CourseReviews["my_review"];
  onDone?: () => void;
}) {
  const save = useSaveReview(courseId);
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [text, setText] = useState(initial?.text ?? "");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (rating === null) return;
    save.mutate({ rating, text }, { onSuccess: () => onDone?.() });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {save.isError ? (
        <Callout tone="danger" title="Не удалось сохранить отзыв">
          {save.error.message}
        </Callout>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-body">Оценка</span>
        <StarRatingInput value={rating} onChange={setRating} disabled={save.isPending} />
      </div>
      <TextArea
        label="Отзыв"
        placeholder="Что понравилось, чего не хватило"
        maxLength={TEXT_LIMIT}
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={save.isPending}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          variant="secondary"
          disabled={rating === null || save.isPending}
        >
          Сохранить
        </Button>
        {onDone ? (
          <Button variant="ghost" onClick={onDone} disabled={save.isPending}>
            Отмена
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function SignInToReview({ courseId }: { courseId: string }) {
  const next = `/courses/${courseId}?tab=reviews`;

  return (
    <Callout
      title="Войдите, чтобы оставить отзыв"
      actions={
        <>
          <Link to={authPath("login", next)} tabIndex={-1}>
            <Button variant="secondary" size="sm">
              <LogIn size={14} />
              Войти
            </Button>
          </Link>
          <Link to={authPath("register", next)} tabIndex={-1}>
            <Button variant="ghost" size="sm">
              Зарегистрироваться
            </Button>
          </Link>
        </>
      }
    >
      Оценки и отзывы оставляют пользователи с аккаунтом. Прогресс, накопленный без
      входа, при регистрации перенесётся в аккаунт.
    </Callout>
  );
}

function MyReview({ courseId, data }: { courseId: string; data: CourseReviews }) {
  const remove = useDeleteReview(courseId);
  const [editing, setEditing] = useState(false);
  const review = data.my_review;

  if (!review && !data.is_authenticated) {
    return <SignInToReview courseId={courseId} />;
  }

  if (!review) {
    return data.can_review ? (
      <ReviewForm courseId={courseId} initial={null} />
    ) : (
      <Callout title="Оценить курс пока нельзя">
        Отзыв можно оставить после прохождения {data.modules_required}{" "}
        {plural(data.modules_required, ["модуля", "модулей", "модулей"])}. Пройдено:{" "}
        {data.modules_completed}.
      </Callout>
    );
  }

  if (editing && data.can_review) {
    return (
      <ReviewForm courseId={courseId} initial={review} onDone={() => setEditing(false)} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {remove.isError ? (
        <Callout tone="danger" title="Не удалось удалить отзыв">
          {remove.error.message}
        </Callout>
      ) : null}
      <StarRating value={review.rating} />
      {review.text ? (
        <p className="whitespace-pre-line text-sm text-body">{review.text}</p>
      ) : null}
      <span className="text-xs text-subtle">{formatDate(review.updated_at)}</span>
      <div className="flex flex-wrap gap-3">
        {data.can_review ? (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={14} />
            Изменить
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm("Удалить ваш отзыв? Отменить это нельзя.")) {
              remove.mutate();
            }
          }}
        >
          <Trash2 size={14} />
          Удалить
        </Button>
      </div>
    </div>
  );
}

function ReviewItem({ review }: { review: ReviewOut }) {
  return (
    <li className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <span className="text-sm font-medium text-body">
        {review.author_name ?? "Пользователь"}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <StarRating value={review.rating} />
        {review.is_mine ? <Badge tone="accent">Вы</Badge> : null}
        <Badge>Пройдено {review.author_progress_percent}%</Badge>
      </div>
      {review.text ? (
        <p className="whitespace-pre-line text-sm text-body">{review.text}</p>
      ) : null}
      <span className="text-xs text-subtle">{formatDate(review.updated_at)}</span>
    </li>
  );
}

export function ReviewsTab({ courseId }: { courseId: string }) {
  const { data, isLoading, error } = useReviews(courseId);

  return (
    <QueryState isLoading={isLoading} error={error}>
      {data ? (
        <div className="flex flex-col gap-6">
          <Card>
            <CardBody className="flex flex-col gap-4">
              <h2 className="text-base font-semibold tracking-tight">Ваш отзыв</h2>
              <MyReview courseId={courseId} data={data} />
            </CardBody>
          </Card>

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-tight">Все отзывы</h2>
              {data.rating_average != null ? (
                <StarRating value={data.rating_average} count={data.rating_count} />
              ) : null}
            </div>
            {data.reviews.length > 0 ? (
              <Card>
                <CardBody>
                  <ul className="flex flex-col divide-y divide-line">
                    {data.reviews.map((review) => (
                      <ReviewItem key={review.id} review={review} />
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ) : (
              <EmptyState
                title="Отзывов пока нет"
                description="Оценки появятся здесь, когда курс кто-нибудь оценит."
              />
            )}
          </section>
        </div>
      ) : null}
    </QueryState>
  );
}
