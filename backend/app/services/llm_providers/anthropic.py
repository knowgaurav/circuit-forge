"""Anthropic Claude provider.

Why this module exists separately
---------------------------------
Anthropic's Messages API differs from OpenAI's in three ways this strategy
has to bridge:

1. **System prompt** is a top-level ``system`` field, not a message with
   ``role: "system"``. ``_convert_messages_to_anthropic`` pulls it out.
2. **Tool calls** use ``tool_use`` content blocks, and tool *results* come
   back as ``tool_result`` blocks inside a user message — not the OpenAI
   ``role: "tool"`` shape. We translate both directions.
3. **Tool schemas** use ``input_schema`` instead of ``parameters``.

After the round-trip we normalize everything back to the common
:class:`LLMResponse` (tool calls re-expressed in OpenAI shape) so callers
never see Anthropic-specific structures.
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
