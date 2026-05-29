"""Local-LLM provider (Ollama, LM Studio, vLLM) reached via a tunnel.

Why this module exists separately
---------------------------------
Running against a self-hosted model is the odd one out: there's no cloud API
key, the server is reached through a Cloudflare tunnel (authenticated with a
bridge token in the ``X-Bridge-Token`` header), and the server might speak
*either* the OpenAI format *or* Ollama's native format.

How endpoint discovery works
----------------------------
``call`` tries the OpenAI-compatible endpoint first
(``/v1/chat/completions``) and, if that 404s, falls back to Ollama's native
``/api/chat``. Each format has its own payload builder and response parser
(``_build_*_payload`` / ``_parse_*_response``). A 404 means "wrong format,
try the next endpoint"; any other error propagates.

Extra helpers
-------------
* ``list_models`` — fetch the model list for the connection UI, again trying
  both the OpenAI (``/v1/models``) and Ollama (``/api/tags``) shapes.
* ``test_connection`` — send a trivial "Say OK" request to confirm the tunnel
  and token work before the user relies on them.
"""

import json
import logging
import re
from typing import Any

import httpx

from .base import LLMProviderStrategy
from .errors import AuthenticationError, ProviderUnavailableError
from .types import LLMRequest, LLMResponse

logger = logging.getLogger(__name__)


class LocalLLMStrategy(LLMProviderStrategy):
    """Strategy for local LLMs via Cloudflare tunnel (Ollama, LM Studio, vLLM, etc.)."""

    provider_id = "local"

    def validate_key_format(self, api_key: str) -> tuple[bool, str]:
        """Local provider doesn't use API keys in the traditional sense."""
        return True, ""

    async def call(
        self,
        api_key: str,  # Not used for local, but required by interface
        request: LLMRequest,
        base_url: str | None = None,
        bridge_token: str | None = None,
    ) -> LLMResponse:
        """Make API call to local LLM via tunnel."""
        if not base_url:
            raise AuthenticationError(self.provider_id, "Base URL is required for local LLM")
        if not bridge_token:
            raise AuthenticationError(self.provider_id, "Bridge token is required for local LLM")

        headers = {
            "Content-Type": "application/json",
            "X-Bridge-Token": bridge_token,
        }

        # Try OpenAI-compatible endpoint first, then fall back to Ollama native
        endpoints = [
            f"{base_url.rstrip('/')}/v1/chat/completions",
            f"{base_url.rstrip('/')}/api/chat",
        ]

        last_error = None
        for endpoint in endpoints:
            try:
                response = await self._try_endpoint(endpoint, headers, request)
                if response:
                    return response
            except Exception as e:
                last_error = e
                logger.debug(f"Endpoint {endpoint} failed: {e}, trying next...")
                continue

        if last_error:
            logger.error(f"All local LLM endpoints failed: {last_error}")
            raise ProviderUnavailableError(self.provider_id)
        raise ProviderUnavailableError(self.provider_id)

    async def _try_endpoint(
        self,
        endpoint: str,
        headers: dict[str, str],
        request: LLMRequest,
    ) -> LLMResponse | None:
        """Try a specific endpoint format.

        Returns ``None`` on a 404 so ``call`` moves on to the next endpoint
        format; raises for any other error.
        """
        is_ollama_native = "/api/chat" in endpoint

        if is_ollama_native:
            payload = self._build_ollama_payload(request)
        else:
            payload = self._build_openai_payload(request)

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                logger.info(f"Trying local LLM endpoint: {endpoint}")
                response = await client.post(endpoint, headers=headers, json=payload)

                if response.status_code == 401:
                    raise AuthenticationError(self.provider_id, "Invalid bridge token")
                elif response.status_code == 404:
                    return None  # Try next endpoint
                elif response.status_code >= 500:
                    raise ProviderUnavailableError(self.provider_id)

                response.raise_for_status()
                result = response.json()

                if is_ollama_native:
                    return self._parse_ollama_response(result)
                else:
                    return self._parse_openai_response(result)

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    def _build_openai_payload(self, request: LLMRequest) -> dict[str, Any]:
        """Build OpenAI-compatible request payload."""
        payload: dict[str, Any] = {
            "model": request.model,
            "messages": request.messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": False,
        }
        if request.tools:
            payload["tools"] = request.tools
            payload["tool_choice"] = "auto"
        return payload

    def _build_ollama_payload(self, request: LLMRequest) -> dict[str, Any]:
        """Build Ollama native request payload."""
        payload: dict[str, Any] = {
            "model": request.model,
            "messages": request.messages,
            "stream": False,
            "options": {
                "temperature": request.temperature,
                "num_predict": request.max_tokens,
            },
        }
        if request.tools:
            payload["tools"] = request.tools
        return payload

    def _parse_openai_response(self, result: dict[str, Any]) -> LLMResponse:
        """Parse OpenAI-compatible response."""
        message = result["choices"][0]["message"]
        usage = result.get("usage", {})

        tool_calls = message.get("tool_calls", [])
        raw_content = message.get("content", "")

        content = None
        if raw_content:
            try:
                content = json.loads(raw_content)
            except json.JSONDecodeError:
                json_match = re.search(r'\{[\s\S]*\}', raw_content)
                if json_match:
                    try:
                        content = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            token_usage=usage.get("total_tokens", 0),
            finish_reason=result["choices"][0].get("finish_reason", "stop"),
            raw_content=raw_content,
        )

    def _parse_ollama_response(self, result: dict[str, Any]) -> LLMResponse:
        """Parse Ollama native response."""
        message = result.get("message", {})
        raw_content = message.get("content", "")

        # Ollama tool calls format
        tool_calls = []
        if message.get("tool_calls"):
            for tc in message["tool_calls"]:
                tool_calls.append({
                    "id": tc.get("id", f"call_{len(tool_calls)}"),
                    "type": "function",
                    "function": {
                        "name": tc["function"]["name"],
                        "arguments": json.dumps(tc["function"]["arguments"])
                        if isinstance(tc["function"]["arguments"], dict)
                        else tc["function"]["arguments"],
                    },
                })

        content = None
        if raw_content:
            try:
                content = json.loads(raw_content)
            except json.JSONDecodeError:
                json_match = re.search(r'\{[\s\S]*\}', raw_content)
                if json_match:
                    try:
                        content = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass

        # Ollama provides different token metrics
        token_usage = result.get("eval_count", 0) + result.get("prompt_eval_count", 0)

        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            token_usage=token_usage,
            finish_reason="stop" if result.get("done", True) else "length",
            raw_content=raw_content,
        )

    async def list_models(self, base_url: str, bridge_token: str) -> list[str]:
        """Fetch available models from local LLM server."""
        headers = {
            "Content-Type": "application/json",
            "X-Bridge-Token": bridge_token,
        }

        # Try different model list endpoints
        endpoints = [
            (f"{base_url.rstrip('/')}/v1/models", "data", "id"),
            (f"{base_url.rstrip('/')}/api/tags", "models", "name"),
        ]

        for endpoint, key, name_field in endpoints:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(endpoint, headers=headers)
                    if response.status_code == 200:
                        data = response.json()
                        models = data.get(key, [])
                        if models and isinstance(models[0], dict):
                            return [m.get(name_field, "unknown") for m in models]
                        return list(models)
            except Exception as e:
                logger.debug(f"Failed to list models from {endpoint}: {e}")
                continue

        return []

    async def test_connection(
        self,
        base_url: str,
        bridge_token: str,
        model: str,
    ) -> dict[str, Any]:
        """Test connection to local LLM."""
        headers = {
            "Content-Type": "application/json",
            "X-Bridge-Token": bridge_token,
        }

        # Simple test request
        test_request = LLMRequest(
            messages=[{"role": "user", "content": "Say OK"}],
            tools=[],
            model=model,
            temperature=0,
            max_tokens=10,
        )

        try:
            response = await self.call(
                api_key="",
                request=test_request,
                base_url=base_url,
                bridge_token=bridge_token,
            )
            return {"success": True, "message": "Connection successful"}
        except AuthenticationError as e:
            return {"success": False, "error": "authentication", "message": e.message}
        except ProviderUnavailableError as e:
            return {"success": False, "error": "unavailable", "message": e.message}
        except Exception as e:
            return {"success": False, "error": "unknown", "message": str(e)}
