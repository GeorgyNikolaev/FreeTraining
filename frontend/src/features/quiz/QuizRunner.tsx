import { useMemo, useState } from "react";

import { Callout } from "../../components/ui/Callout";
import { Button } from "../../components/ui/Button";
import { useSubmitQuiz } from "../../lib/api/queries";
import type { QuizPublic, QuizResult } from "../../lib/api/types";
import { AnswerOption, type OptionState } from "./AnswerOption";
import { ResultBanner } from "./ResultBanner";

function optionState(
  result: QuizResult | undefined,
  questionIndex: number,
  option: string,
): OptionState {
  if (!result) return "idle";
  const review = result.results[questionIndex];
  if (!review) return "idle";

  const selected = review.selected.includes(option);
  const correct = review.correct_answer.includes(option);

  if (selected && correct) return "correct";
  if (selected && !correct) return "wrong";
  if (!selected && correct) return "missed";
  return "idle";
}

export function QuizRunner({ quiz }: { quiz: QuizPublic }) {
  const [selections, setSelections] = useState<string[][]>(() =>
    quiz.questions.map(() => []),
  );
  const submit = useSubmitQuiz(quiz.course_id);
  const result = submit.data;
  const reviewing = result !== undefined;

  const answered = useMemo(
    () => selections.every((selected) => selected.length > 0),
    [selections],
  );

  function toggle(questionIndex: number, option: string, multiple: boolean) {
    setSelections((current) =>
      current.map((selected, index) => {
        if (index !== questionIndex) return selected;
        if (!multiple) return [option];
        return selected.includes(option)
          ? selected.filter((value) => value !== option)
          : [...selected, option];
      }),
    );
  }

  function check() {
    submit.mutate({
      course_id: quiz.course_id,
      scope: quiz.scope,
      module_id: quiz.module_id,
      answers: selections,
    });
  }

  function retry() {
    submit.reset();
    setSelections(quiz.questions.map(() => []));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-8">
      {result ? <ResultBanner result={result} onRetry={retry} /> : null}

      <ol className="flex flex-col gap-8">
        {quiz.questions.map((question, index) => {
          const review = result?.results[index];
          return (
            <li key={question.index} className="flex flex-col gap-3">
              <p className="font-medium">
                <span className="text-subtle">{index + 1}.</span> {question.question}
              </p>

              <div className="flex flex-col gap-2">
                {question.options.map((option) => (
                  <AnswerOption
                    key={option}
                    name={`question-${question.index}`}
                    label={option}
                    multiple={question.multiple}
                    checked={selections[index]?.includes(option) ?? false}
                    disabled={reviewing}
                    state={optionState(result, index, option)}
                    onChange={() => toggle(index, option, question.multiple)}
                  />
                ))}
              </div>

              {review ? (
                <Callout
                  tone={review.is_correct ? "success" : "danger"}
                  title={review.is_correct ? "Верно" : "Неверно"}
                >
                  {review.explanation}
                </Callout>
              ) : null}
            </li>
          );
        })}
      </ol>

      {submit.error ? (
        <Callout tone="danger" title="Не удалось отправить ответы">
          {submit.error.message}
        </Callout>
      ) : null}

      {reviewing ? null : (
        <div className="flex items-center gap-4 border-t border-line pt-6">
          <Button
            variant="secondary"
            size="lg"
            onClick={check}
            disabled={!answered || submit.isPending}
          >
            Проверить
          </Button>
          {answered ? null : (
            <span className="text-sm text-muted">Ответьте на все вопросы</span>
          )}
        </div>
      )}
    </div>
  );
}
