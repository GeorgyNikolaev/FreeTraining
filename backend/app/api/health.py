from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends

from app.content.loader import load_courses
from app.deps import get_content_dir
from app.schemas import ContentErrorOut, ContentHealth

router = APIRouter(prefix="/api/health", tags=["health"])

ContentDep = Annotated[Path, Depends(get_content_dir)]


@router.get("/content", response_model=ContentHealth)
async def content_health(content_dir: ContentDep) -> ContentHealth:
    result = load_courses(content_dir)
    return ContentHealth(
        ok=not result.errors,
        course_count=len(result.courses),
        errors=[
            ContentErrorOut(
                course_id=error.course_id,
                location=error.location,
                message=error.message,
            )
            for error in result.errors
        ],
        warnings=[
            ContentErrorOut(
                course_id=warning.course_id,
                location=warning.location,
                message=warning.message,
            )
            for warning in result.warnings
        ],
    )
