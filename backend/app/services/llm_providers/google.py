"""Google Gemini provider (Vertex AI) authenticated with ADC.

Why this module exists separately
---------------------------------
Gemini's ``generateContent`` API has its own vocabulary that this strategy
translates to and from the common shape:

* The model role is ``"model"`` (not ``"assistant"``), and turns are
  ``contents`` with ``parts`` rather than ``messages``.
* The system prompt is a top-level ``systemInstruction``.
* Tools are ``functionDeclarations``; tool calls come back as
  ``functionCall`` parts and results go back as ``functionResponse`` parts.

Authentication
--------------
Vertex AI's ``generateContent`` endpoint does not accept API keys; it requires
an OAuth2 access token. This strategy uses **Application Default Credentials**
(ADC) — the same credentials ``gcloud auth application-default login`` sets up
— so all calls are billed to the configured Google Cloud project. The
``api_key`` argument is kept for interface compatibility but is ignored.

The endpoint is the project-scoped Vertex path
``https://{host}/v1/projects/{project}/locations/{location}/publishers/google/models/{model}:generateContent``.
The ``location`` selects the regional host ``{location}-aiplatform.googleapis.com``;
when it is empty or ``"global"`` the global host ``aiplatform.googleapis.com``
is used (with ``locations/global`` in the path).
"""

import json
import logging
import re
from typing import Any

import google.auth
import google.auth.transport.requests
import httpx

from app.core.config import settings

from .base import LLMProviderStrategy
from .errors import (
    AuthenticationError,
    ProviderUnavailableError,
    RateLimitError,
)
from .types import LLMRequest, LLMResponse

logger = logging.getLogger(__name__)

# Scope required to call Vertex AI / Agent Platform endpoints.
_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"


class GoogleStrategy(LLMProviderStrategy):
    """Strategy for Google Gemini on Vertex AI, authenticated via ADC."""

    provider_id = "google"
    GLOBAL_HOST = "aiplatform.googleapis.com"

    def __init__(self) -> None:
        # Cache ADC credentials and the resolved project across calls; the
        # credentials object refreshes its own short-lived token in place.
        self._credentials: google.auth.credentials.Credentials | None = None
        self._project: str | None = None

    def _get_token_and_project(self) -> tuple[str, str]:
        """Return a fresh access token and the Cloud project for the request.

        Uses ADC the first time, then reuses the credentials object (which
        refreshes its own token when expired).
        """
        if self._credentials is None:
            credentials, adc_project = google.auth.default(scopes=[_CLOUD_PLATFORM_SCOPE])
            self._credentials = credentials
            self._project = settings.google_cloud_project or adc_project

        request = google.auth.transport.requests.Request()
        self._credentials.refresh(request)

        if not self._project:
            raise ProviderUnavailableError(self.provider_id)

        return self._credentials.token, self._project

    def _build_url(self, model: str, location: str, project: str) -> str:
        """Build the project-scoped Vertex AI generateContent URL.

        An empty location or ``"global"`` uses the global host; any other
        value selects the matching regional host.
        """
        location = location.strip().lower() or "global"
        if location != "global":
            host = f"{location}-{self.GLOBAL_HOST}"
        else:
            host = self.GLOBAL_HOST
        return (
            f"https://{host}/v1/projects/{project}/locations/{location}"
            f"/publishers/google/models/{model}:generateContent"
        )

    def validate_key_format(self, api_key: str) -> tuple[bool, str]:
        """Google uses ADC, not an API key, so any value is accepted."""
        return True, ""

    def _inline_schema(self, schema: dict[str, Any], defs: dict[str, Any]) -> dict[str, Any]:
        """Inline ``$ref``/``$defs`` and drop keywords Vertex rejects.

        Pydantic's ``model_json_schema`` emits nested models as ``$ref`` into a
        top-level ``$defs`` table, plus ``title`` annotations. Vertex AI's
        ``functionDeclarations`` only accepts a restricted OpenAPI subset and
        400s on ``$defs``/``$ref``/``title``. This resolves refs against the
        defs table and strips the unsupported keys, recursively.
        """
        if "$ref" in schema:
            ref_name = schema["$ref"].split("/")[-1]
            resolved = defs.get(ref_name, {})
            return self._inline_schema(resolved, defs)

        cleaned: dict[str, Any] = {}
        for key, value in schema.items():
            if key in ("$defs", "title"):
                continue
            if key == "properties" and isinstance(value, dict):
                cleaned[key] = {
                    prop: self._inline_schema(prop_schema, defs)
                    for prop, prop_schema in value.items()
                }
            elif key == "items" and isinstance(value, dict):
                cleaned[key] = self._inline_schema(value, defs)
            elif key in ("anyOf", "allOf", "oneOf") and isinstance(value, list):
                cleaned[key] = [self._inline_schema(item, defs) for item in value]
            else:
                cleaned[key] = value
        return cleaned

    def _convert_tools_to_google(self, tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Convert OpenAI tool format to Google function declarations."""
        function_declarations = []
        for tool in tools:
            if tool.get("type") == "function":
                func = tool["function"]
                parameters = func.get("parameters", {"type": "object", "properties": {}})
                defs = parameters.get("$defs", {})
                function_declarations.append({
                    "name": func["name"],
                    "description": func.get("description", ""),
                    "parameters": self._inline_schema(parameters, defs),
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
                        part: dict[str, Any] = {
                            "functionCall": {
                                "name": tc["function"]["name"],
                                "args": json.loads(tc["function"]["arguments"]) if isinstance(tc["function"]["arguments"], str) else tc["function"]["arguments"],
                            }
                        }
                        # Echo back the Gemini 3.x thought_signature captured on
                        # the original response; required or the API 400s.
                        if tc.get("thought_signature"):
                            part["thoughtSignature"] = tc["thought_signature"]
                        parts.append(part)
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

    async def call(self, api_key: str, request: LLMRequest, location: str = "global") -> LLMResponse:
        """Make API call using Vertex AI generateContent with ADC auth.

        ``api_key`` is ignored; authentication uses Application Default
        Credentials so the call is billed to the configured Cloud project.
        """
        token, project = self._get_token_and_project()
        url = self._build_url(request.model, location, project)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
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
                            tool_call: dict[str, Any] = {
                                "id": f"call_{fc['name']}",
                                "type": "function",
                                "function": {
                                    "name": fc["name"],
                                    "arguments": json.dumps(fc.get("args", {})),
                                }
                            }
                            # Gemini 3.x returns a thought_signature alongside
                            # each functionCall that MUST be echoed back on the
                            # next turn, or the API rejects the request (400).
                            # Stash it on the tool_call so it round-trips
                            # through AgentContext untouched.
                            if "thoughtSignature" in part:
                                tool_call["thought_signature"] = part["thoughtSignature"]
                            tool_calls.append(tool_call)

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
