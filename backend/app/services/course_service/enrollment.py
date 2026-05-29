"""Enrollment and progress tracking.

Why this module exists separately
---------------------------------
These methods manage a learner's *journey* through a course: enrolling,
listing their courses with progress, and completing a level (which unlocks
the next one). No LLM calls here — just the repositories.

Enroll example
--------------
1. ``enroll_in_course`` checks for an existing enrollment and returns it if
   found (enrolling twice is a no-op).
2. Otherwise it creates an enrollment at level 1, then seeds a
   ``LevelProgress`` row (status NOT_STARTED) for every level in the plan so
   progress can be tracked from the start.

Complete-level example
----------------------
1. ``complete_level`` marks the level's progress row COMPLETED (optionally
   stashing a snapshot of the learner's circuit).
2. If there is a next level, it bumps the enrollment's ``current_level`` so
   the next one unlocks.
"""

from typing import Any

from app.core.logger import get_logger
from app.models.course import CourseEnrollment, LevelProgress, LevelStatus

logger = get_logger()


class EnrollmentMixin:
    """Enrollment + progress operations.

    Relies on the host class providing ``self.enrollment_repo``,
    ``self.progress_repo``, and ``self.course_plan_repo``.
    """

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
