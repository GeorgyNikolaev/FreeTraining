import { Star } from "lucide-react";
import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { Callout } from "../../components/ui/Callout";
import { useReviews } from "../../lib/api/queries";
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

  if (!completed || dismissed || !data?.can_review || data.my_review) return null;

  return (
    <Callout
      tone="success"
      title="Курс пройден"
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={onRate}>
            <Star size={14} />
            Оценить курс
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              writeDismissed(course.id);
              setDismissed(true);
            }}
          >
            Не сейчас
          </Button>
        </>
      }
    >
      Поставьте оценку и напишите пару слов — это займёт минуту.
    </Callout>
  );
}
