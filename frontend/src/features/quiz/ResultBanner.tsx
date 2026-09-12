import clsx from "clsx";
import { CheckCircle2, XCircle } from "lucide-react";

import type { QuizResult } from "../../lib/api/types";

export function ResultBanner({ result }: { result: QuizResult }) {
  const Icon = result.passed ? CheckCircle2 : XCircle;

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-4 rounded-card p-4",
        result.passed ? "bg-success-soft" : "bg-danger-soft",
      )}
    >
      <Icon
        size={22}
        className={result.passed ? "text-success" : "text-danger"}
        aria-hidden="true"
      />
      <div>
        <p className="text-base font-semibold tabular-nums tracking-tight">
          {result.correct_count} из {result.total_questions} ·{" "}
          {result.score_percent}% · {result.passed ? "Зачёт" : "Незачёт"}
        </p>
        <p className="text-sm text-muted">
          Проходной балл — {result.pass_score}%
        </p>
      </div>
    </div>
  );
}
