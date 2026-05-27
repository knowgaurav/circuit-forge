"""ReAct orchestrator for the agent (Story B — B.1).

Single loop, hard caps from ``contracts.md``:

* 6 iterations
* 4k input tokens (cumulative across iterations)
* 1k output tokens (cumulative)

When any cap is exceeded the loop exits cleanly with ``aborted=True``,
``final_message="<aborted>"``, and ``abort_reason`` set to one of
``"max_iterations" | "max_input_tokens" | "max_output_tokens"``.

Tool calls are validated against ``app.services.agent.schemas.TOOL_SCHEMAS``.
A failing validation or a ``ToolError`` from a tool produces a structured
``{"error": code, "tool": ..., "details": ...}`` result that is appended to
the trace, fed back to the model in the next iteration, and counts against
the budget — the shape ``contracts.md`` calls out.

The ``tools_registry`` is injected (``dict[str, Callable[..., Awaitable[dict]]]``)
so the loop is unit-testable without the ``app.services.agent.tools`` module
being merged. ``ToolError`` is imported lazily for the same reason.
"""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from app.services.agent.context import AgentContext
from app.services.agent.schemas import TOOL_SCHEMAS
from app.services.llm_providers import LLMRequest, LLMResponse

# Lazy import of ToolError — the tools module lives in a parallel lane and may
# not exist yet. Falling back to a local class with the same shape lets the
# orchestrator be unit-tested in isolation; once the tools lane lands, their
# ToolError replaces this stub seamlessly.
try:  # pragma: no cover - import-time fallback
    from app.services.agent.tools import ToolError  # type: ignore[no-redef]
except ImportError:  # pragma: no cover - exercised when tools.py is absent

    class ToolError(Exception):  # type: ignore[no-redef]
        """Tool-side error raised by individual tool implementations."""

        def __init__(self, code: str, details: str = "") -> None:
            self.code = code
            self.details = details
            super().__init__(f"{code}: {details}" if details else code)


ToolFn = Callable[..., Awaitable[dict[str, Any]]]


# ---------------------------------------------------------------------------
# Response model
# ---------------------------------------------------------------------------


class TurnResult(BaseModel):
    """Orchestrator turn result — matches ``POST /api/agent/turn`` shape."""

    trace: list[dict[str, Any]]
    final_message: str = Field(alias="finalMessage")
    tokens_in: int = Field(alias="tokensIn")
    tokens_out: int = Field(alias="tokensOut")
    iterations: int
    aborted: bool
    abort_reason: str | None = Field(alias="abortReason")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


DEFAULT_MAX_ITERATIONS = 6
DEFAULT_MAX_INPUT_TOKENS = 4000
DEFAULT_MAX_OUTPUT_TOKENS = 1000

ABORTED_MESSAGE = "<aborted>"


def _estimate_tokens(text: str) -> int:
    return len(text) // 4


def _estimate_messages_tokens(messages: list[dict[str, Any]]) -> int:
    total = 0
    for msg in messages:
        content = msg.get("content")
        if isinstance(content, str):
            total += _estimate_tokens(content)
        for tc in msg.get("tool_calls", []) or []:
            func = tc.get("function", {})
            args = func.get("arguments", "")
            if not isinstance(args, str):
                args = json.dumps(args)
            total += _estimate_tokens(args)
            total += _estimate_tokens(func.get("name", ""))
    return total


def _estimate_response_tokens(response: LLMResponse) -> int:
    total = _estimate_tokens(response.raw_content or "")
    for tc in response.tool_calls:
        func = tc.get("function", {})
        args = func.get("arguments", "")
        if not isinstance(args, str):
            args = json.dumps(args)
        total += _estimate_tokens(args)
        total += _estimate_tokens(func.get("name", ""))
    return total


# ---------------------------------------------------------------------------
# Provider protocol — kept narrow so tests can swap in a stub.
# ---------------------------------------------------------------------------


class _ProviderLike:
    """Structural type describing the subset of LLMProviderStrategy we use."""

    async def call(
        self, api_key: str, request: LLMRequest
    ) -> LLMResponse:  # pragma: no cover - structural stub
        ...


class AgentTraceRepoLike:
    """Structural type for the trace repository so tests can inject a fake."""

    async def append_trace(  # pragma: no cover - structural stub
        self,
        *,
        session_id: str,
        actor_id: str,
        trace: list[dict[str, Any]],
        final_message: str,
        aborted: bool,
        abort_reason: str | None,
    ) -> None:
        ...


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


class Orchestrator:
    """ReAct orchestrator. One instance per request is fine — it's stateless."""

    def __init__(
        self,
        provider_factory: Callable[[str], _ProviderLike],
        *,
        max_iterations: int = DEFAULT_MAX_ITERATIONS,
        max_input_tokens: int = DEFAULT_MAX_INPUT_TOKENS,
        max_output_tokens: int = DEFAULT_MAX_OUTPUT_TOKENS,
    ) -> None:
        self._provider_factory = provider_factory
        self._max_iterations = max_iterations
        self._max_input_tokens = max_input_tokens
        self._max_output_tokens = max_output_tokens

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    async def run_turn(
        self,
        session_id: str,
        actor_id: str,
        message: str,
        *,
        provider_id: str,
        api_key: str,
        model: str,
        tools_registry: dict[str, ToolFn],
        context: AgentContext,
        trace_repo: AgentTraceRepoLike,
    ) -> TurnResult:
        provider = self._provider_factory(provider_id)
        context.add_user(message)

        trace: list[dict[str, Any]] = []
        tokens_in = 0
        tokens_out = 0
        iterations = 0
        abort_reason: str | None = None
        final_message: str | None = None

        tools_for_llm = self._tools_for_llm()

        while iterations < self._max_iterations:
            iterations += 1

            messages = context.messages_for_llm(self._max_input_tokens)
            msg_tokens = _estimate_messages_tokens(messages)

            request = LLMRequest(
                messages=messages,
                tools=tools_for_llm,
                model=model,
                temperature=0.0,
                max_tokens=self._max_output_tokens,
            )
            response = await provider.call(api_key, request)

            tokens_in += msg_tokens
            tokens_out += _estimate_response_tokens(response)

            thought_text = response.raw_content or ""
            trace.append({"kind": "thought", "text": thought_text})

            if not response.tool_calls:
                # Final-message path.
                if response.raw_content:
                    final_message = response.raw_content
                elif response.content is not None:
                    final_message = json.dumps(response.content)
                else:
                    final_message = ""
                context.add_assistant(thought_text, tool_calls=[])
                break

            context.add_assistant(thought_text, tool_calls=response.tool_calls)

            for tool_call in response.tool_calls:
                await self._dispatch_tool_call(
                    tool_call, tools_registry, trace, context
                )

            # Budget check after the iteration: if we already overshot the
            # caps, exit before doing another network round-trip.
            if tokens_in > self._max_input_tokens:
                abort_reason = "max_input_tokens"
                break
            if tokens_out > self._max_output_tokens:
                abort_reason = "max_output_tokens"
                break

        if final_message is None and abort_reason is None:
            abort_reason = "max_iterations"

        aborted = abort_reason is not None
        if aborted:
            final_message = ABORTED_MESSAGE

        await trace_repo.append_trace(
            session_id=session_id,
            actor_id=actor_id,
            trace=trace,
            final_message=final_message or "",
            aborted=aborted,
            abort_reason=abort_reason,
        )

        return TurnResult(
            trace=trace,
            final_message=final_message or "",
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            iterations=iterations,
            aborted=aborted,
            abort_reason=abort_reason,
        )

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    @staticmethod
    def _tools_for_llm() -> list[dict[str, Any]]:
        """Convert ``TOOL_SCHEMAS`` to the OpenAI ``tools`` array shape."""
        out: list[dict[str, Any]] = []
        for name, (args_cls, _result_cls) in TOOL_SCHEMAS.items():
            description = (args_cls.__doc__ or "").strip() or name
            out.append(
                {
                    "type": "function",
                    "function": {
                        "name": name,
                        "description": description,
                        "parameters": args_cls.model_json_schema(),
                    },
                }
            )
        return out

    async def _dispatch_tool_call(
        self,
        tool_call: dict[str, Any],
        tools_registry: dict[str, ToolFn],
        trace: list[dict[str, Any]],
        context: AgentContext,
    ) -> None:
        func = tool_call.get("function", {})
        tool_name = func.get("name", "")
        raw_args = func.get("arguments", "{}")
        tool_call_id = tool_call.get("id", f"call-{tool_name}-{len(trace)}")

        try:
            parsed_args = (
                json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args)
            )
        except json.JSONDecodeError as exc:
            self._record_tool_error(
                tool_call_id,
                tool_name,
                {},
                "INVALID_JSON_ARGS",
                str(exc),
                trace,
                context,
            )
            return

        trace.append({"kind": "tool_call", "tool": tool_name, "args": parsed_args})

        schema_pair = TOOL_SCHEMAS.get(tool_name)
        if schema_pair is None:
            self._record_tool_error_after_call(
                tool_call_id,
                tool_name,
                "UNKNOWN_TOOL",
                f"No tool named {tool_name}",
                trace,
                context,
            )
            return

        args_cls, _result_cls = schema_pair
        try:
            validated = args_cls.model_validate(parsed_args)
        except ValidationError as ve:
            self._record_tool_error_after_call(
                tool_call_id,
                tool_name,
                "INVALID_ARGS",
                ve.errors(include_url=False),
                trace,
                context,
            )
            return

        fn = tools_registry.get(tool_name)
        if fn is None:
            self._record_tool_error_after_call(
                tool_call_id,
                tool_name,
                "TOOL_UNAVAILABLE",
                f"Tool {tool_name} is not registered",
                trace,
                context,
            )
            return

        try:
            result = await fn(validated)
        except ToolError as te:
            self._record_tool_error_after_call(
                tool_call_id,
                tool_name,
                te.code,
                te.details,
                trace,
                context,
            )
            return

        trace.append(
            {
                "kind": "tool_result",
                "tool": tool_name,
                "result": result,
                "is_error": False,
            }
        )
        context.add_tool_result(tool_call_id, tool_name, result, is_error=False)

    @staticmethod
    def _record_tool_error(
        tool_call_id: str,
        tool_name: str,
        args: dict[str, Any],
        code: str,
        details: Any,
        trace: list[dict[str, Any]],
        context: AgentContext,
    ) -> None:
        """Used when the call cannot even be parsed — emits both trace entries."""
        err = {"error": code, "tool": tool_name, "details": details}
        trace.append({"kind": "tool_call", "tool": tool_name, "args": args})
        trace.append(
            {
                "kind": "tool_result",
                "tool": tool_name,
                "result": err,
                "is_error": True,
            }
        )
        context.add_tool_result(tool_call_id, tool_name, err, is_error=True)

    @staticmethod
    def _record_tool_error_after_call(
        tool_call_id: str,
        tool_name: str,
        code: str,
        details: Any,
        trace: list[dict[str, Any]],
        context: AgentContext,
    ) -> None:
        """Used when ``tool_call`` is already in the trace — emits only the result."""
        err = {"error": code, "tool": tool_name, "details": details}
        trace.append(
            {
                "kind": "tool_result",
                "tool": tool_name,
                "result": err,
                "is_error": True,
            }
        )
        context.add_tool_result(tool_call_id, tool_name, err, is_error=True)
