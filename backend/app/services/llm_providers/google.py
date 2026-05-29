"""Google Gemini provider.

Why this module exists separately
---------------------------------
Gemini's ``generateContent`` API has its own vocabulary that this strategy
translates to and from the common shape:

* The model role is ``"model"`` (not ``"assistant"``), and turns are
  ``contents`` with ``parts`` rather than ``messages``.
* The system prompt is a top-level ``systemInstruction``.
* Tools are ``functionDeclarations``; tool calls come back as
  ``functionCall`` parts and results go back as ``functionResponse`` parts.
* The API key goes in the URL query string, not a header.

As with the other providers, tool calls are normalized back to OpenAI shape
in the returned :class:`LLMResponse`.
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
    RateLimitError,
)
from .types import LLMRequest, LLMResponse

logger = logging.getLogger(__name__)


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
