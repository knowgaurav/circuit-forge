"""Provider error hierarchy.

Why this module exists separately
---------------------------------
Every provider maps the raw HTTP status it gets back into one of these typed
errors, so the API layer can handle "bad key" vs "rate limited" vs "provider
down" uniformly without parsing status codes itself.

* ``LLMError``                — base; carries ``code``, ``message``, ``provider``.
* ``AuthenticationError``     — 401/403: bad or forbidden key.
* ``RateLimitError``          — 429: too many requests (optional ``retry_after``).
* ``QuotaExceededError``      — 402: billing/quota problem.
* ``ModelUnavailableError``   — requested model isn't available (suggests
  ``alternatives``).
* ``ProviderUnavailableError``— 5xx or network failure: the provider is down.
"""


class LLMError(Exception):
    """Base exception for LLM-related errors."""
    def __init__(self, code: str, message: str, provider: str):
        self.code = code
        self.message = message
        self.provider = provider
        super().__init__(message)


class AuthenticationError(LLMError):
    """Invalid or expired API key."""
    def __init__(self, provider: str, message: str = "Invalid or expired API key"):
        super().__init__("AUTHENTICATION_ERROR", message, provider)


class RateLimitError(LLMError):
    """Rate limit exceeded."""
    def __init__(self, provider: str, retry_after: int | None = None):
        super().__init__("RATE_LIMITED", "Rate limit exceeded. Please wait and try again.", provider)
        self.retry_after = retry_after


class QuotaExceededError(LLMError):
    """API quota/billing issue."""
    def __init__(self, provider: str):
        super().__init__("QUOTA_EXCEEDED", "API quota exceeded. Check your billing.", provider)


class ModelUnavailableError(LLMError):
    """Model not available for this API key."""
    def __init__(self, provider: str, model: str, alternatives: list[str]):
        self.alternatives = alternatives
        super().__init__(
            "MODEL_UNAVAILABLE",
            f"Model {model} is not available. Try: {', '.join(alternatives)}",
            provider
        )


class ProviderUnavailableError(LLMError):
    """Provider API is unavailable."""
    def __init__(self, provider: str, message: str | None = None):
        super().__init__(
            "PROVIDER_UNAVAILABLE",
            message or f"{provider} API is currently unavailable",
            provider,
        )
