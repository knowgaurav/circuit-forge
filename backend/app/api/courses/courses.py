"""Course-instance routes: fetch a course, enroll, list a user's courses.

Why this module exists separately
---------------------------------
These endpoints operate on a course that already exists (by id) plus a
participant's relationship to it. The per-level work (generate/validate/
complete) lives in :mod:`.levels`.

Routes
------
* ``GET  /courses/{course_id}``                 — fetch a plan by id.
* ``POST /courses/{course_id}/enroll``          — enroll a participant.
* ``GET  /courses/my-courses/{participant_id}`` — list a user's courses + progress.

Route-ordering note: ``/courses/{course_id}`` is a catch-all on the first
path segment. The package ``__init__`` mounts the static-path routers
(suggestions, generate-plan, local-*) *before* this one so those exact paths
win the match. ``/courses/my-courses/{participant_id}`` has two segments, so
it never collides with the single-segment id route.
"""

from typing import Any

from fastapi import APIRouter, Depends

from app.exceptions.base import NotFoundException
from app.services.course_service import CourseService

from ._shared import (
    EnrollRequest,
    EnrollResponse,
    get_course_service,
    handle_exception,
)

router = APIRouter()


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
