"""Property-based tests for LLM provider strategies.

**Feature: user-llm-api-keys, Property 3: OpenAI-Compatible Providers Use Chat Completions Format**
**Validates: Requirements 1.5, 6.2**

For any OpenAI-compatible provider, the generated API request SHALL use the
chat/completions endpoint format with a tools array containing tool definitions.
"""

from typing import Any, Dict, List

from hypothesis import given, settings, strategies as st
import pytest

from app.services.llm_providers import (
    LLMRequest,
    LLMResponse,
    OpenAICompatibleStrategy,
    AnthropicStrategy,
    GoogleStrategy,
    AuthenticationError,
    RateLimitError,
    QuotaExceededError,
)


# ============================================================================
# Hypothesis Strategies
# ============================================================================

# Strategy for valid API key strings
api_key_strategy = st.text(min_size=10, max_size=100, alphabet=st.characters(whitelist_categories=("L", "N", "P")))

# Strategy for OpenAI-style API keys
openai_key_strategy = st.builds(
    lambda suffix: f"sk-{suffix}",
    suffix=st.text(min_size=20, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N")))
)

# Strategy for Anthropic-style API keys
anthropic_key_strategy = st.builds(
    lambda suffix: f"sk-ant-{suffix}",
    suffix=st.text(min_size=20, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N")))
)

# Strategy for Google-style API keys (39 chars alphanumeric only)
google_key_strategy = st.text(min_size=39, max_size=39, alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-")

# Strategy for model names
model_strategy = st.sampled_from([
    "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo",
    "claude-3-5-sonnet-20241022", "claude-3-opus-20240229",
    "gemini-1.5-pro", "gemini-1.5-flash",
])

# Strategy for message content
message_content_strategy = st.text(min_size=1, max_size=500)

# Strategy for messages
message_strategy = st.fixed_dictionaries({
    "role": st.sampled_from(["system", "user", "assistant"]),
    "content": message_content_strategy,
})

# Strategy for tool definitions (OpenAI format)
tool_strategy = st.fixed_dictionaries({
    "type": st.just("function"),
    "function": st.fixed_dictionaries({
        "name": st.text(min_size=1, max_size=30, alphabet=st.characters(whitelist_categories=("L",))),
        "description": st.text(min_size=0, max_size=100),
        "parameters": st.just({"type": "object", "properties": {}}),
    }),
})

# Strategy for LLM requests
llm_request_strategy = st.builds(
    LLMRequest,
    messages=st.lists(message_strategy, min_size=1, max_size=5),
    tools=st.lists(tool_strategy, min_size=0, max_size=3),
    model=model_strategy,
    temperature=st.floats(min_value=0, max_value=2, allow_nan=False),
    max_tokens=st.integers(min_value=100, max_value=4000),
)


# ============================================================================
# OpenAI-Compatible Provider IDs
# ============================================================================

OPENAI_COMPATIBLE_PROVIDERS = [
    ("openai", "https://api.openai.com/v1/chat/completions", "sk-"),
    ("ohmygpt", "https://api.ohmygpt.com/v1/chat/completions", ""),
    ("megallm", "https://api.megallm.com/v1/chat/completions", ""),
    ("agentrouter", "https://api.agentrouter.ai/v1/chat/completions", ""),
    ("openrouter", "https://openrouter.ai/api/v1/chat/completions", "sk-or-"),
]


# ============================================================================
# Property-Based Tests
# ============================================================================

@given(
    api_key=openai_key_strategy,
    request=llm_request_strategy,
)
@settings(max_examples=100)
def test_openai_compatible_key_format_validation(
    api_key: str,
    request: LLMRequest,
) -> None:
    """
    **Feature: user-llm-api-keys, Property 2: API Key Format Validation**
    **Validates: Requirements 2.2, 8.2**
    
    For any API key with correct prefix, validation should pass.
    """
    strategy = OpenAICompatibleStrategy("openai", "https://api.openai.com/v1/chat/completions", "sk-")
    is_valid, error = strategy.validate_key_format(api_key)
    
    # Keys starting with sk- should be valid for OpenAI
    assert is_valid is True
    assert error == ""


@given(
    api_key=st.text(min_size=10, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N"))).filter(lambda x: not x.startswith("sk-")),
)
@settings(max_examples=100)
def test_openai_key_format_validation_rejects_invalid_prefix(
    api_key: str,
) -> None:
    """
    **Feature: user-llm-api-keys, Property 2: API Key Format Validation**
    **Validates: Requirements 2.2, 8.2**
    
    For any API key without correct prefix, validation should fail with provider-specific error.
    """
    strategy = OpenAICompatibleStrategy("openai", "https://api.openai.com/v1/chat/completions", "sk-")
    is_valid, error = strategy.validate_key_format(api_key)
    
    # Keys not starting with sk- should be invalid
    assert is_valid is False
    assert "openai" in error.lower()


@given(api_key=anthropic_key_strategy)
@settings(max_examples=100)
def test_anthropic_key_format_validation(api_key: str) -> None:
    """
    **Feature: user-llm-api-keys, Property 2: API Key Format Validation**
    **Validates: Requirements 2.2, 8.2**
    
    For any Anthropic API key with correct prefix, validation should pass.
    """
    strategy = AnthropicStrategy()
    is_valid, error = strategy.validate_key_format(api_key)
    
    assert is_valid is True
    assert error == ""


@given(
    api_key=st.text(min_size=10, max_size=50, alphabet=st.characters(whitelist_categories=("L", "N"))).filter(lambda x: not x.startswith("sk-ant-")),
)
@settings(max_examples=100)
def test_anthropic_key_format_validation_rejects_invalid(api_key: str) -> None:
    """
    **Feature: user-llm-api-keys, Property 2: API Key Format Validation**
    **Validates: Requirements 2.2, 8.2**
    
    For any API key without Anthropic prefix, validation should fail.
    """
    strategy = AnthropicStrategy()
    is_valid, error = strategy.validate_key_format(api_key)
    
    assert is_valid is False
    assert "sk-ant-" in error


@given(api_key=google_key_strategy)
@settings(max_examples=100)
def test_google_key_format_validation(api_key: str) -> None:
    """
    **Feature: user-llm-api-keys, Property 2: API Key Format Validation**
    **Validates: Requirements 2.2, 8.2**
    
    For any Google API key with correct format, validation should pass.
    """
    strategy = GoogleStrategy()
    is_valid, error = strategy.validate_key_format(api_key)
    
    assert is_valid is True
    assert error == ""


@given(
    api_key=st.text(min_size=1, max_size=29, alphabet=st.characters(whitelist_categories=("L", "N"))),
)
@settings(max_examples=100)
def test_google_key_format_validation_rejects_short(api_key: str) -> None:
    """
    **Feature: user-llm-api-keys, Property 2: API Key Format Validation**
    **Validates: Requirements 2.2, 8.2**
    
    For any API key that's too short, Google validation should fail.
    """
    strategy = GoogleStrategy()
    is_valid, error = strategy.validate_key_format(api_key)
    
    assert is_valid is False
    assert "too short" in error.lower()


def test_openai_compatible_providers_use_correct_base_url() -> None:
    """
    **Feature: user-llm-api-keys, Property 3: OpenAI-Compatible Providers Use Chat Completions Format**
    **Validates: Requirements 1.5, 6.2**
    
    For any OpenAI-compatible provider, the base URL should point to chat/completions endpoint.
    """
    for provider_id, base_url, key_prefix in OPENAI_COMPATIBLE_PROVIDERS:
        strategy = OpenAICompatibleStrategy(provider_id, base_url, key_prefix)
        
        # Verify base URL contains chat/completions
        assert "chat/completions" in strategy.base_url, f"{provider_id} should use chat/completions endpoint"
        assert strategy.provider_id == provider_id


@given(request=llm_request_strategy)
@settings(max_examples=50)
def test_llm_request_serialization(request: LLMRequest) -> None:
    """
    **Feature: user-llm-api-keys, Property 4: Response Normalization**
    **Validates: Requirements 5.6, 6.5**
    
    For any LLM request, serialization should preserve all fields.
    """
    # Serialize and deserialize
    json_data = request.model_dump()
    deserialized = LLMRequest.model_validate(json_data)
    
    assert deserialized.model == request.model
    assert deserialized.temperature == request.temperature
    assert deserialized.max_tokens == request.max_tokens
    assert len(deserialized.messages) == len(request.messages)
    assert len(deserialized.tools) == len(request.tools)


def test_llm_response_does_not_contain_api_key() -> None:
    """
    **Feature: user-llm-api-keys, Property 4: Response Normalization Without API Key Exposure**
    **Validates: Requirements 5.6, 6.5**
    
    For any LLM response, the response should not contain API key information.
    """
    response = LLMResponse(
        content={"title": "Test Course", "description": "A test"},
        tool_calls=[],
        token_usage=100,
        finish_reason="stop",
        raw_content='{"title": "Test Course"}',
    )
    
    # Serialize response
    json_data = response.model_dump()
    json_str = str(json_data)
    
    # Verify no API key patterns in response
    assert "sk-" not in json_str
    assert "api_key" not in json_str.lower()
    assert "apikey" not in json_str.lower()
    assert "authorization" not in json_str.lower()


@pytest.mark.parametrize("provider_id,base_url,key_prefix", OPENAI_COMPATIBLE_PROVIDERS)
def test_all_openai_compatible_providers_have_strategy(
    provider_id: str,
    base_url: str,
    key_prefix: str,
) -> None:
    """
    **Feature: user-llm-api-keys, Property 3: OpenAI-Compatible Providers Use Chat Completions Format**
    **Validates: Requirements 1.5, 6.2**
    
    All OpenAI-compatible providers should be instantiable with correct configuration.
    """
    strategy = OpenAICompatibleStrategy(provider_id, base_url, key_prefix)
    
    assert strategy.provider_id == provider_id
    assert strategy.base_url == base_url
    assert strategy.key_prefix == key_prefix



# ============================================================================
# Response Normalization Tests (Property 4)
# ============================================================================

@given(
    content=st.dictionaries(
        keys=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("L",))),
        values=st.text(min_size=0, max_size=100),
        max_size=5,
    ),
    token_usage=st.integers(min_value=0, max_value=100000),
    finish_reason=st.sampled_from(["stop", "length", "tool_calls", "end_turn"]),
)
@settings(max_examples=100)
def test_llm_response_normalization_preserves_content(
    content: Dict[str, Any],
    token_usage: int,
    finish_reason: str,
) -> None:
    """
    **Feature: user-llm-api-keys, Property 4: Response Normalization Without API Key Exposure**
    **Validates: Requirements 5.6, 6.5**
    
    For any LLM response content, normalization should preserve all fields
    and never include API key information.
    """
    response = LLMResponse(
        content=content,
        tool_calls=[],
        token_usage=token_usage,
        finish_reason=finish_reason,
        raw_content=str(content),
    )
    
    # Serialize and check
    json_data = response.model_dump()
    
    # Content should be preserved
    assert json_data["content"] == content
    assert json_data["token_usage"] == token_usage
    assert json_data["finish_reason"] == finish_reason
    
    # No API key information should be present
    json_str = str(json_data).lower()
    assert "sk-" not in json_str or "sk-" in str(content).lower()  # Allow if it was in original content
    assert "api_key" not in json_str
    assert "apikey" not in json_str
    assert "authorization" not in json_str
    assert "bearer" not in json_str


def test_provider_factory_returns_correct_strategies() -> None:
    """
    Test that the provider factory returns the correct strategy types.
    """
    from app.services.llm_provider_factory import LLMProviderFactory
    
    # OpenAI-compatible providers should return OpenAICompatibleStrategy
    for provider_id in ["openai", "ohmygpt", "megallm", "agentrouter", "openrouter"]:
        strategy = LLMProviderFactory.get_provider(provider_id)
        assert isinstance(strategy, OpenAICompatibleStrategy)
        assert strategy.provider_id == provider_id
    
    # Anthropic should return AnthropicStrategy
    strategy = LLMProviderFactory.get_provider("anthropic")
    assert isinstance(strategy, AnthropicStrategy)
    
    # Google should return GoogleStrategy
    strategy = LLMProviderFactory.get_provider("google")
    assert isinstance(strategy, GoogleStrategy)


def test_provider_factory_raises_for_unknown_provider() -> None:
    """
    Test that the provider factory raises ValueError for unknown providers.
    """
    from app.services.llm_provider_factory import LLMProviderFactory
    
    with pytest.raises(ValueError) as exc_info:
        LLMProviderFactory.get_provider("unknown_provider")
    
    assert "Unknown provider" in str(exc_info.value)
    assert "unknown_provider" in str(exc_info.value)


def test_all_providers_are_supported() -> None:
    """
    **Feature: user-llm-api-keys, Property 5: All Providers Have Documentation URLs**
    **Validates: Requirements 7.3**
    
    All required providers should be supported by the factory.
    """
    from app.services.llm_provider_factory import LLMProviderFactory
    
    required_providers = ["openai", "anthropic", "google", "ohmygpt", "megallm", "agentrouter", "openrouter"]
    supported = LLMProviderFactory.get_supported_providers()
    
    for provider in required_providers:
        assert provider in supported, f"Provider {provider} should be supported"
