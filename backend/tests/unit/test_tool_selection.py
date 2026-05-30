"""Unit tests for mode-based tool selection (in-course-ai-tutor R4)."""

from __future__ import annotations

from app.services.agent.schemas import TOOL_SCHEMAS
from app.services.agent.tool_selection import select_tools

_MUTATION = {
    "add_component",
    "remove_component",
    "add_wire",
    "remove_wire",
    "move_component",
}


def test_theory_mode_is_read_only() -> None:
    tools = select_tools("theory")
    assert tools == {
        "get_circuit_state",
        "simulate",
        "validate_circuit",
        "explain_signal_path",
    }
    assert tools & _MUTATION == set()


def test_practical_mode_is_full_set() -> None:
    tools = select_tools("practical")
    assert tools == set(TOOL_SCHEMAS)
    assert _MUTATION.issubset(tools)


def test_selected_tools_are_always_known() -> None:
    for mode in ("theory", "practical"):
        assert select_tools(mode).issubset(set(TOOL_SCHEMAS))
