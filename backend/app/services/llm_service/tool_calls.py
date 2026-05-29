"""The tool-calling loop and its no-tools fallback.

Why this module exists separately
---------------------------------
This is the engine room shared by both ``generate_course_plan`` and
``generate_level_content``: drive the LLM through tool calls until it returns
JSON, and if tool-calling isn't supported (or keeps failing), fall back to a
single no-tools prompt with the component reference embedded.

_call_with_tools loop
---------------------
1. Send the system + user prompt plus ``TOOL_DEFINITIONS``.
2. If the model emits tool calls, run each through the tool handler, append
   the (TOON-encoded) results to the message history, and loop.
3. If the model returns parseable JSON content, we're done — return it.
4. Guard rails: a hard cap of ``MAX_TOOL_CALLS`` (10), and several error
   paths (auth/empty/parse failures) all route to ``_call_fallback``.

_call_fallback
--------------
Some providers/models don't support tool calling. The fallback embeds the
component list + pin reference straight into the prompt, asks for raw JSON,
and aggressively extracts the first ``{...}`` block if the model wraps it in
prose or markdown. For level content it also runs the blueprint through
``validate_blueprint`` and tries ``_auto_fix_blueprint`` once before giving up.
"""

import json
import re
from typing import Any

from app.core.logger import get_logger
from app.services.llm_providers import (
    AuthenticationError,
    LLMProviderStrategy,
    LLMRequest,
    LLMResponse,
    ProviderUnavailableError,
    QuotaExceededError,
    RateLimitError,
)
from app.services.llm_tools import TOOL_DEFINITIONS

from .prompts import COMPONENT_PIN_REFERENCE

logger = get_logger()


class ToolCallMixin:
    """Tool-calling loop + fallback. Relies on ``self.tool_handler`` and
    ``self.MAX_TOOL_CALLS`` from the host class."""

    async def _call_with_tools(
        self,
        provider: LLMProviderStrategy,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float,
        max_tokens: int,
        base_url: str | None = None,
        bridge_token: str | None = None,
    ) -> dict[str, Any]:
        """Make LLM call with tool support."""
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        tool_calls_count = 0
        total_tokens = 0

        # Check if this is a local provider
        is_local = provider.provider_id == "local"

        while tool_calls_count < self.MAX_TOOL_CALLS:
            request = LLMRequest(
                messages=messages,
                tools=TOOL_DEFINITIONS,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            try:
                # For local provider, pass base_url and bridge_token
                if is_local:
                    response = await provider.call(api_key, request, base_url=base_url, bridge_token=bridge_token)
                else:
                    response = await provider.call(api_key, request)
            except (RateLimitError, QuotaExceededError, ProviderUnavailableError):
                raise
            except AuthenticationError as e:
                # Some providers return auth errors when tool calling isn't supported
                # Try fallback mode first before failing
                logger.warning(f"Auth error during tool call (may be unsupported tools): {e}, trying fallback mode")
                return await self._call_fallback(
                    provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
                    base_url=base_url, bridge_token=bridge_token,
                )
            except Exception as e:
                logger.warning(f"Tool calling failed: {e}, trying fallback mode")
                return await self._call_fallback(
                    provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
                    base_url=base_url, bridge_token=bridge_token,
                )

            total_tokens += response.token_usage

            if response.tool_calls:
                # Add assistant message with tool calls
                messages.append({
                    "role": "assistant",
                    "content": response.raw_content,
                    "tool_calls": response.tool_calls,
                })

                # Execute each tool call
                for tool_call in response.tool_calls:
                    tool_name = tool_call["function"]["name"]
                    try:
                        tool_args = json.loads(tool_call["function"]["arguments"])
                    except json.JSONDecodeError:
                        tool_args = {}

                    logger.info(f"Executing tool: {tool_name}")

                    # Execute tool (returns TOON-encoded string for token efficiency)
                    tool_result = self.tool_handler.handle_tool_call(tool_name, tool_args)

                    # Add tool result to messages (already TOON-encoded string)
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "name": tool_name,
                        "content": tool_result if isinstance(tool_result, str) else json.dumps(tool_result),
                    })

                    tool_calls_count += 1

                    if tool_calls_count >= self.MAX_TOOL_CALLS:
                        logger.warning(f"Reached max tool calls ({self.MAX_TOOL_CALLS})")
                        break
            else:
                # LLM finished - check if we got valid content
                if response.content is not None:
                    logger.info(f"Tool calling complete: {tool_calls_count} tool calls, {total_tokens} tokens")
                    return {
                        "content": response.content,
                        "token_usage": total_tokens,
                        "tool_calls_count": tool_calls_count,
                    }
                else:
                    # Model returned empty/non-JSON content, try fallback
                    logger.warning(f"Model returned no parseable JSON content, trying fallback mode")
                    return await self._call_fallback(
                        provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
                        base_url=base_url, bridge_token=bridge_token,
                    )

        # If we exhausted tool calls without getting content, try fallback
        logger.warning(f"Exceeded max tool calls without valid content, trying fallback mode")
        return await self._call_fallback(
            provider, api_key, system_prompt, user_prompt, model, temperature, max_tokens,
            base_url=base_url, bridge_token=bridge_token,
        )

    async def _call_fallback(
        self,
        provider: LLMProviderStrategy,
        api_key: str,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float,
        max_tokens: int,
        base_url: str | None = None,
        bridge_token: str | None = None,
    ) -> dict[str, Any]:
        """Fallback to non-tool mode with component info embedded in prompt."""
        # Get component info to embed in prompt (use JSON, not TOON, for parsing)
        components_info = self.tool_handler.handle_tool_call("get_available_components", {}, use_toon=False)

        # Build component reference for the prompt
        component_ref = "=== AVAILABLE COMPONENTS ===\n"
        for category, comps in components_info.get("categories", {}).items():
            component_ref += f"\n{category}:\n"
            for comp in comps:
                component_ref += f"  - {comp['type']}: {comp['description']}\n"

        # Modify system prompt to include component info
        enhanced_prompt = system_prompt.replace(
            "IMPORTANT WORKFLOW:",
            f"{component_ref}\n{COMPONENT_PIN_REFERENCE}\nIMPORTANT:"
        ).replace(
            "IMPORTANT: Before creating the course plan, you MUST call the get_available_components tool",
            f"{component_ref}\nIMPORTANT: Use only the components listed above"
        )

        logger.info("Using fallback mode with embedded component info")

        # Add explicit JSON formatting instruction
        json_instruction = """

CRITICAL: Your response MUST be a valid JSON object only. Do NOT include any text before or after the JSON.
Do NOT use markdown code blocks. Start your response with { and end with }.
"""
        enhanced_user_prompt = user_prompt + json_instruction

        request = LLMRequest(
            messages=[
                {"role": "system", "content": enhanced_prompt},
                {"role": "user", "content": enhanced_user_prompt},
            ],
            tools=[],
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        # For local provider, pass base_url and bridge_token
        is_local = provider.provider_id == "local"
        if is_local:
            response = await provider.call(api_key, request, base_url=base_url, bridge_token=bridge_token)
        else:
            response = await provider.call(api_key, request)

        # If content is still None, try to parse raw_content more aggressively
        if response.content is None and response.raw_content:
            logger.warning("Fallback: Attempting aggressive JSON extraction from raw content")
            raw = response.raw_content
            # Remove markdown code blocks if present
            raw = re.sub(r'```json\s*', '', raw)
            raw = re.sub(r'```\s*', '', raw)
            # Try to find JSON object
            try:
                # Find the first { and last }
                start = raw.find('{')
                end = raw.rfind('}')
                if start != -1 and end != -1 and end > start:
                    json_str = raw[start:end+1]
                    response = LLMResponse(
                        content=json.loads(json_str),
                        tool_calls=[],
                        token_usage=response.token_usage,
                        finish_reason=response.finish_reason,
                        raw_content=response.raw_content,
                    )
                    logger.info("Successfully extracted JSON from raw content")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse extracted JSON: {e}")

        result = {
            "content": response.content,
            "token_usage": response.token_usage,
        }

        # Post-generation validation and auto-fix for level content
        content = response.content or {}
        if "practical" in content and "circuitBlueprint" in content.get("practical", {}):
            blueprint = content["practical"]["circuitBlueprint"]
            validation = self.tool_handler.handle_tool_call("validate_blueprint", {"blueprint": blueprint}, use_toon=False)

            if not validation.get("success"):
                errors = validation.get("errors", [])
                logger.warning(f"Blueprint validation failed: {errors}")

                # Auto-fix common errors
                fixed_blueprint = self._auto_fix_blueprint(blueprint, errors)

                # Validate again
                revalidation = self.tool_handler.handle_tool_call("validate_blueprint", {"blueprint": fixed_blueprint}, use_toon=False)

                if revalidation.get("success"):
                    logger.info("Blueprint auto-fixed successfully")
                    content["practical"]["circuitBlueprint"] = fixed_blueprint
                    result["content"] = content
                else:
                    logger.error(f"Blueprint auto-fix failed: {revalidation.get('errors', [])}")
                    result["validation_errors"] = revalidation.get("errors", [])

        return result
