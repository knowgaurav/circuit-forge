"""ReAct loop — the heart of the agent.

A single turn walks the model through *Reason → Act → Observe* until it
emits a final message or the budget runs out. Concretely, when a user types
"add an AND gate":

1. ``run_turn`` adds the user message to :class:`AgentContext` and starts the
   loop.
2. **Iteration 1.** The orchestrator builds an :class:`LLMRequest` with the
   current message history and the tool schemas, then calls the provider.
   The model emits a ``tool_call`` ``{"name": "add_component",
   "arguments": "{\\"kind\\": \\"AND\\", \\"x\\": 120, \\"y\\": 80}"}`` and
   no final content. The thought (raw assistant content, possibly empty) is
   appended to the trace, and :func:`dispatch_tool_call` validates the args,
   runs the tool, and writes both ``tool_call`` and ``tool_result`` entries
   to the trace and to the context.
3. **Iteration 2.** With the tool result now in the message history, the
   model produces a final assistant message: ``"Added an AND gate at
   (120, 80)."``. ``response.tool_calls`` is empty, so the loop records the
   thought, sets ``final_message``, and breaks.
4. ``run_turn`` persists the trace via the injected repo and returns a
   :class:`TurnResult` with ``aborted=False``.

Hard caps from ``contracts.md`` (see :mod:`.tokens` for values):

* ``max_iterations`` — stop after N model round-trips. If we exit the loop
  without a final message we abort with ``"max_iterations"``.
* ``max_input_tokens`` — cumulative across iterations. Checked *after* each
  iteration so the in-flight call is allowed to complete.
* ``max_output_tokens`` — cumulative response budget. Same post-iteration
  check.

When any cap trips, ``aborted=True``, ``final_message`` becomes the sentinel
:data:`ABORTED_MESSAGE`, and ``abort_reason`` carries the cap name. The
trace is still persisted so the UI can replay the partial reasoning.
"""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

from app.services.agent.context import AgentContext
from app.services.agent.schemas import TOOL_SCHEMAS
from app.services.llm_providers import LLMRequest, LLMResponse

from .dispatch import ToolFn, dispatch_tool_call
from .result import ABORTED_MESSAGE, TurnResult
from .tokens import (
    DEFAULT_MAX_INPUT_TOKENS,
    DEFAULT_MAX_ITERATIONS,
    DEFAULT_MAX_OUTPUT_TOKENS,
    _estimate_messages_tokens,
    _estimate_response_tokens,
)


# ---------------------------------------------------------------------------
# Provider / repo protocols — kept narrow so tests can swap in a stub.
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
                await dispatch_tool_call(tool_call, tools_registry, trace, context)

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
