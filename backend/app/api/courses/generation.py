"""Course-creation routes: suggestions, plan generation, key testing.

Why this module exists separately
---------------------------------
These are the endpoints a user hits *before* a course exists: browse starter
topics, generate a plan from a topic, and verify their API key works. They
all use the user's own API key (never stored server-side).

Routes
------
* ``GET  /courses/suggestions``     — the curated starter-topic list.
* ``POST /courses/generate-plan``   — generate a full course plan for a topic.
* ``POST /courses/test-connection`` — minimal request to check an API key.

These live on their own router that the package ``__init__`` mounts *before*
the dynamic ``/courses/{course_id}`` routes, so the static ``suggestions``
path is never shadowed by the id matcher.
"""

from fastapi import APIRouter, Depends

from app.models.course import (
    GeneratePlanRequest,
    TestConnectionRequest,
    TestConnectionResponse,
    TopicSuggestion,
)
from app.services.course_service import CourseService

from ._shared import GeneratePlanResponse, get_course_service, handle_exception

router = APIRouter()


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
