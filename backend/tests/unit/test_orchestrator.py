"""Unit tests for the ReAct orchestrator (Story B — B.1).

We never import from ``app.services.agent.tools`` because that lane lives in a
parallel branch. A local ``ToolError`` and synthetic ``tools_registry`` fakes
are sufficient — the orchestrator's real interaction with tools is just
"validate args, call, catch ``ToolError``".
"""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from pydantic import BaseModel

from app.services.agent.context import AgentContext
from app.services.agent.orchestrator import (
    ABORTED_MESSAGE,
    Orchestrator,
    ToolError,
)
from app.services.llm_providers import LLMRequest, LLMResponse


ToolFn = Callable[..., Awaitable[dict[str, Any]]]


# ---------------------------------------------------------------------------
# Test fakes
# ---------------------------------------------------------------------------


class FakeProvider:
    """Returns a scripted sequence of LLMResponse objects."""

    def __init__(self, responses: list[LLMResponse]) -> None:
        self._responses = list(responses)
        self.calls: list[LLMRequest] = []

    async def call(self, api_key: str, request: LLMRequest) -> LLMResponse:
        self.calls.append(request)
        if len(self._responses) == 1:
            return self._responses[0]
        return self._responses.pop(0)


class FakeTraceRepo:
    def __init__(self) -> None:
        self.appended: list[dict[str, Any]] = []

    async def append_trace(
        self,
        *,
        session_id: str,
        actor_id: str,
        trace: list[dict[str, Any]],
        final_message: str,
        aborted: bool,
        abort_reason: str | None,
    ) -> None:
        self.appended.append(
            {
                "session_id": session_id,
                "actor_id": actor_id,
                "trace": list(trace),
                "final_message": final_message,
                "aborted": aborted,
                "abort_reason": abort_reason,
            }
        )


def _tool_call(
    name: str, args: dict[str, Any], call_id: str = "call-1"
) -> dict[str, Any]:
    return {
        "id": call_id,
        "type": "function",
        "function": {"name": name, "arguments": json.dumps(args)},
    }


def _make_orchestrator(
    provider: FakeProvider,
    *,
    max_iterations: int = 6,
    max_input_tokens: int = 4000,
    max_output_tokens: int = 1000,
) -> Orchestrator:
    return Orchestrator(
        provider_factory=lambda _pid: provider,
        max_iterations=max_iterations,
        max_input_tokens=max_input_tokens,
        max_output_tokens=max_output_tokens,
    )


# ---------------------------------------------------------------------------
# Final-message path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_final_message_text_only_response_exits_in_one_iteration() -> None:
    provider = FakeProvider(
        [LLMResponse(raw_content="All good.", tool_calls=[], token_usage=0)]
    )
    repo = FakeTraceRepo()
    orch = _make_orchestrator(provider)

    ctx = AgentContext("system")
    result = await orch.run_turn(
        session_id="S1",
        actor_id="A1",
        message="hello",
        provider_id="openai",
        api_key="k",
        model="gpt-4o-mini",
        tools_registry={},
        context=ctx,
        trace_repo=repo,
    )

    assert result.iterations == 1
    assert result.aborted is False
    assert result.abort_reason is None
    assert result.final_message == "All good."
    assert [t["kind"] for t in result.trace] == ["thought"]
    assert repo.appended[0]["final_message"] == "All good."
    assert repo.appended[0]["aborted"] is False


# ---------------------------------------------------------------------------
# Tool validation failure path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_tool_validation_failure_emits_structured_error_and_continues() -> None:
    """A ToolError from a tool should produce an is_error=true trace entry,
    and the next iteration must see the structured error in context."""

    raised: list[bool] = []

    async def flaky_get_circuit_state(args: BaseModel) -> dict[str, Any]:
        raised.append(True)
        raise ToolError(code="INVALID_PIN", details="pin 'Z' does not exist")

    # First response asks the tool; second response emits a final answer.
    first = LLMResponse(
        raw_content="thinking about it",
        tool_calls=[_tool_call("get_circuit_state", {"session_id": "S1"})],
        token_usage=0,
    )
    second = LLMResponse(raw_content="Acknowledged.", tool_calls=[], token_usage=0)
    provider = FakeProvider([first, second])
    repo = FakeTraceRepo()
    orch = _make_orchestrator(provider)

    ctx = AgentContext("system")
    result = await orch.run_turn(
        session_id="S1",
        actor_id="A1",
        message="check the circuit",
        provider_id="openai",
        api_key="k",
        model="m",
        tools_registry={"get_circuit_state": flaky_get_circuit_state},
        context=ctx,
        trace_repo=repo,
    )

    assert raised == [True]
    assert result.iterations == 2
    assert result.aborted is False
    assert result.final_message == "Acknowledged."

    # Trace must contain a tool_result with is_error=true and the structured
    # error shape from contracts.md.
    error_results = [
        e for e in result.trace if e.get("kind") == "tool_result" and e["is_error"]
    ]
    assert len(error_results) == 1
    err = error_results[0]
    assert err["tool"] == "get_circuit_state"
    assert err["result"]["error"] == "INVALID_PIN"
    assert err["result"]["tool"] == "get_circuit_state"
    assert "pin 'Z'" in err["result"]["details"]

    # The second LLM call must have seen the tool error fed back through the
    # context as a tool message.
    assert len(provider.calls) == 2
    second_messages = provider.calls[1].messages
    tool_msgs = [m for m in second_messages if m["role"] == "tool"]
    assert len(tool_msgs) == 1
    payload = json.loads(tool_msgs[0]["content"])
    assert payload["error"] == "INVALID_PIN"


@pytest.mark.asyncio
async def test_tool_args_validation_failure_emits_invalid_args_error() -> None:
    """If the model produces malformed args, the orchestrator catches
    Pydantic ValidationError and emits a structured INVALID_ARGS entry
    without invoking the tool."""

    invoked: list[Any] = []

    async def never_called(args: BaseModel) -> dict[str, Any]:
        invoked.append(args)
        return {}

    # Missing required ``session_id`` field for SimulateArgs.
    bad_call = _tool_call("simulate", {"ticks": 0})
    final = LLMResponse(raw_content="bye", tool_calls=[], token_usage=0)
    provider = FakeProvider(
        [
            LLMResponse(raw_content="trying", tool_calls=[bad_call], token_usage=0),
            final,
        ]
    )
    repo = FakeTraceRepo()
    orch = _make_orchestrator(provider)

    ctx = AgentContext("system")
    result = await orch.run_turn(
        session_id="S1",
        actor_id="A1",
        message="run it",
        provider_id="openai",
        api_key="k",
        model="m",
        tools_registry={"simulate": never_called},
        context=ctx,
        trace_repo=repo,
    )

    assert invoked == []
    err_results = [
        e for e in result.trace if e.get("kind") == "tool_result" and e["is_error"]
    ]
    assert len(err_results) == 1
    assert err_results[0]["result"]["error"] == "INVALID_ARGS"


# ---------------------------------------------------------------------------
# Hard caps
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_max_iterations_abort_when_provider_loops_on_tool_calls() -> None:
    """Provider always returns a tool call → after 6 iterations we abort."""

    async def echo_tool(args: BaseModel) -> dict[str, Any]:
        return {"ok": True}

    looping = LLMResponse(
        raw_content="thinking",
        tool_calls=[_tool_call("get_circuit_state", {"session_id": "S1"})],
        token_usage=0,
    )
    # Single response object reused across calls.
    provider = FakeProvider([looping])
    repo = FakeTraceRepo()
    orch = _make_orchestrator(provider, max_iterations=6)

    ctx = AgentContext("system")
    result = await orch.run_turn(
        session_id="S1",
        actor_id="A1",
        message="please",
        provider_id="openai",
        api_key="k",
        model="m",
        tools_registry={"get_circuit_state": echo_tool},
        context=ctx,
        trace_repo=repo,
    )

    assert result.aborted is True
    assert result.abort_reason == "max_iterations"
    assert result.final_message == ABORTED_MESSAGE
    assert result.iterations == 6
    assert len(provider.calls) == 6
    assert repo.appended[0]["abort_reason"] == "max_iterations"


@pytest.mark.asyncio
async def test_max_input_tokens_abort_when_message_history_overflows() -> None:
    """A system prompt above the cap (system can't be evicted) trips
    ``max_input_tokens`` after one iteration."""

    big_system = "S" * 8000  # ~2000 tokens, never evictable

    async def echo_tool(args: BaseModel) -> dict[str, Any]:
        return {"ok": True}

    looping = LLMResponse(
        raw_content="ok",
        tool_calls=[_tool_call("get_circuit_state", {"session_id": "S1"})],
        token_usage=0,
    )
    provider = FakeProvider([looping])
    repo = FakeTraceRepo()
    orch = _make_orchestrator(
        provider,
        max_iterations=6,
        max_input_tokens=100,
        max_output_tokens=10_000,
    )

    ctx = AgentContext(big_system)
    result = await orch.run_turn(
        session_id="S1",
        actor_id="A1",
        message="hi",
        provider_id="openai",
        api_key="k",
        model="m",
        tools_registry={"get_circuit_state": echo_tool},
        context=ctx,
        trace_repo=repo,
    )

    assert result.aborted is True
    assert result.abort_reason == "max_input_tokens"
    assert result.final_message == ABORTED_MESSAGE


@pytest.mark.asyncio
async def test_max_output_tokens_abort_when_response_overflows() -> None:
    big_text = "y" * 8000

    async def echo_tool(args: BaseModel) -> dict[str, Any]:
        return {"ok": True}

    looping = LLMResponse(
        raw_content=big_text,
        tool_calls=[_tool_call("get_circuit_state", {"session_id": "S1"})],
        token_usage=0,
    )
    provider = FakeProvider([looping])
    repo = FakeTraceRepo()
    orch = _make_orchestrator(
        provider,
        max_iterations=6,
        max_input_tokens=10_000_000,
        max_output_tokens=100,
    )

    ctx = AgentContext("system")
    result = await orch.run_turn(
        session_id="S1",
        actor_id="A1",
        message="ok",
        provider_id="openai",
        api_key="k",
        model="m",
        tools_registry={"get_circuit_state": echo_tool},
        context=ctx,
        trace_repo=repo,
    )

    assert result.aborted is True
    assert result.abort_reason == "max_output_tokens"
    assert result.final_message == ABORTED_MESSAGE


# ---------------------------------------------------------------------------
# Trace persistence handoff
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_trace_repo_receives_full_turn_record() -> None:
    """append_trace is called exactly once per turn with the full payload."""

    async def echo_tool(args: BaseModel) -> dict[str, Any]:
        return {"components": [], "wires": []}

    provider = FakeProvider(
        [
            LLMResponse(
                raw_content="t1",
                tool_calls=[_tool_call("get_circuit_state", {"session_id": "S1"})],
                token_usage=0,
            ),
            LLMResponse(raw_content="all set", tool_calls=[], token_usage=0),
        ]
    )
    repo = FakeTraceRepo()
    orch = _make_orchestrator(provider)

    ctx = AgentContext("system")
    await orch.run_turn(
        session_id="S1",
        actor_id="A1",
        message="hi",
        provider_id="openai",
        api_key="k",
        model="m",
        tools_registry={"get_circuit_state": echo_tool},
        context=ctx,
        trace_repo=repo,
    )

    assert len(repo.appended) == 1
    appended = repo.appended[0]
    assert appended["session_id"] == "S1"
    assert appended["actor_id"] == "A1"
    assert appended["aborted"] is False
    assert appended["abort_reason"] is None
    kinds = [t["kind"] for t in appended["trace"]]
    assert kinds == ["thought", "tool_call", "tool_result", "thought"]
