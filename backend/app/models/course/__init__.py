"""Course and level Pydantic models package.

Replaces the former single-file ``course.py``. Public surface unchanged:
callers still write ``from app.models.course import CoursePlan, ...``.

Sub-modules
-----------
* :mod:`.enums`    — ``Difficulty``, ``GenerationState``, ``LevelStatus``.
* :mod:`.plan`     — ``LevelOutline``, ``CoursePlan``.
* :mod:`.content`  — theory / practical / blueprint models + ``LevelContent``.
* :mod:`.progress` — ``CourseEnrollment``, ``LevelProgress``.
* :mod:`.api`      — request/response models for the course endpoints.
"""

from .api import (
    GeneratePlanRequest,
    LLMConfig,
    TestConnectionRequest,
    TestConnectionResponse,
    TopicSuggestion,
    ValidationResult,
)
from .content import (
    BlueprintComponent,
    BlueprintWire,
    BuildStep,
    CircuitBlueprint,
    ComponentSpec,
    KeyTerm,
    LevelContent,
    Position,
    PracticalSection,
    RequiredComponent,
    RequiredConnection,
    TheorySection,
    ValidationCriteria,
)
from .enums import Difficulty, GenerationState, LevelStatus
from .plan import CoursePlan, LevelOutline
from .progress import CourseEnrollment, LevelProgress

__all__ = [
    # Enums
    "Difficulty",
    "GenerationState",
    "LevelStatus",
    # Plan
    "CoursePlan",
    "LevelOutline",
    # Content
    "BlueprintComponent",
    "BlueprintWire",
    "BuildStep",
    "CircuitBlueprint",
    "ComponentSpec",
    "KeyTerm",
    "LevelContent",
    "Position",
    "PracticalSection",
    "RequiredComponent",
    "RequiredConnection",
    "TheorySection",
    "ValidationCriteria",
    # Progress
    "CourseEnrollment",
    "LevelProgress",
    # API
    "GeneratePlanRequest",
    "LLMConfig",
    "TestConnectionRequest",
    "TestConnectionResponse",
    "TopicSuggestion",
    "ValidationResult",
]
