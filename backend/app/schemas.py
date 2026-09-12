from typing import Literal

from pydantic import BaseModel


class QuestionResult(BaseModel):
    question: str
    options: list[str]
    selected: list[str]
    correct_answer: list[str]
    is_correct: bool
    explanation: str


StepKind = Literal["lesson", "quiz", "exam"]


class StepLink(BaseModel):
    kind: StepKind
    module_id: str | None = None
    lesson_id: str | None = None
    title: str
