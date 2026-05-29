"""Enumerations used across the course models.

Why this module exists separately
---------------------------------
These three small enums are referenced by many of the course models (plan,
content, progress). Keeping them in one leaf module avoids import cycles —
every other course module can import from here without pulling in heavier
model files.

* ``Difficulty``      — Beginner / Intermediate / Advanced (course level).
* ``GenerationState`` — where a level's content is in the generate pipeline
  (queued → generating → generated, or failed).
* ``LevelStatus``     — a learner's progress on one level.
"""

from enum import Enum


class Difficulty(str, Enum):
    """Course difficulty level."""

    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"


class GenerationState(str, Enum):
    """Level content generation state."""

    NOT_QUEUED = "not_queued"
    QUEUED_PRIORITY = "queued_priority"
    QUEUED_BACKGROUND = "queued_background"
    GENERATING = "generating"
    GENERATED = "generated"
    FAILED = "failed"


class LevelStatus(str, Enum):
    """Student's progress status on a level."""

    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
