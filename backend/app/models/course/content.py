"""Per-level content models: theory, practical steps, and the circuit blueprint.

Why this module exists separately
---------------------------------
This is the meat of a lesson — everything shown when a learner opens a level.
It's the largest model group, so it lives in its own module. Three layers:

1. **Theory** — objectives, a concept explanation, real-world examples, key
   terms (:class:`TheorySection`).
2. **Practical** — the components needed, ordered build steps, expected
   behavior, validation criteria, and an optional ready-to-load circuit
   blueprint (:class:`PracticalSection`).
3. **LevelContent** — wraps theory + practical plus generation bookkeeping
   (state, token usage, error message).

Note: ``Position`` here is the *blueprint* position (a plain x/y on the
lesson canvas). It is intentionally separate from
``app.models.circuit.Position`` — this one carries no extra circuit semantics.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from .enums import GenerationState


class KeyTerm(BaseModel):
    """A key term with definition."""

    term: str
    definition: str


class TheorySection(BaseModel):
    """Theory section of a level."""

    objectives: list[str] = Field(min_length=2, max_length=5)
    concept_explanation: str = Field(alias="conceptExplanation", min_length=100)
    real_world_examples: list[str] = Field(
        alias="realWorldExamples", min_length=1, max_length=5
    )
    key_terms: list[KeyTerm] = Field(alias="keyTerms", default_factory=list)

    model_config = {"populate_by_name": True}


class ComponentSpec(BaseModel):
    """Component specification for practical section."""

    type: str  # Must match CircuitForge ComponentType
    count: int = Field(ge=1)
    properties: dict[str, Any] = Field(default_factory=dict)


class BuildStep(BaseModel):
    """A single build step in practical section."""

    step_number: int = Field(alias="stepNumber", ge=1)
    instruction: str = Field(min_length=10)
    hint: str | None = None

    model_config = {"populate_by_name": True}


class RequiredComponent(BaseModel):
    """Required component for validation."""

    type: str
    min_count: int = Field(alias="minCount", ge=1)

    model_config = {"populate_by_name": True}


class RequiredConnection(BaseModel):
    """Required connection for validation."""

    from_spec: str = Field(alias="from")  # e.g., "SWITCH_TOGGLE:0:output"
    to_spec: str = Field(alias="to")  # e.g., "LED_RED:0:input"

    model_config = {"populate_by_name": True}


class ValidationCriteria(BaseModel):
    """Criteria for validating student's circuit."""

    required_components: list[RequiredComponent] = Field(
        alias="requiredComponents", default_factory=list
    )
    required_connections: list[RequiredConnection] = Field(
        alias="requiredConnections", default_factory=list
    )

    model_config = {"populate_by_name": True}


# --- Circuit Blueprint Models ---


class Position(BaseModel):
    """Position on the canvas."""

    x: float
    y: float


class BlueprintComponent(BaseModel):
    """A component in the circuit blueprint."""

    type: str  # Must match CircuitForge ComponentType
    label: str  # e.g., "AND1", "LED1"
    position: Position
    properties: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class BlueprintWire(BaseModel):
    """A wire connection in the circuit blueprint."""

    from_spec: str = Field(alias="from")  # e.g., "AND1:Y" (label:pinName)
    to_spec: str = Field(alias="to")  # e.g., "LED1:A"

    model_config = {"populate_by_name": True}


class CircuitBlueprint(BaseModel):
    """Complete circuit blueprint that can be loaded onto the canvas."""

    components: list[BlueprintComponent] = Field(default_factory=list)
    wires: list[BlueprintWire] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class PracticalSection(BaseModel):
    """Practical section of a level."""

    components_needed: list[ComponentSpec] = Field(alias="componentsNeeded")
    steps: list[BuildStep] = Field(min_length=1)
    expected_behavior: str = Field(alias="expectedBehavior", min_length=20)
    validation_criteria: ValidationCriteria = Field(alias="validationCriteria")
    common_mistakes: list[str] = Field(alias="commonMistakes", default_factory=list)
    circuit_blueprint: CircuitBlueprint | None = Field(
        default=None, alias="circuitBlueprint"
    )

    model_config = {"populate_by_name": True}


class LevelContent(BaseModel):
    """Complete content for a single level."""

    id: str | None = None
    course_plan_id: str = Field(alias="coursePlanId")
    level_number: int = Field(alias="levelNumber", ge=1)
    generation_state: GenerationState = Field(
        default=GenerationState.NOT_QUEUED, alias="generationState"
    )
    celery_task_id: str | None = Field(default=None, alias="celeryTaskId")

    # Content (populated when generated)
    theory: TheorySection | None = None
    practical: PracticalSection | None = None

    generated_at: datetime | None = Field(default=None, alias="generatedAt")
    token_usage: int | None = Field(default=None, alias="tokenUsage")
    error_message: str | None = Field(default=None, alias="errorMessage")

    model_config = {"populate_by_name": True}
