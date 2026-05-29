"""Per-level routes: generate content, validate a circuit, complete a level.

Why this module exists separately
---------------------------------
These three endpoints are the heart of working *through* a course, one level
at a time. They all hang off ``/courses/{course_id}/levels/{level_num}``.

Routes
------
* ``POST /courses/{course_id}/levels/{level_num}``          — generate (or
  return cached) theory + practical content for the level.
* ``POST /courses/{course_id}/levels/{level_num}/validate`` — check the
  learner's circuit against the level's requirements.
* ``POST /courses/{course_id}/levels/{level_num}/complete`` — mark the level
  done and report the next level number (or ``None`` if it was the last).

Content generation uses the user's API key (never stored) and reports an
``isGenerating`` flag so the UI can poll while a slow model finishes.
"""

from fastapi import APIRouter, Depends

from app.exceptions.base import NotFoundException, ValidationException
from app.models.course import ValidationResult
from app.services.course_service import CourseService

from ._shared import (
    CompleteRequest,
    CompleteResponse,
    GenerateLevelContentRequest,
    LevelContentResponse,
    ValidateRequest,
    get_course_service,
    handle_exception,
)

router = APIRouter()


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
