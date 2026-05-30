"""Agent tools package — one module per tool, plus shared helpers.

Public surface (imported by the orchestrator, the API layer, and tests):

- :data:`TOOLS` — registry mapping tool name → async callable.
- :class:`ToolDeps` — dependency bag passed into every tool.
- :class:`ToolError` — structured failure type.
- :data:`ToolFn` — the async callable shape every tool follows.
- The nine tool functions: :func:`get_circuit_state`, :func:`simulate`,
  :func:`add_component`, :func:`remove_component`, :func:`validate_circuit`,
  :func:`explain_signal_path`, :func:`add_wire`, :func:`remove_wire`,
  :func:`move_component`.

The contract for these names lives in
``.kiro/specs/system-design-improvement/contracts.md`` (Story B — Agent
surface). This module only re-exports; behavior is in the per-tool files.
"""

from __future__ import annotations

from .add_component import add_component
from .add_wire import add_wire
from .explain_signal_path import explain_signal_path
from .get_circuit_state import get_circuit_state
from .move_component import move_component
from .remove_component import remove_component
from .remove_wire import remove_wire
from .simulate import simulate
from .validate_circuit import validate_circuit
from ._types import ToolDeps, ToolError, ToolFn


TOOLS: dict[str, ToolFn] = {
    "get_circuit_state": get_circuit_state,
    "simulate": simulate,
    "add_component": add_component,
    "remove_component": remove_component,
    "validate_circuit": validate_circuit,
    "explain_signal_path": explain_signal_path,
    "add_wire": add_wire,
    "remove_wire": remove_wire,
    "move_component": move_component,
}


__all__ = [
    "TOOLS",
    "ToolDeps",
    "ToolError",
    "ToolFn",
    "add_component",
    "add_wire",
    "explain_signal_path",
    "get_circuit_state",
    "move_component",
    "remove_component",
    "remove_wire",
    "simulate",
    "validate_circuit",
]
