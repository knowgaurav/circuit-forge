"""API request/response models for the course endpoints.

Why this module exists separately
---------------------------------
These are the wire shapes the HTTP layer (``app.api.courses``) speaks. They
are not persisted; they only cross the request/response boundary. Grouping
them apart from the persisted models keeps the two concerns from blurring.

* ``LLMConfig``              — per-request LLM settings (provider, key, model,
  and the local-LLM tunnel fields). Never stored server-side.
* ``GeneratePlanRequest``    — topic + ``LLMConfig`` to generate a plan.
* ``TestConnectionRequest`` / ``TestConnectionResponse`` — API-key check.
* ``TopicSuggestion``        — a starter-topic card.
* ``ValidationResult``       — the outcome of checking a learner's circuit.
"""

from pydantic import BaseModel, Field

from .enums import Difficulty


class LLMConfig(BaseModel):
    """LLM configuration for API requests."""

    provider: str = Field(description="LLM provider ID (e.g., 'openai', 'anthropic', 'local')")
    api_key: str = Field(default="", alias="apiKey", description="User's API key (not required for local)")
    model: str = Field(description="Model to use")
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=4000, alias="maxTokens", ge=100, le=32000)
    # Local LLM specific fields
    base_url: str | None = Field(default=None, alias="baseUrl", description="Tunnel URL for local LLM")
    bridge_token: str | None = Field(default=None, alias="bridgeToken", description="Bridge token for local LLM")
    # Google Vertex AI specific field (express mode)
    location: str = Field(default="global", description="Vertex AI location/region (e.g. 'us-central1', 'global')")

    model_config = {"populate_by_name": True}


class GeneratePlanRequest(BaseModel):
    """Request to generate a course plan with user API key."""

    topic: str = Field(min_length=3, max_length=200)
    participant_id: str | None = Field(default=None, alias="participantId")

    # LLM Configuration (passed per-request, never stored)
    llm_config: LLMConfig = Field(alias="llmConfig")

    model_config = {"populate_by_name": True}


class TestConnectionRequest(BaseModel):
    """Request to test API key validity."""

    provider: str = Field(description="LLM provider ID")
    api_key: str = Field(alias="apiKey", min_length=10)
    model: str = Field(description="Model to test")
    location: str = Field(default="global", description="Vertex AI location/region (Google provider)")

    model_config = {"populate_by_name": True}


class TestConnectionResponse(BaseModel):
    """Response for connection test."""

    success: bool
    message: str
    error: str | None = None
    token_usage: int | None = Field(default=None, alias="tokenUsage")

    model_config = {"populate_by_name": True}


class TopicSuggestion(BaseModel):
    """A suggested course topic."""

    topic: str
    title: str
    description: str
    difficulty: Difficulty
    estimated_levels: int = Field(alias="estimatedLevels")
    category: str

    model_config = {"populate_by_name": True}


class ValidationResult(BaseModel):
    """Result of circuit validation."""

    is_valid: bool = Field(alias="isValid")
    missing_components: list[str] = Field(alias="missingComponents", default_factory=list)
    missing_connections: list[str] = Field(
        alias="missingConnections", default_factory=list
    )
    feedback: str

    model_config = {"populate_by_name": True}
