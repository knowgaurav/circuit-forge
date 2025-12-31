"""LLM Provider strategies for multi-provider support."""

import json
import logging
import re
from abc import ABC, abstractmethod
from typing import Any

import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# --- Error Classes ---

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
    def __init__(self, provider: str):
        super().__init__("PROVIDER_UNAVAILABLE", f"{provider} API is currently unavailable", provider)


# --- Request/Response Models ---

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


# --- Provider Strategy Interface ---

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
        """Mask API key for logging."""
        if len(api_key) <= 8:
            return "***"
        return f"{api_key[:4]}...{api_key[-4:]}"


# --- OpenAI-Compatible Strategy ---

class OpenAICompatibleStrategy(LLMProviderStrategy):
    """Strategy for OpenAI and OpenAI-compatible APIs (OHMYGPT, MEGALLM, AGENTROUTER, OPENROUTER)."""

    def __init__(self, provider_id: str, base_url: str, key_prefix: str = ""):
        self.provider_id = provider_id
        self.base_url = base_url
        self.key_prefix = key_prefix

    def validate_key_format(self, api_key: str) -> tuple[bool, str]:
        """Validate OpenAI-style API key format."""
        if not api_key or len(api_key) < 10:
            return False, f"API key is too short for {self.provider_id}"
        if self.key_prefix and not api_key.startswith(self.key_prefix):
            return False, f"API key for {self.provider_id} should start with '{self.key_prefix}'"
        return True, ""

    async def call(self, api_key: str, request: LLMRequest) -> LLMResponse:
        """Make API call using OpenAI chat completions format."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        # Add OpenRouter-specific headers if needed
        if self.provider_id == "openrouter":
            headers["HTTP-Referer"] = "https://circuitforge.app"
            headers["X-Title"] = "CircuitForge"

        payload: dict[str, Any] = {
            "model": request.model,
            "messages": request.messages,
            "temperature": request.temperature,
        }
        
        # Use max_completion_tokens for newer OpenAI models, max_tokens for others
        if self.provider_id == "openai":
            payload["max_completion_tokens"] = request.max_tokens
        else:
            payload["max_tokens"] = request.max_tokens

        if request.tools:
            payload["tools"] = request.tools
            payload["tool_choice"] = "auto"

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                has_tools = bool(request.tools)
                masked_key = self._mask_key(api_key)
                logger.info(f"Making request to {self.provider_id}: {self.base_url}")
                logger.info(f"  Model: {request.model}, Tools: {has_tools}, API Key: {masked_key}")
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json=payload,
                )
                logger.info(f"Response status: {response.status_code}")

                if response.status_code == 401:
                    logger.error(f"Authentication failed for {self.provider_id}: {response.text}")
                    raise AuthenticationError(self.provider_id)
                elif response.status_code == 429:
                    retry_after = response.headers.get("retry-after")
                    error_body = response.text
                    logger.warning(f"Rate limit hit for {self.provider_id}: {error_body}")
                    raise RateLimitError(self.provider_id, int(retry_after) if retry_after else None)
                elif response.status_code == 402:
                    raise QuotaExceededError(self.provider_id)
                elif response.status_code == 403:
                    logger.error(f"Forbidden for {self.provider_id}: {response.text}")
                    raise AuthenticationError(self.provider_id, "Access forbidden - check your API key permissions")
                elif response.status_code >= 500:
                    raise ProviderUnavailableError(self.provider_id)
                elif response.status_code >= 400:
                    logger.error(f"Error {response.status_code} from {self.provider_id}: {response.text}")

                response.raise_for_status()
                result = response.json()

                message = result["choices"][0]["message"]
                usage = result.get("usage", {})

                # Extract tool calls if present
                tool_calls = []
                if "tool_calls" in message and message["tool_calls"]:
                    tool_calls = message["tool_calls"]

                # Parse content as JSON if possible
                content = None
                raw_content = message.get("content", "")
                logger.info(f"Raw response from {self.provider_id} (first 500 chars): {raw_content[:500] if raw_content else 'EMPTY'}")
                if raw_content:
                    try:
                        content = json.loads(raw_content)
                    except json.JSONDecodeError:
                        # Try to extract JSON from response
                        json_match = re.search(r'\{[\s\S]*\}', raw_content)
                        if json_match:
                            try:
                                content = json.loads(json_match.group())
                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse JSON from response: {json_match.group()[:200]}")
                        else:
                            logger.warning(f"No JSON found in response")

                return LLMResponse(
                    content=content,
                    tool_calls=tool_calls,
                    token_usage=usage.get("total_tokens", 0),
                    finish_reason=result["choices"][0].get("finish_reason", "stop"),
                    raw_content=raw_content,
                )

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from {self.provider_id}: {e}")
            if e.response.status_code == 401:
                raise AuthenticationError(self.provider_id)
            elif e.response.status_code == 429:
                raise RateLimitError(self.provider_id)
            raise ProviderUnavailableError(self.provider_id)
        except httpx.RequestError as e:
            logger.error(f"Request error to {self.provider_id}: {e}")
            raise ProviderUnavailableError(self.provider_id)


# --- Anthropic Strategy ---

class AnthropicStrategy(LLMProviderStrategy):
    """Strategy for Anthropic Claude API."""

    provider_id = "anthropic"
    BASE_URL = "https://api.anthropic.com/v1/messages"

    def validate_key_format(self, api_key: str) -> tuple[bool, str]:
        """Validate Anthropic API key format."""
        if not api_key or len(api_key) < 10:
            return False, "API key is too short for Anthropic"
        if not api_key.startswith("sk-ant-"):
            return False, "Anthropic API key should start with 'sk-ant-'"
        return True, ""

    def _convert_tools_to_anthropic(self, tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Convert OpenAI tool format to Anthropic tool_use format."""
        anthropic_tools = []
        for tool in tools:
            if tool.get("type") == "function":
                func = tool["function"]
                anthropic_tools.append({
                    "name": func["name"],
                    "description": func.get("description", ""),
                    "input_schema": func.get("parameters", {"type": "object", "properties": {}}),
                })
        return anthropic_tools

    def _convert_messages_to_anthropic(self, messages: list[dict[str, Any]]) -> tuple[str, list[dict[str, Any]]]:
        """Convert OpenAI messages to Anthropic format. Returns (system_prompt, messages)."""
        system_prompt = ""
        anthropic_messages = []

        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")

            if role == "system":
                system_prompt = content
            elif role == "user":
                anthropic_messages.append({"role": "user", "content": content})
            elif role == "assistant":
                if msg.get("tool_calls"):
                    # Convert tool calls to Anthropic format
                    tool_use_blocks = []
                    for tc in msg["tool_calls"]:
                        tool_use_blocks.append({
                            "type": "tool_use",
                            "id": tc["id"],
                            "name": tc["function"]["name"],
                            "input": json.loads(tc["function"]["arguments"]) if isinstance(tc["function"]["arguments"], str) else tc["function"]["arguments"],
                        })
                    anthropic_messages.append({"role": "assistant", "content": tool_use_blocks})
                else:
                    anthropic_messages.append({"role": "assistant", "content": content})
            elif role == "tool":
                # Tool results in Anthropic format
                anthropic_messages.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": msg.get("tool_call_id"),
                        "content": msg.get("content", ""),
                    }]
                })

        return system_prompt, anthropic_messages

    async def call(self, api_key: str, request: LLMRequest) -> LLMResponse:
        """Make API call using Anthropic messages format."""
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
        }

        system_prompt, messages = self._convert_messages_to_anthropic(request.messages)

        payload: dict[str, Any] = {
            "model": request.model,
            "messages": messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        }

        if system_prompt:
            payload["system"] = system_prompt

        if request.tools:
            payload["tools"] = self._convert_tools_to_anthropic(request.tools)

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    self.BASE_URL,
                    headers=headers,
                    json=payload,
                )

                if response.status_code == 401:
                    raise AuthenticationError(self.provider_id)
                elif response.status_code == 429:
                    raise RateLimitError(self.provider_id)
                elif response.status_code == 402:
                    raise QuotaExceededError(self.provider_id)
                elif response.status_code >= 500:
                    raise ProviderUnavailableError(self.provider_id)

                response.raise_for_status()
                result = response.json()

                # Parse Anthropic response
                content = None
                raw_content = ""
                tool_calls = []

                for block in result.get("content", []):
                    if block.get("type") == "text":
                        raw_content = block.get("text", "")
                        try:
                            content = json.loads(raw_content)
                        except json.JSONDecodeError:
                            json_match = re.search(r'\{[\s\S]*\}', raw_content)
                            if json_match:
                                try:
                                    content = json.loads(json_match.group())
                                except json.JSONDecodeError:
                                    pass
                    elif block.get("type") == "tool_use":
                        # Convert to OpenAI tool_call format for consistency
                        tool_calls.append({
                            "id": block.get("id"),
                            "type": "function",
                            "function": {
                                "name": block.get("name"),
                                "arguments": json.dumps(block.get("input", {})),
                            }
                        })

                usage = result.get("usage", {})
                token_usage = usage.get("input_tokens", 0) + usage.get("output_tokens", 0)

                return LLMResponse(
                    content=content,
                    tool_calls=tool_calls,
                    token_usage=token_usage,
                    finish_reason=result.get("stop_reason", "end_turn"),
                    raw_content=raw_content,
                )

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from Anthropic: {e}")
            if e.response.status_code == 401:
                raise AuthenticationError(self.provider_id)
            elif e.response.status_code == 429:
                raise RateLimitError(self.provider_id)
            raise ProviderUnavailableError(self.provider_id)
        except httpx.RequestError as e:
            logger.error(f"Request error to Anthropic: {e}")
            raise ProviderUnavailableError(self.provider_id)


# --- Google Strategy ---

class GoogleStrategy(LLMProviderStrategy):
    """Strategy for Google Gemini API."""

    provider_id = "google"
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def validate_key_format(self, api_key: str) -> tuple[bool, str]:
        """Validate Google API key format."""
        if not api_key or len(api_key) < 30:
            return False, "API key is too short for Google"
        # Google API keys are typically 39 characters
        if not re.match(r'^[A-Za-z0-9_-]+$', api_key):
            return False, "Google API key contains invalid characters"
        return True, ""

    def _convert_tools_to_google(self, tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Convert OpenAI tool format to Google function declarations."""
        function_declarations = []
        for tool in tools:
            if tool.get("type") == "function":
                func = tool["function"]
                function_declarations.append({
                    "name": func["name"],
                    "description": func.get("description", ""),
                    "parameters": func.get("parameters", {"type": "object", "properties": {}}),
                })
        return [{"functionDeclarations": function_declarations}] if function_declarations else []

    def _convert_messages_to_google(self, messages: list[dict[str, Any]]) -> tuple[str, list[dict[str, Any]]]:
        """Convert OpenAI messages to Google format. Returns (system_instruction, contents)."""
        system_instruction = ""
        contents = []

        for msg in messages:
            role = msg.get("role")
            content = msg.get("content", "")

            if role == "system":
                system_instruction = content
            elif role == "user":
                contents.append({"role": "user", "parts": [{"text": content}]})
            elif role == "assistant":
                if msg.get("tool_calls"):
                    # Convert tool calls to Google format
                    parts = []
                    for tc in msg["tool_calls"]:
                        parts.append({
                            "functionCall": {
                                "name": tc["function"]["name"],
                                "args": json.loads(tc["function"]["arguments"]) if isinstance(tc["function"]["arguments"], str) else tc["function"]["arguments"],
                            }
                        })
                    contents.append({"role": "model", "parts": parts})
                else:
                    contents.append({"role": "model", "parts": [{"text": content}]})
            elif role == "tool":
                # Tool results in Google format
                contents.append({
                    "role": "user",
                    "parts": [{
                        "functionResponse": {
                            "name": msg.get("name", "function"),
                            "response": {"result": msg.get("content", "")},
                        }
                    }]
                })

        return system_instruction, contents

    async def call(self, api_key: str, request: LLMRequest) -> LLMResponse:
        """Make API call using Google generateContent format."""
        url = f"{self.BASE_URL}/{request.model}:generateContent?key={api_key}"

        headers = {
            "Content-Type": "application/json",
        }

        system_instruction, contents = self._convert_messages_to_google(request.messages)

        payload: dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            },
        }

        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        if request.tools:
            payload["tools"] = self._convert_tools_to_google(request.tools)

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    json=payload,
                )

                if response.status_code == 401 or response.status_code == 403:
                    raise AuthenticationError(self.provider_id)
                elif response.status_code == 429:
                    raise RateLimitError(self.provider_id)
                elif response.status_code >= 500:
                    raise ProviderUnavailableError(self.provider_id)

                response.raise_for_status()
                result = response.json()

                # Parse Google response
                content = None
                raw_content = ""
                tool_calls = []

                candidates = result.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    for part in parts:
                        if "text" in part:
                            raw_content = part["text"]
                            try:
                                content = json.loads(raw_content)
                            except json.JSONDecodeError:
                                json_match = re.search(r'\{[\s\S]*\}', raw_content)
                                if json_match:
                                    try:
                                        content = json.loads(json_match.group())
                                    except json.JSONDecodeError:
                                        pass
                        elif "functionCall" in part:
                            fc = part["functionCall"]
                            tool_calls.append({
                                "id": f"call_{fc['name']}",
                                "type": "function",
                                "function": {
                                    "name": fc["name"],
                                    "arguments": json.dumps(fc.get("args", {})),
                                }
                            })

                # Google doesn't provide detailed token usage in the same way
                usage = result.get("usageMetadata", {})
                token_usage = usage.get("totalTokenCount", 0)

                finish_reason = "stop"
                if candidates:
                    finish_reason = candidates[0].get("finishReason", "STOP").lower()

                return LLMResponse(
                    content=content,
                    tool_calls=tool_calls,
                    token_usage=token_usage,
                    finish_reason=finish_reason,
                    raw_content=raw_content,
                )

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error from Google: {e}")
            if e.response.status_code in (401, 403):
                raise AuthenticationError(self.provider_id)
            elif e.response.status_code == 429:
                raise RateLimitError(self.provider_id)
            raise ProviderUnavailableError(self.provider_id)
        except httpx.RequestError as e:
            logger.error(f"Request error to Google: {e}")
            raise ProviderUnavailableError(self.provider_id)
