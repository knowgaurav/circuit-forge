"""Shared request/response models, the service dependency, and the error mapper.

Why this module exists separately
---------------------------------
The course API is split across several route modules (generation, local-LLM,
enrollment, levels). They all need the same Pydantic request/response shapes,
the same ``get_course_service`` dependency, and the same exception-to-HTTP
mapping. Centralizing those here keeps the route files focused on routing.

``handle_exception`` is the single place that decides which HTTP status each
error becomes: provider errors map to 401/429/402/503, app errors to
404/400, and anything unexpected becomes a 500 with the details hidden.
"""

from typing import Any

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.core.database import db_manager
from app.core.logger import get_logger
from app.exceptions.base import AppException, NotFoundException, ValidationException
from app.models.course import (
    CourseEnrollment,
    CoursePlan,
    LevelContent,
    LLMConfig,
)
from app.services.course_service import CourseService
from app.services.llm_providers import (
    AuthenticationError,
    LLMError,
    ProviderUnavailableError,
    QuotaExceededError,
    RateLimitError,
)

logger = get_logger()


# --- Request/Response models -------------------------------------------------


class GeneratePlanResponse(BaseModel):
    """Response for course plan generation."""
    course_plan: CoursePlan = Field(alias="coursePlan")

    model_config = {"populate_by_name": True}


class EnrollRequest(BaseModel):
    """Request to enroll in a course."""
    participant_id: str = Field(alias="participantId")

    model_config = {"populate_by_name": True}


class EnrollResponse(BaseModel):
    """Response for course enrollment."""
    enrollment: CourseEnrollment


class LevelContentResponse(BaseModel):
    """Response for level content."""
    content: LevelContent | None
    is_generating: bool = Field(alias="isGenerating")

    model_config = {"populate_by_name": True}


class GenerateLevelContentRequest(BaseModel):
    """Request to generate level content with user API key."""
    llm_config: LLMConfig = Field(alias="llmConfig")

    model_config = {"populate_by_name": True}


class ValidateRequest(BaseModel):
    """Request to validate a circuit."""
    circuit_state: dict[str, Any] = Field(alias="circuitState")
    enrollment_id: str | None = Field(default=None, alias="enrollmentId")

    model_config = {"populate_by_name": True}


class CompleteRequest(BaseModel):
    """Request to complete a level."""
    enrollment_id: str = Field(alias="enrollmentId")
    circuit_snapshot: dict[str, Any] | None = Field(
        default=None, alias="circuitSnapshot"
    )

    model_config = {"populate_by_name": True}


class CompleteResponse(BaseModel):
    """Response for level completion."""
    success: bool
    next_level: int | None = Field(alias="nextLevel")

    model_config = {"populate_by_name": True}


class MyCourseItem(BaseModel):
    """A course in the user's course list."""
    enrollment: CourseEnrollment
    course_plan: CoursePlan = Field(alias="coursePlan")
    completed_levels: int = Field(alias="completedLevels")
    total_levels: int = Field(alias="totalLevels")

    model_config = {"populate_by_name": True}


# --- Dependency + error mapping ----------------------------------------------


def get_course_service() -> CourseService:
    """Get course service instance."""
    return CourseService(db_manager.get_database())


def handle_exception(e: Exception) -> None:
    """Convert app exceptions to HTTP exceptions."""
    # Handle LLM-specific errors first
    if isinstance(e, AuthenticationError):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "AUTHENTICATION_ERROR", "message": e.message, "provider": e.provider}},
        )
    elif isinstance(e, RateLimitError):
        headers = {}
        if e.retry_after:
            headers["Retry-After"] = str(e.retry_after)
        raise HTTPException(
            status_code=429,
            detail={"error": {"code": "RATE_LIMITED", "message": e.message, "provider": e.provider}},
            headers=headers if headers else None,
        )
    elif isinstance(e, QuotaExceededError):
        raise HTTPException(
            status_code=402,
            detail={"error": {"code": "QUOTA_EXCEEDED", "message": e.message, "provider": e.provider}},
        )
    elif isinstance(e, ProviderUnavailableError):
        raise HTTPException(
            status_code=503,
            detail={"error": {"code": "PROVIDER_UNAVAILABLE", "message": e.message, "provider": e.provider}},
        )
    elif isinstance(e, LLMError):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": e.code, "message": e.message, "provider": e.provider}},
        )
    # Handle app exceptions
    elif isinstance(e, NotFoundException):
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": e.code, "message": e.message}},
        )
    elif isinstance(e, ValidationException):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": e.code, "message": e.message}},
        )
    elif isinstance(e, AppException):
        raise HTTPException(
            status_code=e.status_code,
            detail={"error": {"code": e.code, "message": e.message}},
        )
    elif isinstance(e, ValueError):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "VALIDATION_ERROR", "message": str(e)}},
        )
    else:
        # Log unexpected errors but don't expose details
        logger.exception(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
        )
