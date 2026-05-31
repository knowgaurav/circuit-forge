"""Course-aware system prompt builder for the in-course tutor.

The generic ``/agent/turn`` system prompt knows nothing about the lesson the
learner is on. The tutor needs more: it should ground the model in (a) the
harness mechanics (it can *see* the board and *edit* it via tools), (b) the
*specific* lesson goals and pitfalls, and (c) the exact tool surface it may
use this step. ``build_tutor_system_prompt`` assembles those three things plus
behavioral rules into one deterministic string, rebuilt each turn so it always
reflects the learner's current tab.

``LevelContext`` is the bounded projection of ``LevelContent`` the prompt
needs — kept small so the system prompt never crowds the input-token budget.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from app.services.agent.tool_selection import select_tools
from app.services.component_registry import ComponentRegistry

Mode = Literal["theory", "practical"]


@dataclass
class LevelContext:
    """The lesson fields the tutor prompt draws on."""

    title: str
    objectives: list[str]
    expected_behavior: str
    components_needed: list[str]
    build_steps: list[str]
    common_mistakes: list[str] = field(default_factory=list)


# One-line purpose per tool, shown to the model so it picks the right call.
_TOOL_PURPOSE: dict[str, str] = {
    "get_circuit_state": "list the components and wires currently on the board",
    "simulate": "evaluate the circuit (and advance clocks) to read pin/wire signals",
    "validate_circuit": "find floating inputs, output conflicts, and combinational cycles",
    "explain_signal_path": "trace the signal path between two components",
    "add_component": "place a new component on the board",
    "remove_component": "delete a component (and its wires)",
    "add_wire": "connect an output pin to an input pin (by label and pin name)",
    "remove_wire": "delete a wrong connection by wire id",
    "move_component": "reposition a component on the board",
}


def _bullets(items: list[str]) -> str:
    return "\n".join(f"- {item}" for item in items)


def _numbered(items: list[str]) -> str:
    return "\n".join(f"{i}. {item}" for i, item in enumerate(items, start=1))


def _tool_lines(mode: Mode) -> str:
    names = sorted(select_tools(mode))
    return "\n".join(f"- {name}: {_TOOL_PURPOSE[name]}" for name in names)


def build_tutor_system_prompt(level: LevelContext, mode: Mode) -> str:
    """Assemble the tutor system prompt for ``level`` on the given ``mode``."""
    parts: list[str] = []

    # (1) Role + harness description.
    parts.append(
        "You are CircuitForge's in-course tutor. You help a learner who is "
        "building a circuit on an interactive board. The board's current "
        "contents are described to you in each message. You can answer "
        "questions about the lesson and the circuit, and you can change the "
        "board by calling tools. Make the smallest sequence of tool calls "
        "needed, then reply in plain language."
    )

    # (2) Level framing.
    parts.append(f"Lesson: {level.title}")
    parts.append("Objectives:\n" + _bullets(level.objectives))
    if mode == "practical":
        parts.append("Components needed:\n" + _bullets(level.components_needed))
        parts.append("Build steps:\n" + _numbered(level.build_steps))
        parts.append(f"Expected behavior: {level.expected_behavior}")
        if level.common_mistakes:
            parts.append(
                "Common mistakes to watch for:\n" + _bullets(level.common_mistakes)
            )

    # (3) Tools available in this mode.
    parts.append("Tools available now:\n" + _tool_lines(mode))

    # (4) Behavioral rules.
    parts.append(
        "Rules: Use only component types and pin names that the tools and the "
        "board description provide — never invent them. Address pins by "
        "component label and pin name. Prefer the smallest sequence of tool "
        "calls. If the board already matches what the user wants, explain "
        "instead of editing."
    )

    return "\n\n".join(parts)


def _component_catalog(registry: ComponentRegistry) -> str:
    """Render a compact `TYPE (pins: A, B -> Y)` catalog grouped by category.

    The playground has no lesson plan, so the model learns the legal component
    types and pin names from the registry itself. Pins are split into inputs
    and outputs so the model knows which side each one wires to.
    """
    lines: list[str] = []
    for category, comps in registry.get_all_components().items():
        lines.append(f"{category}:")
        for comp in comps:
            inputs = [p.name for p in comp.pins if p.type == "input"]
            outputs = [p.name for p in comp.pins if p.type == "output"]
            pin_desc = f"in: {', '.join(inputs) or 'none'}; out: {', '.join(outputs) or 'none'}"
            lines.append(f"- {comp.type} ({comp.name}) [{pin_desc}]")
    return "\n".join(lines)


def build_playground_system_prompt(registry: ComponentRegistry) -> str:
    """Assemble the system prompt for the free-practice playground assistant.

    Unlike the course tutor, the playground has no lesson context. The model
    gets the full component catalog from the registry and the full tool set,
    and is told to build whatever circuit the user describes.
    """
    parts: list[str] = []

    parts.append(
        "You are CircuitForge's playground assistant. You help a user build "
        "and debug digital logic circuits on an interactive board. The "
        "board's current contents are described to you in each message. You "
        "can answer questions and change the board by calling tools. Make the "
        "smallest sequence of tool calls needed to fulfill the request, then "
        "reply in plain language describing what you did."
    )

    parts.append("Available component types:\n" + _component_catalog(registry))

    parts.append(
        "When building a circuit from scratch, place input devices (switches, "
        "clocks) on the left, logic in the middle, and output devices (LEDs) "
        "on the right, spacing components about 120px apart so wires stay "
        "readable. Give each component a short, unique label (e.g. SW1, AND1, "
        "LED1) and wire pins by label and pin name."
    )

    parts.append(
        "Rules: Use only component types and pin names from the catalog and "
        "the board description — never invent them. Address pins by component "
        "label and pin name. Prefer the smallest sequence of tool calls. If "
        "the board already matches what the user wants, explain instead of "
        "editing."
    )

    return "\n\n".join(parts)
