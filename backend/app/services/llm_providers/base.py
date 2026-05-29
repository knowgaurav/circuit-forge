"""The provider strategy interface every concrete provider implements.

Why this module exists separately
---------------------------------
This is the contract. A concrete strategy (OpenAI, Anthropic, …) subclasses
``LLMProviderStrategy`` and implements two methods:

* ``call(api_key, request)`` — do the HTTP round-trip, return an
  :class:`LLMResponse`.
* ``validate_key_format(api_key)`` — a cheap, offline format check so we can
  reject obviously-wrong keys before spending a network call.

``_mask_key`` is shared by all subclasses for safe logging (it never prints
the full secret — only the first and last four characters).
"""

from abc import ABC, abstractmethod

from .types import LLMRequest, LLMResponse


class LLMProviderStrategy(ABC):
    """Abstract base for LLM provider implementations."""

    provider_id: str = "base"

    @abstractmethod
    async def call(
        self,
        api_key: str,
        request: LLMRequest,
    ) -> LLMResponse:
        """Make API call to the provider."""
        pass

    @abstractmethod
    def validate_key_format(self, api_key: str) -> tuple[bool, str]:
        """Validate API key format. Returns (is_valid, error_message)."""
        pass

    def _mask_key(self, api_key: str) -> str:
        """Mask API key for logging.

        Returns ``***`` for very short keys and ``abcd...wxyz`` otherwise, so
        logs never leak a usable secret.
        """
        if len(api_key) <= 8:
            return "***"
        return f"{api_key[:4]}...{api_key[-4:]}"
