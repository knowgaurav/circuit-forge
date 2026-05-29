"""The ``CourseService`` class — wires repositories to the feature mixins.

This is the assembly point. The behavior lives in the mixins:

* :class:`GenerationMixin`  — LLM-backed course-plan and level-content generation.
* :class:`EnrollmentMixin`  — enroll, list my courses, complete a level.
* :class:`ValidationMixin`  — check a circuit against level requirements.

The class also keeps a few thin methods that don't warrant their own module:
``get_topic_suggestions`` (returns the static list), ``get_course_plan``
(a plain repository read), and ``test_connection`` (delegates to the LLM
service so the UI can verify an API key before generating anything).
"""

from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.course import CoursePlan, TopicSuggestion
from app.repositories.course_repository import (
    CourseEnrollmentRepository,
    CoursePlanRepository,
    LevelContentRepository,
    LevelProgressRepository,
)
from app.services.llm_service import llm_service

from .enrollment import EnrollmentMixin
from .generation import GenerationMixin
from .suggestions import TOPIC_SUGGESTIONS
from .validation import ValidationMixin


class CourseService(GenerationMixin, EnrollmentMixin, ValidationMixin):
    """Service for course management."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.course_plan_repo = CoursePlanRepository(database)
        self.level_content_repo = LevelContentRepository(database)
        self.enrollment_repo = CourseEnrollmentRepository(database)
        self.progress_repo = LevelProgressRepository(database)

    def get_topic_suggestions(self) -> list[TopicSuggestion]:
        """Get predefined topic suggestions."""
        return TOPIC_SUGGESTIONS

    async def test_connection(
        self,
        provider_id: str,
        api_key: str,
        model: str,
        location: str = "global",
    ) -> dict[str, Any]:
        """Test API key validity with a minimal request."""
        return await llm_service.test_connection(
            provider_id=provider_id,
            api_key=api_key,
            model=model,
            location=location,
        )

    async def get_course_plan(self, plan_id: str) -> CoursePlan | None:
        """Get a course plan by ID."""
        return await self.course_plan_repo.get_by_id(plan_id)
