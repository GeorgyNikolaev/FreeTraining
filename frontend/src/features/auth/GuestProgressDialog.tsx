import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { Callout } from "../../components/ui/Callout";
import { Dialog } from "../../components/ui/Dialog";
import { useAuth } from "../../lib/auth/AuthProvider";
import { plural } from "../../lib/plural";
import type { GuestProgress } from "../../lib/api/types";

function describe(progress: GuestProgress): string {
  const courses = `${progress.courses} ${plural(progress.courses, ["курсе", "курсах", "курсах"])}`;
  const parts: string[] = [];
  if (progress.lessons > 0) {
    parts.push(`${progress.lessons} ${plural(progress.lessons, ["урок", "урока", "уроков"])}`);
  }
  if (progress.attempts > 0) {
    const forms: [string, string, string] = ["попытка теста", "попытки тестов", "попыток тестов"];
    parts.push(`${progress.attempts} ${plural(progress.attempts, forms)}`);
  }
  return parts.length > 0 ? `${courses}: ${parts.join(" и ")}` : courses;
}

/**
 * После входа в существующий аккаунт спрашивает, что делать с прогрессом,
 * накопленным на этом устройстве без входа. Пока выбора нет, вопрос
 * повторяется при следующей загрузке страницы.
 */
export function GuestProgressDialog() {
  const auth = useAuth();
  const [postponed, setPostponed] = useState(false);
  const [pending, setPending] = useState<"merge" | "discard" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progress = auth.status === "user" ? auth.guestProgress : null;
  if (!progress) return null;

  async function settle(action: "merge" | "discard") {
    setPending(action);
    setError(null);
    try {
      if (action === "merge") await auth.mergeGuestProgress();
      else await auth.discardGuestProgress();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не получилось, попробуйте ещё раз");
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog
      open={!postponed}
      onClose={() => setPostponed(true)}
      title="Перенести прогресс в аккаунт?"
      actions={
        <>
          <Button
            variant="secondary"
            disabled={pending !== null}
            onClick={() => void settle("discard")}
          >
            {pending === "discard" ? "Удаляем…" : "Не переносить"}
          </Button>
          <Button disabled={pending !== null} onClick={() => void settle("merge")}>
            {pending === "merge" ? "Переносим…" : "Перенести"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? (
          <Callout tone="danger" title="Не удалось сохранить выбор">
            {error}
          </Callout>
        ) : null}
        <p>
          На этом устройстве без входа есть прогресс в {describe(progress)}. Перенести
          его в аккаунт «{auth.user?.name}»? Пройденное в аккаунте сохранится.
        </p>
        <p>Если не переносить, прогресс без входа будет удалён.</p>
      </div>
    </Dialog>
  );
}
