"""Course API endpoints for LLM Course Generator."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import db_manager
from app.exceptions.base import AppException, NotFoundException, ValidationException
from app.models.course import (
    CourseEnrollment,
    CoursePlan,
    GeneratePlanRequest,
    LevelContent,
    LLMConfig,
    TestConnectionRequest,
    TestConnectionResponse,
    TopicSuggestion,
    ValidationResult,
)
from app.services.course_service import CourseService
from app.services.llm_providers import (
    AuthenticationError,
    LLMError,
    LocalLLMStrategy,
    ProviderUnavailableError,
    QuotaExceededError,
    RateLimitError,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response models
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


# Dependency to get course service
def get_course_service() -> CourseService:
    """Get course service instance."""
    return CourseService(db_manager.get_database())


# Exception handler helper
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


@router.get("/courses/suggestions", response_model=list[TopicSuggestion])
async def get_suggestions(
    course_service: CourseService = Depends(get_course_service),
) -> list[TopicSuggestion]:
    """Get topic suggestions for course creation."""
    return course_service.get_topic_suggestions()


@router.post("/courses/generate-plan", response_model=GeneratePlanResponse)
async def generate_plan(
    request: GeneratePlanRequest,
    course_service: CourseService = Depends(get_course_service),
) -> GeneratePlanResponse:
    """Generate a course plan for the given topic using user's API key.
    
    The API key is used only for this request and is never stored.
    """
    try:
        course_plan = await course_service.generate_course_plan(
            topic=request.topic,
            participant_id=request.participant_id,
            provider_id=request.llm_config.provider,
            api_key=request.llm_config.api_key,
            model=request.llm_config.model,
            temperature=request.llm_config.temperature,
            max_tokens=request.llm_config.max_tokens,
            base_url=request.llm_config.base_url,
            bridge_token=request.llm_config.bridge_token,
        )
        return GeneratePlanResponse(coursePlan=course_plan)
    except Exception as e:
        handle_exception(e)
        raise  # For type checker


@router.post("/courses/test-connection", response_model=TestConnectionResponse)
async def test_connection(
    request: TestConnectionRequest,
    course_service: CourseService = Depends(get_course_service),
) -> TestConnectionResponse:
    """Test API key validity with a minimal request.
    
    The API key is used only for this test and is never stored.
    """
    try:
        result = await course_service.test_connection(
            provider_id=request.provider,
            api_key=request.api_key,
            model=request.model,
        )
        return TestConnectionResponse(
            success=result["success"],
            message=result.get("message", ""),
            error=result.get("error"),
            tokenUsage=result.get("token_usage"),
        )
    except Exception as e:
        handle_exception(e)
        raise


# --- Local LLM Endpoints ---

class TestLocalConnectionRequest(BaseModel):
    """Request to test local LLM connection."""
    base_url: str = Field(alias="baseUrl")
    token: str
    model: str

    model_config = {"populate_by_name": True}


class FetchLocalModelsRequest(BaseModel):
    """Request to fetch models from local LLM."""
    base_url: str = Field(alias="baseUrl")
    token: str

    model_config = {"populate_by_name": True}


class FetchLocalModelsResponse(BaseModel):
    """Response for fetching local models."""
    success: bool
    models: list[str] | None = None
    message: str | None = None


@router.post("/courses/test-local-connection", response_model=TestConnectionResponse)
async def test_local_connection(request: TestLocalConnectionRequest) -> TestConnectionResponse:
    """Test connection to local LLM via tunnel.
    
    Uses the bridge token for authentication.
    """
    try:
        local_provider = LocalLLMStrategy()
        result = await local_provider.test_connection(
            base_url=request.base_url,
            bridge_token=request.token,
            model=request.model,
        )
        return TestConnectionResponse(
            success=result["success"],
            message=result.get("message", ""),
            error=result.get("error"),
        )
    except Exception as e:
        handle_exception(e)
        raise


@router.post("/courses/local-models", response_model=FetchLocalModelsResponse)
async def fetch_local_models(request: FetchLocalModelsRequest) -> FetchLocalModelsResponse:
    """Fetch available models from local LLM server.
    
    Uses the bridge token for authentication.
    """
    try:
        local_provider = LocalLLMStrategy()
        models = await local_provider.list_models(
            base_url=request.base_url,
            bridge_token=request.token,
        )
        if models:
            return FetchLocalModelsResponse(success=True, models=models)
        else:
            return FetchLocalModelsResponse(
                success=False,
                message="No models found. Make sure your LLM server is running and has models loaded.",
            )
    except Exception as e:
        logger.error(f"Failed to fetch local models: {e}")
        return FetchLocalModelsResponse(
            success=False,
            message=str(e),
        )


@router.get("/courses/{course_id}")
async def get_course(
    course_id: str,
    course_service: CourseService = Depends(get_course_service),
) -> dict[str, Any]:
    """Get a course plan by ID."""
    try:
        course_plan = await course_service.get_course_plan(course_id)
        if not course_plan:
            raise NotFoundException("Course", course_id)
        return course_plan.model_dump(by_alias=True)
    except Exception as e:
        handle_exception(e)
        raise


@router.post("/courses/{course_id}/enroll", response_model=EnrollResponse)
async def enroll_in_course(
    course_id: str,
    request: EnrollRequest,
    course_service: CourseService = Depends(get_course_service),
) -> EnrollResponse:
    """Enroll in a course."""
    try:
        # Verify course exists
        course_plan = await course_service.get_course_plan(course_id)
        if not course_plan:
            raise NotFoundException("Course", course_id)

        enrollment = await course_service.enroll_in_course(
            request.participant_id,
            course_id,
        )
        return EnrollResponse(enrollment=enrollment)
    except Exception as e:
        handle_exception(e)
        raise


@router.post("/courses/{course_id}/levels/{level_num}", response_model=LevelContentResponse)
async def generate_level_content(
    course_id: str,
    level_num: int,
    request: GenerateLevelContentRequest,
    course_service: CourseService = Depends(get_course_service),
) -> LevelContentResponse:
    """Generate content for a specific level using user's API key.
    
    The API key is used only for this request and is never stored.
    """
    try:
        # Verify course exists
        course_plan = await course_service.get_course_plan(course_id)
        if not course_plan:
            raise NotFoundException("Course", course_id)

        # Validate level number
        if level_num < 1 or level_num > len(course_plan.levels):
            raise ValidationException(
                message=f"Invalid level number. Course has {len(course_plan.levels)} levels.",
                code="INVALID_LEVEL",
            )

        content = await course_service.get_level_content(
            course_plan_id=course_id,
            level_number=level_num,
            provider_id=request.llm_config.provider,
            api_key=request.llm_config.api_key,
            model=request.llm_config.model,
            temperature=request.llm_config.temperature,
            max_tokens=request.llm_config.max_tokens,
            base_url=request.llm_config.base_url,
            bridge_token=request.llm_config.bridge_token,
        )

        is_generating = (
            content is not None and
            content.generation_state.value in ["generating", "queued_priority", "queued_background"]
        )

        return LevelContentResponse(
            content=content,
            isGenerating=is_generating,
        )
    except Exception as e:
        handle_exception(e)
        raise


@router.post("/courses/{course_id}/levels/{level_num}/validate", response_model=ValidationResult)
async def validate_circuit(
    course_id: str,
    level_num: int,
    request: ValidateRequest,
    course_service: CourseService = Depends(get_course_service),
) -> ValidationResult:
    """Validate a circuit against level requirements."""
    try:
        result = await course_service.validate_circuit(
            course_id,
            level_num,
            request.circuit_state,
        )
        return result
    except Exception as e:
        handle_exception(e)
        raise


@router.post("/courses/{course_id}/levels/{level_num}/complete", response_model=CompleteResponse)
async def complete_level(
    course_id: str,
    level_num: int,
    request: CompleteRequest,
    course_service: CourseService = Depends(get_course_service),
) -> CompleteResponse:
    """Mark a level as completed."""
    try:
        # Verify course exists
        course_plan = await course_service.get_course_plan(course_id)
        if not course_plan:
            raise NotFoundException("Course", course_id)

        success = await course_service.complete_level(
            request.enrollment_id,
            level_num,
            request.circuit_snapshot,
        )

        next_level = level_num + 1 if level_num < len(course_plan.levels) else None

        return CompleteResponse(success=success, nextLevel=next_level)
    except Exception as e:
        handle_exception(e)
        raise


@router.get("/courses/my-courses/{participant_id}")
async def get_my_courses(
    participant_id: str,
    course_service: CourseService = Depends(get_course_service),
) -> list[dict[str, Any]]:
    """Get all courses for a participant."""
    try:
        courses = await course_service.get_my_courses(participant_id)
        return courses
    except Exception as e:
        handle_exception(e)
        raise
