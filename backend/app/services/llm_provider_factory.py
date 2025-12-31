"""Factory for creating LLM provider strategy instances."""

from collections.abc import Callable

from app.services.llm_providers import (
    AnthropicStrategy,
    GoogleStrategy,
    LLMProviderStrategy,
    OpenAICompatibleStrategy,
)


class LLMProviderFactory:
    """Factory for creating provider strategy instances using dependency injection."""

    # Provider configurations: provider_id -> factory function
    PROVIDERS: dict[str, Callable[[], LLMProviderStrategy]] = {
        "openai": lambda: OpenAICompatibleStrategy(
            provider_id="openai",
            base_url="https://api.openai.com/v1/chat/completions",
            key_prefix="sk-"
        ),
        "anthropic": lambda: AnthropicStrategy(),
        "google": lambda: GoogleStrategy(),
        "ohmygpt": lambda: OpenAICompatibleStrategy(
            provider_id="ohmygpt",
            base_url="https://api.ohmygpt.com/v1/chat/completions",
            key_prefix=""
        ),


        "openrouter": lambda: OpenAICompatibleStrategy(
            provider_id="openrouter",
            base_url="https://openrouter.ai/api/v1/chat/completions",
            key_prefix="sk-or-"
        ),
    }

    @classmethod
    def get_provider(cls, provider_id: str) -> LLMProviderStrategy:
        """Get provider strategy by ID.
        
        Args:
            provider_id: The provider identifier (e.g., 'openai', 'anthropic')
            
        Returns:
            LLMProviderStrategy instance for the provider
            
        Raises:
            ValueError: If provider_id is not supported
        """
        if provider_id not in cls.PROVIDERS:
            supported = ", ".join(cls.PROVIDERS.keys())
            raise ValueError(f"Unknown provider: {provider_id}. Supported: {supported}")
        return cls.PROVIDERS[provider_id]()

    @classmethod
    def get_supported_providers(cls) -> list[str]:
        """Get list of supported provider IDs."""
        return list(cls.PROVIDERS.keys())

    @classmethod
    def is_openai_compatible(cls, provider_id: str) -> bool:
        """Check if provider uses OpenAI-compatible API format."""
        openai_compatible = {"openai", "ohmygpt", "openrouter"}
        return provider_id in openai_compatible
