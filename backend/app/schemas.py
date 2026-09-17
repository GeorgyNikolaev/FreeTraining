from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class QuestionResult(BaseModel):
    question: str
    options: list[str]
    selected: list[str]
    correct_answer: list[str]
    is_correct: bool
    explanation: str


StepKind = Literal["lesson", "homework", "quiz", "exam"]


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
    prerequisites: list[str] = []
    module_count: int
    lesson_count: int
    progress_percent: int
    status: str
    rating_average: float | None = None
    rating_count: int = 0
    resume: ResumePosition | None = None


class LessonRef(BaseModel):
    id: str
    title: str
    completed: bool


class ModuleDetail(BaseModel):
    id: str
    title: str
    lessons: list[LessonRef]
    has_homework: bool = False
    has_quiz: bool
    quiz_passed: bool
    quiz_best_score: int | None = None


class CourseDetail(BaseModel):
    id: str
    title: str
    description: str
    tags: list[str]
    level: str
    prerequisites: list[str] = []
    modules: list[ModuleDetail]
    has_cheatsheet: bool
    has_glossary: bool
    has_exam: bool
    exam_passed: bool
    exam_best_score: int | None = None
    progress_percent: int
    status: str
    rating_average: float | None = None
    rating_count: int = 0
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


class HomeworkDetail(BaseModel):
    course_id: str
    module_id: str
    module_title: str
    title: str
    content: str
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


class PositionInput(BaseModel):
    module_id: str
    lesson_id: str


class LessonProgressOut(BaseModel):
    course_id: str
    module_id: str
    lesson_id: str
    completed: bool
    completed_at: datetime


class AttemptSummary(BaseModel):
    id: int
    course_id: str
    scope: QuizScope
    module_id: str | None = None
    total_questions: int
    correct_count: int
    score_percent: int
    passed: bool
    created_at: datetime
    results: list[QuestionResult]


class PositionOut(BaseModel):
    course_id: str
    module_id: str
    lesson_id: str
    updated_at: datetime


class ProgressExport(BaseModel):
    user_id: str
    exported_at: datetime
    lessons: list[LessonProgressOut]
    attempts: list[AttemptSummary]
    positions: list[PositionOut]
    reviews: list["MyCourseReview"] = []


class ContentErrorOut(BaseModel):
    course_id: str
    location: str
    message: str


class ContentHealth(BaseModel):
    ok: bool
    course_count: int
    errors: list[ContentErrorOut]
    warnings: list[ContentErrorOut]


REVIEW_TEXT_LIMIT = 2000


class ReviewInput(BaseModel):
    rating: int = Field(ge=1, le=5, strict=True)
    text: str | None = Field(default=None, max_length=REVIEW_TEXT_LIMIT)

    @field_validator("text")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class MyReview(BaseModel):
    rating: int
    text: str | None
    created_at: datetime
    updated_at: datetime


class MyCourseReview(MyReview):
    course_id: str


class ReviewOut(MyReview):
    id: int
    course_id: str
    is_mine: bool
    author_name: str | None = None
    author_progress_percent: int


class CourseReviews(BaseModel):
    course_id: str
    rating_average: float | None
    rating_count: int
    is_authenticated: bool
    can_review: bool
    modules_required: int
    modules_completed: int
    my_review: MyReview | None
    reviews: list[ReviewOut]


NAME_MAX_LENGTH = 50
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128


def normalize_email(value: str) -> str:
    return value.strip().lower()


class RegisterInput(BaseModel):
    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def lower_email(cls, value: object) -> object:
        return normalize_email(value) if isinstance(value, str) else value


class LoginInput(BaseModel):
    email: str = Field(min_length=1, max_length=320)
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)

    @field_validator("email", mode="before")
    @classmethod
    def lower_email(cls, value: object) -> object:
        return normalize_email(value) if isinstance(value, str) else value


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    email_verified: bool


class GuestProgress(BaseModel):
    courses: int
    lessons: int
    attempts: int


class AuthSession(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserOut
    guest_progress: GuestProgress | None


class Me(BaseModel):
    user: UserOut
    guest_progress: GuestProgress | None


ProgressExport.model_rebuild()
