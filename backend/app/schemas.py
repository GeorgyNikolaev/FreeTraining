from pydantic import BaseModel


class QuestionResult(BaseModel):
    question: str
    options: list[str]
    selected: list[str]
    correct_answer: list[str]
    is_correct: bool
    explanation: str
