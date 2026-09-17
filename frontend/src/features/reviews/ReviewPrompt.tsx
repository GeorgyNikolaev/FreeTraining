import { Star } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";

import { Button } from "../../components/ui/Button";
import { Callout } from "../../components/ui/Callout";
import { useReviews } from "../../lib/api/queries";
import { authPath } from "../../lib/auth/AuthProvider";
import type { CourseDetail } from "../../lib/api/types";

const DISMISS_KEY_PREFIX = "freetraining-review-prompt-dismissed:";

function readDismissed(courseId: string): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY_PREFIX + courseId) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(courseId: string): void {
  try {
    localStorage.setItem(DISMISS_KEY_PREFIX + courseId, "1");
  } catch {
    // приватный режим браузера — предложение просто появится снова
  }
}

/**
 * Предложение оценить пройденный курс. Показывается, пока отзыва нет и
 * пользователь не нажал «Не сейчас» (запоминается в браузере по курсу).
 */
export function ReviewPrompt({
  course,
  onRate,
}: {
  course: CourseDetail;
  onRate: () => void;
}) {
  const completed = course.status === "completed";
  const [dismissed, setDismissed] = useState(() => readDismissed(course.id));
  const { data } = useReviews(course.id, completed && !dismissed);

  if (!completed || dismissed || !data || data.my_review) return null;
  // Гостю оценивать нельзя, но пройденный курс — хороший повод завести аккаунт
  if (!data.is_authenticated) {
    return (
      <Prompt
        courseId={course.id}
        onDismiss={() => setDismissed(true)}
        text="Войдите или зарегистрируйтесь, чтобы поставить оценку. Прогресс сохранится."
      >
        <Link to={authPath("login", `/courses/${course.id}?tab=reviews`)} tabIndex={-1}>
          <Button variant="secondary" size="sm">
            <Star size={14} />
            Войти и оценить
          </Button>
        </Link>
      </Prompt>
    );
  }
  if (!data.can_review) return null;

  return (
    <Prompt
      courseId={course.id}
      onDismiss={() => setDismissed(true)}
      text="Поставьте оценку и напишите пару слов — это займёт минуту."
    >
      <Button variant="secondary" size="sm" onClick={onRate}>
        <Star size={14} />
        Оценить курс
      </Button>
    </Prompt>
  );
}

function Prompt({
  courseId,
  onDismiss,
  text,
  children,
}: {
  courseId: string;
  onDismiss: () => void;
  text: string;
  children: ReactNode;
}) {
  return (
    <Callout
      tone="success"
      title="Курс пройден"
      actions={
        <>
          {children}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              writeDismissed(courseId);
              onDismiss();
            }}
          >
            Не сейчас
          </Button>
        </>
      }
    >
      {text}
    </Callout>
  );
}
