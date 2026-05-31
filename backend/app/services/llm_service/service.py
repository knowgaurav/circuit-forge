"""The ``LLMService`` class and the module-level ``llm_service`` singleton.

This assembles the behavior mixins and adds the small shared helpers
(``_get_provider``, ``_validate_api_key``) plus ``test_connection``.

Mixins
------
* :class:`GenerationMixin`     — ``generate_course_plan`` / ``generate_level_content``.
* :class:`ToolCallMixin`       — the tool-calling loop and fallback.
* :class:`BlueprintFixerMixin` — ``_auto_fix_blueprint`` used by the fallback.

The ``llm_service`` singleton at the bottom is what the rest of the app
imports; it's a single shared instance because the tool handler it holds is
itself a singleton and there's no per-request state on the service.
"""

from typing import Any

from app.services.llm_provider_factory import LLMProviderFactory
from app.services.llm_providers import (
    AuthenticationError,
    LLMProviderStrategy,
    LLMRequest,
    ProviderUnavailableError,
    QuotaExceededError,
    RateLimitError,
)
from app.services.llm_tools import get_tool_handler

from .blueprint_fixer import BlueprintFixerMixin
from .generation import GenerationMixin
from .tool_calls import ToolCallMixin


class LLMService(GenerationMixin, ToolCallMixin, BlueprintFixerMixin):
    """Service for LLM operations using user-provided API keys."""

    MAX_TOOL_CALLS = 10

    def __init__(self) -> None:
        self.tool_handler = get_tool_handler()

    def _get_provider(self, provider_id: str) -> LLMProviderStrategy:
        """Get provider strategy by ID."""
        return LLMProviderFactory.get_provider(provider_id)

    def _validate_api_key(self, provider_id: str, api_key: str) -> None:
        """Validate API key format for provider."""
        provider = self._get_provider(provider_id)
        is_valid, error = provider.validate_key_format(api_key)
        if not is_valid:
            raise ValueError(error)

    async def test_connection(
        self,
        provider_id: str,
        api_key: str,
        model: str,
        location: str = "global",
    ) -> dict[str, Any]:
        """Test API key validity with a minimal request.

        Args:
            provider_id: LLM provider ID
            api_key: User's API key
            model: Model to test
            location: Vertex AI location/region (Google provider)

        Returns:
            Dict with success status and any error message
        """
        # Validate API key format first
        self._validate_api_key(provider_id, api_key)

        provider = self._get_provider(provider_id)

        # OpenRouter free models have tiny per-minute/per-day quotas, so probe
        # the dedicated key endpoint instead of burning a chat completion.
        if provider_id == "openrouter":
            try:
                return await provider.verify_key(api_key)
            except AuthenticationError as e:
                return {
                    "success": False,
                    "error": "authentication",
                    "message": e.message,
                }
            except RateLimitError as e:
                return {"success": False, "error": "rate_limit", "message": e.message}
            except ProviderUnavailableError as e:
                return {"success": False, "error": "unavailable", "message": e.message}
            except Exception as e:
                return {"success": False, "error": "unknown", "message": str(e)}

        # Make a minimal request to test the connection
        request = LLMRequest(
            messages=[
                {"role": "user", "content": "Say 'OK' if you can read this."},
            ],
            tools=[],
            model=model,
            temperature=0,
            max_tokens=10,
        )

        try:
            if provider_id == "google":
                response = await provider.call(api_key, request, location=location)
            else:
                response = await provider.call(api_key, request)
            return {
                "success": True,
                "message": "Connection successful",
                "token_usage": response.token_usage,
            }
        except AuthenticationError as e:
            return {"success": False, "error": "authentication", "message": e.message}
        except RateLimitError as e:
            return {"success": False, "error": "rate_limit", "message": e.message}
        except QuotaExceededError as e:
            return {"success": False, "error": "quota", "message": e.message}
        except ProviderUnavailableError as e:
            return {"success": False, "error": "unavailable", "message": e.message}
        except Exception as e:
            return {"success": False, "error": "unknown", "message": str(e)}


# Singleton instance
llm_service = LLMService()
