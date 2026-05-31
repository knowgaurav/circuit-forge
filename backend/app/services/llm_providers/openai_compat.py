"""OpenAI and OpenAI-compatible providers (OpenAI, OpenRouter, OhMyGPT).

Why this module exists separately
---------------------------------
A whole family of providers speaks the OpenAI chat-completions format, so a
single strategy handles all of them — the only differences are the base URL,
the key prefix, and a couple of provider-specific quirks:

* ``openai`` uses ``max_completion_tokens`` instead of ``max_tokens`` for its
  newer models.
* ``openrouter`` wants two extra headers (``HTTP-Referer``, ``X-Title``).
* ``ohmygpt`` uses the same format with no key prefix.

The response handler is robust about JSON: if ``content`` isn't valid JSON it
tries to pull the first ``{...}`` block out of the text before giving up.

Example
-------
    strategy = OpenAICompatibleStrategy(
        provider_id="openai",
        base_url="https://api.openai.com/v1/chat/completions",
        key_prefix="sk-",
    )
    resp = await strategy.call(api_key, LLMRequest(model="gpt-4o-mini", ...))
    # resp.content -> parsed JSON dict (or None), resp.tool_calls -> list
"""

import json
import logging
import re
from typing import Any

import httpx

from .base import LLMProviderStrategy
from .errors import (
    AuthenticationError,
    ProviderUnavailableError,
    QuotaExceededError,
    RateLimitError,
)
from .types import LLMRequest, LLMResponse

logger = logging.getLogger(__name__)


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
            return (
                False,
                f"API key for {self.provider_id} should start with '{self.key_prefix}'",
            )
        return True, ""

    async def verify_key(self, api_key: str) -> dict[str, Any]:
        """Verify an OpenRouter key via the dedicated key endpoint.

        OpenRouter's free models are capped at a handful of requests per minute
        and per day, so testing a key by sending a chat completion burns that
        quota and returns 429 even for valid keys. The ``GET /api/v1/key``
        endpoint checks the key (and its limits) without consuming that quota.
        """
        key_url = self.base_url.replace("/chat/completions", "/key")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    key_url,
                    headers={"Authorization": f"Bearer {api_key}"},
                )

            if response.status_code in (401, 403):
                raise AuthenticationError(self.provider_id)
            if response.status_code == 429:
                raise RateLimitError(self.provider_id)
            if response.status_code >= 500:
                raise ProviderUnavailableError(self.provider_id)
            response.raise_for_status()
            return {
                "success": True,
                "message": "Connection successful",
                "token_usage": 0,
            }
        except httpx.RequestError as e:
            logger.error(f"Request error to {self.provider_id}: {e}")
            raise ProviderUnavailableError(self.provider_id)

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
                logger.info(
                    f"  Model: {request.model}, Tools: {has_tools}, API Key: {masked_key}"
                )
                response = await client.post(
                    self.base_url,
                    headers=headers,
                    json=payload,
                )
                logger.info(f"Response status: {response.status_code}")

                if response.status_code == 401:
                    logger.error(
                        f"Authentication failed for {self.provider_id}: {response.text}"
                    )
                    raise AuthenticationError(self.provider_id)
                elif response.status_code == 429:
                    retry_after = response.headers.get("retry-after")
                    error_body = response.text
                    logger.warning(
                        f"Rate limit hit for {self.provider_id}: {error_body}"
                    )
                    raise RateLimitError(
                        self.provider_id,
                        int(retry_after) if retry_after else None,
                        self._extract_error_message(response),
                    )
                elif response.status_code == 402:
                    raise QuotaExceededError(self.provider_id)
                elif response.status_code == 403:
                    logger.error(f"Forbidden for {self.provider_id}: {response.text}")
                    raise AuthenticationError(
                        self.provider_id,
                        "Access forbidden - check your API key permissions",
                    )
                elif response.status_code >= 500:
                    raise ProviderUnavailableError(self.provider_id)
                elif response.status_code >= 400:
                    logger.error(
                        f"Error {response.status_code} from {self.provider_id}: {response.text}"
                    )

                response.raise_for_status()
                result = response.json()

                if "choices" not in result or not result["choices"]:
                    # Some OpenAI-compatible providers return a 200 with an
                    # error payload instead of `choices`. Surface that message
                    # rather than crashing with a KeyError.
                    err = result.get("error")
                    detail = (
                        err.get("message") if isinstance(err, dict) else err
                    ) or "Provider returned no choices in the response."
                    logger.error(f"No choices from {self.provider_id}: {result}")
                    raise ProviderUnavailableError(self.provider_id, str(detail))

                message = result["choices"][0]["message"]
                usage = result.get("usage", {})

                # Extract tool calls if present
                tool_calls = []
                if "tool_calls" in message and message["tool_calls"]:
                    tool_calls = message["tool_calls"]

                # Parse content as JSON if possible
                content = None
                raw_content = message.get("content", "")
                logger.info(
                    f"Raw response from {self.provider_id} (first 500 chars): {raw_content[:500] if raw_content else 'EMPTY'}"
                )
                if raw_content:
                    try:
                        content = json.loads(raw_content)
                    except json.JSONDecodeError:
                        # Try to extract JSON from response
                        json_match = re.search(r"\{[\s\S]*\}", raw_content)
                        if json_match:
                            try:
                                content = json.loads(json_match.group())
                            except json.JSONDecodeError:
                                logger.warning(
                                    f"Failed to parse JSON from response: {json_match.group()[:200]}"
                                )
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

    @staticmethod
    def _extract_error_message(response: httpx.Response) -> str | None:
        """Pull the human-readable error out of an OpenAI-compatible error body.

        OpenRouter nests the actionable detail under
        ``error.metadata.raw`` (e.g. "model is temporarily rate-limited
        upstream, retry shortly or add your own key"), with ``error.message``
        as the fallback. Returns ``None`` if the body isn't the expected shape
        so the caller keeps its default message.
        """
        try:
            err = response.json().get("error")
        except (json.JSONDecodeError, ValueError):
            return None
        if not isinstance(err, dict):
            return err if isinstance(err, str) else None
        metadata = err.get("metadata")
        if isinstance(metadata, dict) and metadata.get("raw"):
            return str(metadata["raw"])
        message = err.get("message")
        return str(message) if message else None
