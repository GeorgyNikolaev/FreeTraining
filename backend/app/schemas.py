from datetime import datetime
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


class ResumePosition(BaseModel):
    module_id: str
    lesson_id: str
    lesson_title: str


class CourseSummary(BaseModel):
    id: str
    title: str
    description: str
    tags: list[str]
    level: str
    module_count: int
    lesson_count: int
    progress_percent: int
    status: str
    resume: ResumePosition | None = None


class LessonRef(BaseModel):
    id: str
    title: str
    completed: bool


class ModuleDetail(BaseModel):
    id: str
    title: str
    lessons: list[LessonRef]
    has_quiz: bool
    quiz_passed: bool
    quiz_best_score: int | None = None


class CourseDetail(BaseModel):
    id: str
    title: str
    description: str
    tags: list[str]
    level: str
    modules: list[ModuleDetail]
    has_cheatsheet: bool
    has_glossary: bool
    has_exam: bool
    exam_passed: bool
    exam_best_score: int | None = None
    progress_percent: int
    status: str
    resume: ResumePosition | None = None


class LessonDetail(BaseModel):
    course_id: str
    module_id: str
    lesson_id: str
    title: str
    content: str
    completed: bool
    prev: StepLink | None = None
    next: StepLink | None = None


class PageDetail(BaseModel):
    course_id: str
    page: str
    title: str
    content: str


QuizScope = Literal["module", "exam"]


class QuizQuestionPublic(BaseModel):
    index: int
    question: str
    options: list[str]
    multiple: bool


class QuizPublic(BaseModel):
    course_id: str
    scope: QuizScope
    module_id: str | None = None
    title: str
    pass_score: int
    questions: list[QuizQuestionPublic]


class QuizSubmission(BaseModel):
    course_id: str
    scope: QuizScope
    module_id: str | None = None
    answers: list[list[str]]


class QuizResult(BaseModel):
    attempt_id: int
    course_id: str
    scope: QuizScope
    module_id: str | None = None
    total_questions: int
    correct_count: int
    score_percent: int
    passed: bool
    pass_score: int
    results: list[QuestionResult]
    created_at: datetime
