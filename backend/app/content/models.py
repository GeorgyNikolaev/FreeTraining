from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

Level = Literal["beginner", "intermediate", "advanced"]


def _unpack_marked_options(data: dict[str, Any]) -> dict[str, Any]:
    """Переводит вариант с пометкой `correct: true` в пару options/answer.

    Формулировка верного ответа нигде не дублируется, поэтому разойтись с
    вариантом она не может. Старая запись (`answer` со строкой) продолжает
    работать без изменений.
    """
    options = data.get("options")
    if not isinstance(options, list) or not any(isinstance(item, dict) for item in options):
        return data

    if not all(isinstance(item, dict) for item in options):
        raise ValueError(
            "варианты записаны по-разному: либо у всех поле text, либо все строками"
        )
    if data.get("answer") is not None:
        raise ValueError("укажите либо answer, либо пометку correct у вариантов, но не оба")

    texts: list[str] = []
    correct: list[str] = []
    for item in options:
        if "text" not in item:
            raise ValueError("у варианта нет поля text")
        text = str(item["text"])
        texts.append(text)
        if item.get("correct"):
            correct.append(text)

    if not correct:
        raise ValueError("ни один вариант не помечен correct: true")

    return {**data, "options": texts, "answer": correct[0] if len(correct) == 1 else correct}


class Question(BaseModel):
    question: str
    options: list[str] = Field(min_length=2)
    answer: str | list[str]
    explanation: str = ""

    @model_validator(mode="before")
    @classmethod
    def accept_marked_options(cls, data: Any) -> Any:
        return _unpack_marked_options(data) if isinstance(data, dict) else data

    @property
    def correct_answers(self) -> list[str]:
        return list(self.answer) if isinstance(self.answer, list) else [self.answer]

    @property
    def multiple(self) -> bool:
        return isinstance(self.answer, list)

    @model_validator(mode="after")
    def check_answers_match_options(self) -> "Question":
        if len(set(self.options)) != len(self.options):
            raise ValueError("варианты ответа повторяются")
        if not self.correct_answers:
            raise ValueError("не указан правильный ответ")
        for value in self.correct_answers:
            if value not in self.options:
                raise ValueError(f'ответ "{value}" отсутствует среди вариантов')
        return self


class Quiz(BaseModel):
    pass_score: int = Field(default=70, ge=0, le=100)
    questions: list[Question] = Field(min_length=1)


class Lesson(BaseModel):
    id: str
    title: str
    path: Path


class Module(BaseModel):
    id: str
    title: str
    lessons: list[Lesson]
    quiz: Quiz | None = None
    homework: Path | None = None


class Course(BaseModel):
    id: str
    dir: Path
    title: str
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    level: Level = "beginner"
    prerequisites: list[str] = Field(default_factory=list)
    modules: list[Module] = Field(default_factory=list)
    has_cheatsheet: bool = False
    has_glossary: bool = False
    exam: Quiz | None = None

    @property
    def lesson_count(self) -> int:
        return sum(len(module.lessons) for module in self.modules)

    @property
    def quiz_count(self) -> int:
        return sum(1 for module in self.modules if module.quiz is not None)
