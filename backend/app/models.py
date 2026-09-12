from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Column, DateTime, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class LessonProgress(SQLModel, table=True):
    __tablename__ = "lesson_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "course_id", "module_id", "lesson_id", name="uq_lesson_progress"
        ),
        Index("ix_lesson_progress_user_course", "user_id", "course_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: str
    course_id: str
    module_id: str
    lesson_id: str
    completed_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class QuizAttempt(SQLModel, table=True):
    __tablename__ = "quiz_attempt"
    __table_args__ = (
        Index("ix_quiz_attempt_user_course", "user_id", "course_id", "module_id"),
    )

    id: int | None = Field(default=None, primary_key=True)
    user_id: str
    course_id: str
    scope: str
    module_id: str | None = None
    total_questions: int
    correct_count: int
    score_percent: int
    passed: bool
    answers: list[dict[str, Any]] = Field(
        default_factory=list, sa_column=Column(JSONB, nullable=False)
    )
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class LastPosition(SQLModel, table=True):
    __tablename__ = "last_position"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_last_position"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: str
    course_id: str
    module_id: str
    lesson_id: str
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
