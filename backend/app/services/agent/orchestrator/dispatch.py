"""Tool-call dispatch — argument validation, invocation, error shaping.

Each LLM-emitted ``tool_call`` flows through :func:`dispatch_tool_call`. The
function records both the ``tool_call`` and ``tool_result`` trace entries and
appends the same payloads to :class:`AgentContext` so the next iteration sees
them. Any failure produces a structured error result of the shape::

    {"error": <code>, "tool": <name>, "details": <details>}

Failure modes and their codes:

* **INVALID_JSON_ARGS** — the ``arguments`` string isn't valid JSON. The
  ``tool_call`` is recorded with empty args and the error result is appended
  in the same step (the model never saw structured args).
* **UNKNOWN_TOOL** — the tool name isn't in
  :data:`app.services.agent.schemas.TOOL_SCHEMAS`. ``tool_call`` is recorded
  with the parsed args, then the error result.
* **INVALID_ARGS** — the parsed args fail Pydantic validation against the
  tool's argument schema. ``details`` is the list returned by
  :meth:`pydantic.ValidationError.errors`.
* **TOOL_UNAVAILABLE** — the tool is registered in ``TOOL_SCHEMAS`` but the
  injected ``tools_registry`` doesn't carry an implementation.
* **<ToolError.code>** — the tool function raised
  :class:`app.services.agent.tools.ToolError`. ``details`` is the
  ``ToolError.details`` field.

The :class:`ToolError` import is lazy: the tools module ships in a parallel
lane and may be absent during isolated unit tests, so we fall back to a
local class with the same shape.
"""

from __future__ import annotations

import json
from collections.abc import Awaitable, Callable
from typing import Any

from pydantic import ValidationError

from app.services.agent.context import AgentContext
from app.services.agent.schemas import TOOL_SCHEMAS

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


async def dispatch_tool_call(
    tool_call: dict[str, Any],
    tools_registry: dict[str, ToolFn],
    trace: list[dict[str, Any]],
    context: AgentContext,
) -> None:
    """Validate, run, and record one ``tool_call`` from the LLM."""
    func = tool_call.get("function", {})
    tool_name = func.get("name", "")
    raw_args = func.get("arguments", "{}")
    tool_call_id = tool_call.get("id", f"call-{tool_name}-{len(trace)}")

    try:
        parsed_args = (
            json.loads(raw_args) if isinstance(raw_args, str) else dict(raw_args)
        )
    except json.JSONDecodeError as exc:
        _record_tool_error(
            tool_call_id, tool_name, {}, "INVALID_JSON_ARGS", str(exc), trace, context
        )
        return

    trace.append({"kind": "tool_call", "tool": tool_name, "args": parsed_args})

    schema_pair = TOOL_SCHEMAS.get(tool_name)
    if schema_pair is None:
        _record_tool_error_after_call(
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
        _record_tool_error_after_call(
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
        _record_tool_error_after_call(
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
        _record_tool_error_after_call(
            tool_call_id, tool_name, te.code, te.details, trace, context
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
