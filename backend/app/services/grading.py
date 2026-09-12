from dataclasses import dataclass

from app.content.models import Quiz
from app.schemas import QuestionResult


@dataclass
class GradeOutcome:
    total_questions: int
    correct_count: int
    score_percent: int
    passed: bool
    results: list[QuestionResult]


def grade_quiz(quiz: Quiz, answers: list[list[str]]) -> GradeOutcome:
    """Сверяет ответы с тестом. Порядок выбранных вариантов не важен."""
    if len(answers) != len(quiz.questions):
        raise ValueError(
            f"число ответов ({len(answers)}) не совпадает "
            f"с числом вопросов ({len(quiz.questions)})"
        )

    results: list[QuestionResult] = []
    for question, selected in zip(quiz.questions, answers, strict=True):
        results.append(
            QuestionResult(
                question=question.question,
                options=question.options,
                selected=list(selected),
                correct_answer=question.correct_answers,
                is_correct=set(selected) == set(question.correct_answers),
                explanation=question.explanation,
            )
        )

    total = len(results)
    correct = sum(1 for result in results if result.is_correct)
    percent = round(correct * 100 / total) if total else 0

    return GradeOutcome(
        total_questions=total,
        correct_count=correct,
        score_percent=percent,
        passed=percent >= quiz.pass_score,
        results=results,
    )
