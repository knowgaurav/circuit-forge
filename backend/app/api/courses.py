"""Course API endpoints for LLM Course Generator."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import db_manager
from app.exceptions.base import AppException, NotFoundException, ValidationException
from app.models.course import (
    CoursePlan,
    CourseEnrollment,
    GeneratePlanRequest,
    LevelContent,
    TopicSuggestion,
    ValidationResult,
)
from app.services.course_service import CourseService

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
    content: Optional[LevelContent]
    is_generating: bool = Field(alias="isGenerating")

    model_config = {"populate_by_name": True}


class ValidateRequest(BaseModel):
    """Request to validate a circuit."""
    circuit_state: Dict[str, Any] = Field(alias="circuitState")
    enrollment_id: Optional[str] = Field(default=None, alias="enrollmentId")

    model_config = {"populate_by_name": True}


class CompleteRequest(BaseModel):
    """Request to complete a level."""
    enrollment_id: str = Field(alias="enrollmentId")
    circuit_snapshot: Optional[Dict[str, Any]] = Field(
        default=None, alias="circuitSnapshot"
    )

    model_config = {"populate_by_name": True}


class CompleteResponse(BaseModel):
    """Response for level completion."""
    success: bool
    next_level: Optional[int] = Field(alias="nextLevel")

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
    if isinstance(e, NotFoundException):
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
        raise HTTPException(
            status_code=500,
            detail={"error": {"code": "INTERNAL_ERROR", "message": str(e)}},
        )


@router.get("/courses/suggestions", response_model=List[TopicSuggestion])
async def get_suggestions(
    course_service: CourseService = Depends(get_course_service),
) -> List[TopicSuggestion]:
    """Get topic suggestions for course creation."""
    return course_service.get_topic_suggestions()


@router.post("/courses/generate-plan", response_model=GeneratePlanResponse)
async def generate_plan(
    request: GeneratePlanRequest,
    course_service: CourseService = Depends(get_course_service),
) -> GeneratePlanResponse:
    """Generate a course plan for the given topic."""
    try:
        course_plan = await course_service.generate_course_plan(
            request.topic,
            request.participant_id,
        )
        return GeneratePlanResponse(coursePlan=course_plan)
    except Exception as e:
        handle_exception(e)
        raise  # For type checker


@router.get("/courses/{course_id}")
async def get_course(
    course_id: str,
    course_service: CourseService = Depends(get_course_service),
) -> Dict[str, Any]:
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


@router.get("/courses/{course_id}/levels/{level_num}", response_model=LevelContentResponse)
async def get_level_content(
    course_id: str,
    level_num: int,
    course_service: CourseService = Depends(get_course_service),
) -> LevelContentResponse:
    """Get content for a specific level."""
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

        content = await course_service.get_level_content(course_id, level_num)
        
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
) -> List[Dict[str, Any]]:
    """Get all courses for a participant."""
    try:
        courses = await course_service.get_my_courses(participant_id)
        return courses
    except Exception as e:
        handle_exception(e)
        raise
