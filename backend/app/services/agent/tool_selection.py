"""Mode-based tool selection for the in-course tutor.

The tutor scopes which tools the LLM may call to the learner's current lesson
step. On the **theory** tab the learner is reading, not building, so only
read-only tools are offered — this both shrinks the prompt's tool footprint
and prevents accidental edits. On the **practical** tab the learner is
building, so the full set (read-only + mutation) is offered.

``select_tools`` returns a subset of :data:`app.services.agent.schemas.TOOL_SCHEMAS`
keys, which the orchestrator's ``run_turn(..., allowed_tools=...)`` uses to
filter the tool surface sent to the provider.
"""

from __future__ import annotations

from typing import Literal

from app.services.agent.schemas import TOOL_SCHEMAS

Mode = Literal["theory", "practical"]

_READ_ONLY: set[str] = {
    "get_circuit_state",
    "simulate",
    "validate_circuit",
    "explain_signal_path",
}

_MUTATION: set[str] = {
    "add_component",
    "remove_component",
    "add_wire",
    "remove_wire",
    "move_component",
}


def select_tools(mode: Mode) -> set[str]:
    """Return the tool names the LLM may call in the given lesson ``mode``.

    - ``theory`` → read-only tools only.
    - ``practical`` → read-only + mutation tools.

    The result is always a subset of ``TOOL_SCHEMAS`` keys.
    """
    tools = _READ_ONLY if mode == "theory" else _READ_ONLY | _MUTATION
    return tools & set(TOOL_SCHEMAS)
