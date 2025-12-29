"""Repository for course-related database operations."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.course import (
    CoursePlan,
    CourseEnrollment,
    GenerationState,
    LevelContent,
    LevelProgress,
    LevelStatus,
)
from app.repositories.base import BaseRepository


class CoursePlanRepository(BaseRepository[CoursePlan]):
    """Repository for course plans."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        super().__init__(database, "course_plans", CoursePlan)

    async def create(self, course_plan: CoursePlan) -> str:
        """Create a new course plan and return its ID."""
        plan_id = str(uuid4())
        course_plan.id = plan_id
        await self.insert_one(course_plan)
        return plan_id

    async def get_by_id(self, plan_id: str) -> Optional[CoursePlan]:
        """Get a course plan by ID."""
        return await self.find_one({"id": plan_id})

    async def get_by_topic(self, topic: str) -> Optional[CoursePlan]:
        """Get a course plan by exact topic match."""
        return await self.find_one({"topic": topic})

    async def get_featured(self, limit: int = 10) -> List[CoursePlan]:
        """Get featured course plans (those without a creator)."""
        return await self.find_many(
            {"creatorParticipantId": None},
            limit=limit,
        )


class LevelContentRepository(BaseRepository[LevelContent]):
    """Repository for level content."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        super().__init__(database, "level_contents", LevelContent)

    async def create(self, level_content: LevelContent) -> str:
        """Create a new level content record and return its ID."""
        content_id = str(uuid4())
        level_content.id = content_id
        await self.insert_one(level_content)
        return content_id

    async def get_by_course_and_level(
        self,
        course_plan_id: str,
        level_number: int,
    ) -> Optional[LevelContent]:
        """Get level content by course plan ID and level number."""
        return await self.find_one({
            "coursePlanId": course_plan_id,
            "levelNumber": level_number,
        })

    async def get_all_for_course(self, course_plan_id: str) -> List[LevelContent]:
        """Get all level contents for a course."""
        return await self.find_many(
            {"coursePlanId": course_plan_id},
            limit=50,
        )

    async def update_generation_state(
        self,
        content_id: str,
        state: GenerationState,
        celery_task_id: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> bool:
        """Update the generation state of a level."""
        update: Dict[str, Any] = {"generationState": state.value}
        if celery_task_id:
            update["celeryTaskId"] = celery_task_id
        if error_message:
            update["errorMessage"] = error_message
        return await self.update_one({"id": content_id}, update)

    async def set_content(
        self,
        content_id: str,
        theory: Dict[str, Any],
        practical: Dict[str, Any],
        token_usage: int,
    ) -> bool:
        """Set the generated content for a level."""
        return await self.update_one(
            {"id": content_id},
            {
                "theory": theory,
                "practical": practical,
                "generationState": GenerationState.GENERATED.value,
                "generatedAt": datetime.utcnow(),
                "tokenUsage": token_usage,
            },
        )


class CourseEnrollmentRepository(BaseRepository[CourseEnrollment]):
    """Repository for course enrollments."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        super().__init__(database, "course_enrollments", CourseEnrollment)

    async def create(self, enrollment: CourseEnrollment) -> str:
        """Create a new enrollment and return its ID."""
        enrollment_id = str(uuid4())
        enrollment.id = enrollment_id
        await self.insert_one(enrollment)
        return enrollment_id

    async def get_by_id(self, enrollment_id: str) -> Optional[CourseEnrollment]:
        """Get an enrollment by ID."""
        return await self.find_one({"id": enrollment_id})

    async def get_by_participant_and_course(
        self,
        participant_id: str,
        course_plan_id: str,
    ) -> Optional[CourseEnrollment]:
        """Get enrollment for a participant in a specific course."""
        return await self.find_one({
            "participantId": participant_id,
            "coursePlanId": course_plan_id,
        })

    async def get_by_participant(
        self,
        participant_id: str,
        limit: int = 50,
    ) -> List[CourseEnrollment]:
        """Get all enrollments for a participant."""
        return await self.find_many(
            {"participantId": participant_id},
            limit=limit,
        )

    async def update_current_level(
        self,
        enrollment_id: str,
        level_number: int,
    ) -> bool:
        """Update the current level for an enrollment."""
        return await self.update_one(
            {"id": enrollment_id},
            {
                "currentLevel": level_number,
                "lastActivityAt": datetime.utcnow(),
            },
        )


class LevelProgressRepository(BaseRepository[LevelProgress]):
    """Repository for level progress."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        super().__init__(database, "level_progress", LevelProgress)

    async def create(self, progress: LevelProgress) -> str:
        """Create a new progress record and return its ID."""
        progress_id = str(uuid4())
        progress.id = progress_id
        await self.insert_one(progress)
        return progress_id

    async def get_by_enrollment_and_level(
        self,
        enrollment_id: str,
        level_number: int,
    ) -> Optional[LevelProgress]:
        """Get progress for a specific level."""
        return await self.find_one({
            "enrollmentId": enrollment_id,
            "levelNumber": level_number,
        })

    async def get_all_for_enrollment(
        self,
        enrollment_id: str,
    ) -> List[LevelProgress]:
        """Get all progress records for an enrollment."""
        return await self.find_many(
            {"enrollmentId": enrollment_id},
            limit=50,
        )

    async def update_status(
        self,
        progress_id: str,
        status: LevelStatus,
        circuit_snapshot: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Update the status of a level progress."""
        update: Dict[str, Any] = {"status": status.value}
        if status == LevelStatus.COMPLETED:
            update["completedAt"] = datetime.utcnow()
        if circuit_snapshot:
            update["circuitSnapshot"] = circuit_snapshot
        return await self.update_one({"id": progress_id}, update)

    async def increment_validation_attempts(self, progress_id: str) -> bool:
        """Increment the validation attempts counter."""
        result = await self._collection.update_one(
            {"id": progress_id},
            {"$inc": {"validationAttempts": 1}},
        )
        return result.modified_count > 0
