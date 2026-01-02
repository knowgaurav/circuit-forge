"""Course Service for managing course generation and progress."""

import logging
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.course import (
    CourseEnrollment,
    CoursePlan,
    Difficulty,
    GenerationState,
    LevelContent,
    LevelProgress,
    LevelStatus,
    TopicSuggestion,
    ValidationResult,
)
from app.repositories.course_repository import (
    CourseEnrollmentRepository,
    CoursePlanRepository,
    LevelContentRepository,
    LevelProgressRepository,
)
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


# Predefined topic suggestions
TOPIC_SUGGESTIONS: list[TopicSuggestion] = [
    # Digital Logic Fundamentals
    TopicSuggestion(
        topic="4-bit Calculator",
        title="Build a 4-bit Calculator",
        description="Learn binary arithmetic by building a calculator that can add and subtract 4-bit numbers",
        difficulty=Difficulty.INTERMEDIATE,
        estimatedLevels=12,
        category="Digital Logic",
    ),
    TopicSuggestion(
        topic="Binary Counter",
        title="Build a Binary Counter",
        description="Create a counter that counts from 0 to 15 in binary using flip-flops",
        difficulty=Difficulty.BEGINNER,
        estimatedLevels=8,
        category="Digital Logic",
    ),
    TopicSuggestion(
        topic="Digital Clock",
        title="Build a Digital Clock",
        description="Design a clock display using counters and 7-segment displays",
        difficulty=Difficulty.INTERMEDIATE,
        estimatedLevels=15,
        category="Digital Logic",
    ),
    # Computing
    TopicSuggestion(
        topic="Simple ALU",
        title="Build a Simple ALU",
        description="Create an Arithmetic Logic Unit that performs basic operations",
        difficulty=Difficulty.ADVANCED,
        estimatedLevels=14,
        category="Computing",
    ),
    # Robotics
    TopicSuggestion(
        topic="Line Following Robot",
        title="Build Line Following Robot Logic",
        description="Design the control logic for a robot that follows a line",
        difficulty=Difficulty.INTERMEDIATE,
        estimatedLevels=10,
        category="Robotics",
    ),
    TopicSuggestion(
        topic="Motor Speed Controller",
        title="Build a Motor Speed Controller",
        description="Create a PWM-based motor speed controller",
        difficulty=Difficulty.BEGINNER,
        estimatedLevels=8,
        category="Robotics",
    ),
    # Automation
    TopicSuggestion(
        topic="Traffic Light Controller",
        title="Build a Traffic Light Controller",
        description="Design a state machine that controls traffic lights at an intersection",
        difficulty=Difficulty.BEGINNER,
        estimatedLevels=10,
        category="Automation",
    ),
    TopicSuggestion(
        topic="Elevator Controller",
        title="Build an Elevator Controller",
        description="Create the logic for a 3-floor elevator system",
        difficulty=Difficulty.INTERMEDIATE,
        estimatedLevels=12,
        category="Automation",
    ),
]


class CourseService:
    """Service for course management."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self.course_plan_repo = CoursePlanRepository(database)
        self.level_content_repo = LevelContentRepository(database)
        self.enrollment_repo = CourseEnrollmentRepository(database)
        self.progress_repo = LevelProgressRepository(database)

    def get_topic_suggestions(self) -> list[TopicSuggestion]:
        """Get predefined topic suggestions."""
        return TOPIC_SUGGESTIONS

    async def generate_course_plan(
        self,
        topic: str,
        participant_id: str | None = None,
        provider_id: str = "openai",
        api_key: str = "",
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4000,
        base_url: str | None = None,
        bridge_token: str | None = None,
    ) -> CoursePlan:
        """Generate a new course plan for the given topic using user's API key.
        
        Args:
            topic: The course topic
            participant_id: Optional participant ID
            provider_id: LLM provider ID
            api_key: User's API key (used only for this request)
            model: Model to use
            temperature: Temperature setting
            max_tokens: Max tokens for response
            base_url: Tunnel URL for local LLM
            bridge_token: Bridge token for local LLM
        """
        logger.info(f"Generating course plan for topic: {topic} using {provider_id}/{model}")

        # Generate plan using user's API key
        course_plan, token_usage = await llm_service.generate_course_plan(
            topic=topic,
            provider_id=provider_id,
            api_key=api_key,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            base_url=base_url,
            bridge_token=bridge_token,
        )
        course_plan.creator_participant_id = participant_id

        # Save to database
        plan_id = await self.course_plan_repo.create(course_plan)
        course_plan.id = plan_id

        logger.info(
            f"Created course plan {plan_id} with {len(course_plan.levels)} levels, "
            f"used {token_usage} tokens"
        )

        return course_plan

    async def test_connection(
        self,
        provider_id: str,
        api_key: str,
        model: str,
    ) -> dict[str, Any]:
        """Test API key validity with a minimal request."""
        return await llm_service.test_connection(
            provider_id=provider_id,
            api_key=api_key,
            model=model,
        )

    async def get_course_plan(self, plan_id: str) -> CoursePlan | None:
        """Get a course plan by ID."""
        return await self.course_plan_repo.get_by_id(plan_id)

    async def get_level_content(
        self,
        course_plan_id: str,
        level_number: int,
        provider_id: str = "openai",
        api_key: str = "",
        model: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 4000,
        base_url: str | None = None,
        bridge_token: str | None = None,
    ) -> LevelContent | None:
        """Get level content, generating if needed using user's API key."""
        course_plan = await self.course_plan_repo.get_by_id(course_plan_id)
        if not course_plan:
            return None

        # Check if content record exists
        content = await self.level_content_repo.get_by_course_and_level(
            course_plan_id, level_number
        )

        # Return cached content if it's already generated successfully
        if content and content.generation_state == GenerationState.GENERATED:
            logger.info(f"Returning cached level {level_number} content for course {course_plan_id}")
            return content

        # Create or update level content record
        if not content:
            content = LevelContent(
                coursePlanId=course_plan_id,
                levelNumber=level_number,
                generationState=GenerationState.GENERATING,
            )
            content_id = await self.level_content_repo.create(content)
            content.id = content_id
        else:
            # Only regenerate if failed or not completed
            await self.level_content_repo.update_generation_state(
                content.id,  # type: ignore
                GenerationState.GENERATING,
            )

        # Generate content using LLM with user's API key
        try:
            theory, practical, token_usage = await llm_service.generate_level_content(
                course_plan=course_plan,
                level_number=level_number,
                provider_id=provider_id,
                api_key=api_key,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                base_url=base_url,
                bridge_token=bridge_token,
            )

            # Save content
            await self.level_content_repo.set_content(
                content.id,  # type: ignore
                theory.model_dump(by_alias=True),
                practical.model_dump(by_alias=True),
                token_usage,
            )

            # Refresh and return
            return await self.level_content_repo.get_by_course_and_level(
                course_plan_id, level_number
            )

        except Exception as e:
            logger.error(f"Failed to generate level content: {e}")
            await self.level_content_repo.update_generation_state(
                content.id,  # type: ignore
                GenerationState.FAILED,
                error_message=str(e),
            )
            raise

    async def enroll_in_course(
        self,
        participant_id: str,
        course_plan_id: str,
    ) -> CourseEnrollment:
        """Enroll a participant in a course."""
        # Check for existing enrollment
        existing = await self.enrollment_repo.get_by_participant_and_course(
            participant_id, course_plan_id
        )
        if existing:
            return existing

        # Create new enrollment
        enrollment = CourseEnrollment(
            participantId=participant_id,
            coursePlanId=course_plan_id,
            currentLevel=1,
        )
        enrollment_id = await self.enrollment_repo.create(enrollment)
        enrollment.id = enrollment_id

        # Create progress records for all levels
        course_plan = await self.course_plan_repo.get_by_id(course_plan_id)
        if course_plan:
            for level in course_plan.levels:
                progress = LevelProgress(
                    enrollmentId=enrollment_id,
                    levelNumber=level.level_number,
                    status=LevelStatus.NOT_STARTED,
                )
                await self.progress_repo.create(progress)

        logger.info(
            f"Enrolled participant {participant_id} in course {course_plan_id}"
        )

        return enrollment

    async def get_enrollment(
        self,
        participant_id: str,
        course_plan_id: str,
    ) -> CourseEnrollment | None:
        """Get enrollment for a participant in a course."""
        return await self.enrollment_repo.get_by_participant_and_course(
            participant_id, course_plan_id
        )

    async def get_my_courses(
        self,
        participant_id: str,
    ) -> list[dict[str, Any]]:
        """Get all courses for a participant with progress info."""
        enrollments = await self.enrollment_repo.get_by_participant(participant_id)

        result = []
        for enrollment in enrollments:
            course_plan = await self.course_plan_repo.get_by_id(
                enrollment.course_plan_id
            )
            if course_plan:
                progress_list = await self.progress_repo.get_all_for_enrollment(
                    enrollment.id  # type: ignore
                )
                completed_count = sum(
                    1 for p in progress_list if p.status == LevelStatus.COMPLETED
                )

                result.append({
                    "enrollment": enrollment.model_dump(by_alias=True),
                    "coursePlan": course_plan.model_dump(by_alias=True),
                    "completedLevels": completed_count,
                    "totalLevels": len(course_plan.levels),
                })

        return result

    async def complete_level(
        self,
        enrollment_id: str,
        level_number: int,
        circuit_snapshot: dict[str, Any] | None = None,
    ) -> bool:
        """Mark a level as completed and unlock the next level."""
        # Get progress record
        progress = await self.progress_repo.get_by_enrollment_and_level(
            enrollment_id, level_number
        )
        if not progress:
            return False

        # Update progress
        await self.progress_repo.update_status(
            progress.id,  # type: ignore
            LevelStatus.COMPLETED,
            circuit_snapshot,
        )

        # Update enrollment to next level
        enrollment = await self.enrollment_repo.get_by_id(enrollment_id)
        if enrollment:
            course_plan = await self.course_plan_repo.get_by_id(
                enrollment.course_plan_id
            )
            if course_plan and level_number < len(course_plan.levels):
                await self.enrollment_repo.update_current_level(
                    enrollment_id, level_number + 1
                )

        logger.info(f"Completed level {level_number} for enrollment {enrollment_id}")
        return True

    async def validate_circuit(
        self,
        course_plan_id: str,
        level_number: int,
        circuit_state: dict[str, Any],
    ) -> ValidationResult:
        """Validate a circuit against level requirements."""
        # Get level content with validation criteria
        content = await self.level_content_repo.get_by_course_and_level(
            course_plan_id, level_number
        )

        if not content or not content.practical:
            return ValidationResult(
                isValid=False,
                missingComponents=[],
                missingConnections=[],
                feedback="Level content not available",
            )

        criteria = content.practical.validation_criteria
        components = circuit_state.get("components", [])
        wires = circuit_state.get("wires", [])

        missing_components: list[str] = []
        missing_connections: list[str] = []

        # Check required components
        for req in criteria.required_components:
            count = sum(1 for c in components if c.get("type") == req.type)
            if count < req.min_count:
                missing_components.append(
                    f"{req.type} (need {req.min_count}, have {count})"
                )

        # Check required connections (simplified check)
        for req in criteria.required_connections:
            # This is a simplified check - in production you'd want more sophisticated matching
            found = False
            for wire in wires:
                # Check if wire connects the required component types
                from_type = req.from_spec.split(":")[0]
                to_type = req.to_spec.split(":")[0]

                from_component = next(
                    (c for c in components if c.get("id") == wire.get("fromComponentId")),
                    None,
                )
                to_component = next(
                    (c for c in components if c.get("id") == wire.get("toComponentId")),
                    None,
                )

                if (from_component and to_component and
                    from_component.get("type") == from_type and
                    to_component.get("type") == to_type):
                    found = True
                    break

            if not found:
                missing_connections.append(f"{req.from_spec} -> {req.to_spec}")

        is_valid = len(missing_components) == 0 and len(missing_connections) == 0

        if is_valid:
            feedback = "Great job! Your circuit meets all requirements."
        else:
            feedback_parts = []
            if missing_components:
                feedback_parts.append(f"Missing components: {', '.join(missing_components)}")
            if missing_connections:
                feedback_parts.append(f"Missing connections: {', '.join(missing_connections)}")
            feedback = " ".join(feedback_parts)

        return ValidationResult(
            isValid=is_valid,
            missingComponents=missing_components,
            missingConnections=missing_connections,
            feedback=feedback,
        )
