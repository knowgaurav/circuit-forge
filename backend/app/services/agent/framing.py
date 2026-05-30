"""Render a circuit into compact text — the tutor's "eyes" on the board.

The LLM cannot see the canvas, so each turn we describe the learner's current
board in plain text and attach it to the user message. The rendering uses
**component labels and pin names** (never internal UUIDs), so the wire-tool
arguments the model produces line up exactly with what it was shown.

Example output::

    Current board:
    - SWA (SWITCH_TOGGLE)
    - AND1 (AND_2)
    - LED1 (LED_RED)
    Connections:
    - SWA:OUT -> AND1:A
    - AND1:Y -> LED1:IN

A component with no label falls back to its id so the board is still legible.
"""

from __future__ import annotations

from app.models.circuit import CircuitState


def _label_of(component) -> str:
    return component.properties.get("label") or component.id


def render_circuit_framing(circuit: CircuitState) -> str:
    """Return a compact, deterministic, label-based view of ``circuit``."""
    if not circuit.components:
        return "Current board: empty."

    label_by_id = {c.id: _label_of(c) for c in circuit.components}
    pin_name_by_id: dict[tuple[str, str], str] = {}
    for component in circuit.components:
        for pin in component.pins:
            pin_name_by_id[(component.id, pin.id)] = pin.name

    lines = ["Current board:"]
    for component in circuit.components:
        lines.append(f"- {label_by_id[component.id]} ({component.type.value})")

    lines.append("Connections:")
    if not circuit.wires:
        lines.append("- none")
    else:
        for wire in circuit.wires:
            src_label = label_by_id.get(wire.from_component_id, wire.from_component_id)
            dst_label = label_by_id.get(wire.to_component_id, wire.to_component_id)
            src_pin = pin_name_by_id.get(
                (wire.from_component_id, wire.from_pin_id), wire.from_pin_id
            )
            dst_pin = pin_name_by_id.get(
                (wire.to_component_id, wire.to_pin_id), wire.to_pin_id
            )
            lines.append(f"- {src_label}:{src_pin} -> {dst_label}:{dst_pin}")

    return "\n".join(lines)
