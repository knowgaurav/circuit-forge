"""LLM provider strategies package.

Replaces the former single-file ``llm_providers.py``. Public surface
unchanged: callers still import everything from
``app.services.llm_providers``.

Sub-modules
-----------
* :mod:`.types`         — ``LLMRequest`` / ``LLMResponse`` (the common shape).
* :mod:`.errors`        — the ``LLMError`` hierarchy.
* :mod:`.base`          — ``LLMProviderStrategy`` abstract base.
* :mod:`.openai_compat` — ``OpenAICompatibleStrategy`` (OpenAI/OpenRouter/OhMyGPT).
* :mod:`.anthropic`     — ``AnthropicStrategy``.
* :mod:`.google`        — ``GoogleStrategy``.
* :mod:`.local`         — ``LocalLLMStrategy`` (Ollama/LM Studio/vLLM via tunnel).
"""

from .anthropic import AnthropicStrategy
from .base import LLMProviderStrategy
from .errors import (
    AuthenticationError,
    InvalidRequestError,
    LLMError,
    ModelUnavailableError,
    ProviderUnavailableError,
    QuotaExceededError,
    RateLimitError,
)
from .google import GoogleStrategy
from .local import LocalLLMStrategy
from .openai_compat import OpenAICompatibleStrategy
from .types import LLMRequest, LLMResponse

__all__ = [
    "AnthropicStrategy",
    "AuthenticationError",
    "GoogleStrategy",
    "InvalidRequestError",
    "LLMError",
    "LLMProviderStrategy",
    "LLMRequest",
    "LLMResponse",
    "LocalLLMStrategy",
    "ModelUnavailableError",
    "OpenAICompatibleStrategy",
    "ProviderUnavailableError",
    "QuotaExceededError",
    "RateLimitError",
]
