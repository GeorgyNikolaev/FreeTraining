import pytest

from app.content.models import Question, Quiz
from app.services.grading import grade_quiz


def build_quiz(pass_score: int = 50) -> Quiz:
    return Quiz(
        pass_score=pass_score,
        questions=[
            Question(
                question="Сколько будет 2+2?",
                options=["3", "4"],
                answer="4",
                explanation="Это арифметика.",
            ),
            Question(
                question="Какие типы изменяемые?",
                options=["list", "tuple", "dict"],
                answer=["list", "dict"],
                explanation="Кортежи неизменяемы.",
            ),
        ],
    )


def test_all_answers_correct():
    outcome = grade_quiz(build_quiz(), [["4"], ["list", "dict"]])

    assert outcome.total_questions == 2
    assert outcome.correct_count == 2
    assert outcome.score_percent == 100
    assert outcome.passed is True


def test_multiple_answer_order_does_not_matter():
    outcome = grade_quiz(build_quiz(), [["4"], ["dict", "list"]])

    assert outcome.correct_count == 2


def test_partial_selection_of_multiple_answer_is_wrong():
    outcome = grade_quiz(build_quiz(), [["4"], ["list"]])

    assert outcome.correct_count == 1
    assert outcome.score_percent == 50
    assert outcome.results[1].is_correct is False


def test_score_below_pass_score_does_not_pass():
    outcome = grade_quiz(build_quiz(pass_score=80), [["4"], ["list"]])

    assert outcome.score_percent == 50
    assert outcome.passed is False


def test_score_equal_to_pass_score_passes():
    outcome = grade_quiz(build_quiz(pass_score=50), [["4"], ["list"]])

    assert outcome.score_percent == 50
    assert outcome.passed is True


def test_empty_answer_is_wrong():
    outcome = grade_quiz(build_quiz(), [[], ["list", "dict"]])

    assert outcome.results[0].is_correct is False
    assert outcome.results[0].selected == []


def test_result_carries_snapshot_of_question():
    outcome = grade_quiz(build_quiz(), [["3"], ["list", "dict"]])
    first = outcome.results[0]

    assert first.question == "Сколько будет 2+2?"
    assert first.options == ["3", "4"]
    assert first.correct_answer == ["4"]
    assert first.explanation == "Это арифметика."


def test_wrong_number_of_answers_is_rejected():
    with pytest.raises(ValueError, match="число ответов"):
        grade_quiz(build_quiz(), [["4"]])
