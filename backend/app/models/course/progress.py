"""Enrollment and per-level progress models.

Why this module exists separately
---------------------------------
These track a learner's *journey* rather than course content:

* ``CourseEnrollment`` — links a participant to a course and remembers which
  level they're currently on.
* ``LevelProgress`` — one row per (enrollment, level): status, an optional
  saved circuit snapshot, time spent, validation attempts, completion time.

They're persisted independently of the course plan, so they live in their own
module next to the content/plan models they reference by id.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from .enums import LevelStatus


class CourseEnrollment(BaseModel):
    """Student enrollment in a course."""

    id: str | None = None
    participant_id: str = Field(alias="participantId")
    course_plan_id: str = Field(alias="coursePlanId")
    current_level: int = Field(default=1, alias="currentLevel", ge=1)
    started_at: datetime = Field(default_factory=datetime.utcnow, alias="startedAt")
    last_activity_at: datetime = Field(
        default_factory=datetime.utcnow, alias="lastActivityAt"
    )

    model_config = {"populate_by_name": True}


class LevelProgress(BaseModel):
    """Student's progress on a specific level."""

    id: str | None = None
    enrollment_id: str = Field(alias="enrollmentId")
    level_number: int = Field(alias="levelNumber", ge=1)
    status: LevelStatus = LevelStatus.NOT_STARTED
    circuit_snapshot: dict[str, Any] | None = Field(
        default=None, alias="circuitSnapshot"
    )
    time_spent_seconds: int = Field(default=0, alias="timeSpentSeconds", ge=0)
    validation_attempts: int = Field(default=0, alias="validationAttempts", ge=0)
    completed_at: datetime | None = Field(default=None, alias="completedAt")

    model_config = {"populate_by_name": True}
