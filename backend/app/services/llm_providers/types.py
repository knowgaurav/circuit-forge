"""Normalized request/response models shared by every provider.

Why this module exists separately
---------------------------------
Each provider (OpenAI, Anthropic, Google, local) speaks a different wire
format, but the rest of the app should not care. ``LLMRequest`` and
``LLMResponse`` are the common shape every provider translates *to* and
*from*, so callers build one ``LLMRequest`` and always get one
``LLMResponse`` back regardless of which provider ran.

* ``LLMRequest``  — what we want the model to do: messages, optional tools,
  model name, temperature, token cap.
* ``LLMResponse`` — the normalized reply: parsed ``content`` (JSON if the
  model returned JSON), any ``tool_calls`` (always in OpenAI shape, even when
  the provider used a different format), token usage, finish reason, and the
  unparsed ``raw_content``.
"""

from typing import Any

from pydantic import BaseModel, Field


class LLMRequest(BaseModel):
    """Common request format for all providers."""
    messages: list[dict[str, Any]]
    tools: list[dict[str, Any]] = Field(default_factory=list)
    model: str
    temperature: float = 0.7
    max_tokens: int = 4000


class LLMResponse(BaseModel):
    """Normalized response from any provider."""
    content: dict[str, Any] | None = None
    tool_calls: list[dict[str, Any]] = Field(default_factory=list)
    token_usage: int = 0
    finish_reason: str = "stop"
    raw_content: str | None = None
