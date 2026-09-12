from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, model_validator

Level = Literal["beginner", "intermediate", "advanced"]


class Question(BaseModel):
    question: str
    options: list[str] = Field(min_length=2)
    answer: str | list[str]
    explanation: str = ""

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


class Course(BaseModel):
    id: str
    dir: Path
    title: str
    description: str = ""
    tags: list[str] = Field(default_factory=list)
    level: Level = "beginner"
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
