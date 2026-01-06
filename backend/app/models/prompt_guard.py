"""Pydantic models for prompt injection protection."""

from enum import Enum

from pydantic import BaseModel, Field


class ThreatLevel(str, Enum):
    """Threat level classification for input analysis."""
    SAFE = "safe"
    SUSPICIOUS = "suspicious"
    BLOCKED = "blocked"


class ValidationResult(BaseModel):
    """Result of input validation."""
    is_valid: bool = Field(alias="isValid")
    threat_level: ThreatLevel = Field(alias="threatLevel")
    blocked_patterns: list[str] = Field(default_factory=list, alias="blockedPatterns")
    warnings: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class SanitizationResult(BaseModel):
    """Result of input sanitization."""
    original: str
    sanitized: str
    modifications: list[str] = Field(default_factory=list)


class GuardResult(BaseModel):
    """Combined result from PromptGuard processing."""
    is_allowed: bool = Field(alias="isAllowed")
    sanitized_input: str | None = Field(default=None, alias="sanitizedInput")
    threat_level: ThreatLevel = Field(alias="threatLevel")
    blocked_reason: str | None = Field(default=None, alias="blockedReason")
    warnings: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class OutputValidationResult(BaseModel):
    """Result of output validation."""
    is_valid: bool = Field(alias="isValid")
    leaked_content: list[str] = Field(default_factory=list, alias="leakedContent")
    anomalies: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}
