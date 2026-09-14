from pathlib import Path

import pytest
from pydantic import ValidationError

from app.content.models import Course, Lesson, Module, Question, Quiz


def test_single_answer_question():
    question = Question(question="Сколько будет 2+2?", options=["3", "4"], answer="4")

    assert question.multiple is False
    assert question.correct_answers == ["4"]


def test_multiple_answer_question():
    question = Question(
        question="Какие типы изменяемые?",
        options=["list", "tuple", "dict"],
        answer=["list", "dict"],
    )

    assert question.multiple is True
    assert question.correct_answers == ["list", "dict"]


def test_answer_outside_options_is_rejected():
    with pytest.raises(ValidationError) as error:
        Question(question="Сколько будет 2+2?", options=["3", "4"], answer="5")

    assert 'ответ "5" отсутствует среди вариантов' in str(error.value)


def test_duplicate_options_are_rejected():
    with pytest.raises(ValidationError) as error:
        Question(question="Выбери число", options=["4", "4"], answer="4")

    assert "варианты ответа повторяются" in str(error.value)


def test_question_requires_at_least_two_options():
    with pytest.raises(ValidationError):
        Question(question="Выбери число", options=["4"], answer="4")


def test_pass_score_above_hundred_is_rejected():
    question = Question(question="Сколько будет 2+2?", options=["3", "4"], answer="4")

    with pytest.raises(ValidationError):
        Quiz(pass_score=120, questions=[question])


def test_quiz_requires_at_least_one_question():
    with pytest.raises(ValidationError):
        Quiz(pass_score=70, questions=[])


def test_course_counts_lessons_and_quizzes():
    question = Question(question="Сколько будет 2+2?", options=["3", "4"], answer="4")
    quiz = Quiz(questions=[question])
    lesson = Lesson(id="01-intro", title="Введение", path=Path("01-intro.md"))
    modules = [
        Module(id="01-a", title="Первый", lessons=[lesson, lesson], quiz=quiz),
        Module(id="02-b", title="Второй", lessons=[lesson], quiz=None),
    ]
    course = Course(id="demo", dir=Path("demo"), title="Демо", modules=modules)

    assert course.lesson_count == 3
    assert course.quiz_count == 1


def test_marked_option_becomes_single_answer():
    question = Question(
        question="Сколько будет 2+2?",
        options=[{"text": "3"}, {"text": "4", "correct": True}],
    )

    assert question.multiple is False
    assert question.options == ["3", "4"]
    assert question.correct_answers == ["4"]


def test_several_marked_options_make_question_multiple():
    question = Question(
        question="Какие типы изменяемые?",
        options=[
            {"text": "list", "correct": True},
            {"text": "tuple"},
            {"text": "dict", "correct": True},
        ],
    )

    assert question.multiple is True
    assert question.correct_answers == ["list", "dict"]


def test_question_without_marked_option_is_rejected():
    with pytest.raises(ValidationError) as error:
        Question(question="Сколько будет 2+2?", options=[{"text": "3"}, {"text": "4"}])

    assert "ни один вариант не помечен correct: true" in str(error.value)


def test_mixed_option_styles_are_rejected():
    with pytest.raises(ValidationError) as error:
        Question(question="Сколько будет 2+2?", options=["3", {"text": "4", "correct": True}])

    assert "варианты записаны по-разному" in str(error.value)


def test_answer_together_with_marked_option_is_rejected():
    with pytest.raises(ValidationError) as error:
        Question(
            question="Сколько будет 2+2?",
            options=[{"text": "3"}, {"text": "4", "correct": True}],
            answer="3",
        )

    assert "либо answer, либо пометку correct" in str(error.value)


def test_option_without_text_is_rejected():
    with pytest.raises(ValidationError) as error:
        Question(question="Сколько будет 2+2?", options=[{"text": "3"}, {"correct": True}])

    assert "у варианта нет поля text" in str(error.value)


def test_module_homework_is_optional():
    lesson = Lesson(id="01-intro", title="Введение", path=Path("01-intro.md"))
    module = Module(id="01-a", title="Первый", lessons=[lesson])

    assert module.homework is None
