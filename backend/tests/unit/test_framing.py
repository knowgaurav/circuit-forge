"""Unit tests for circuit framing (in-course-ai-tutor R4)."""

from __future__ import annotations

from datetime import datetime

from app.models.circuit import CircuitState
from app.services.agent.framing import render_circuit_framing
from tests.factories import ComponentFactory, WireFactory


def _state(components, wires) -> CircuitState:
    return CircuitState(
        sessionId="X",
        version=0,
        components=components,
        wires=wires,
        annotations=[],
        updatedAt=datetime.utcnow(),
    )


def test_empty_board() -> None:
    assert render_circuit_framing(_state([], [])) == "Current board: empty."


def test_components_only_lists_labels_and_no_connections() -> None:
    and_gate = ComponentFactory.create_and_gate(id="and-1")
    and_gate.properties["label"] = "AND1"
    text = render_circuit_framing(_state([and_gate], []))

    assert "- AND1 (AND_2)" in text
    assert "Connections:" in text
    assert "- none" in text
    # The internal UUID-ish id must not leak when a label exists.
    assert "and-1" not in text


def test_full_board_renders_label_pin_connections() -> None:
    and_gate = ComponentFactory.create_and_gate(id="and-1")
    and_gate.properties["label"] = "AND1"
    led = ComponentFactory.create_led(id="led-1")
    led.properties["label"] = "LED1"
    wire = WireFactory.create("and-1", "Y", "led-1", "IN")

    text = render_circuit_framing(_state([and_gate, led], [wire]))

    assert "- AND1:Y -> LED1:IN" in text
    assert "and-1" not in text
    assert "led-1" not in text


def test_unlabelled_component_falls_back_to_id() -> None:
    and_gate = ComponentFactory.create_and_gate(id="and-1")
    text = render_circuit_framing(_state([and_gate], []))
    assert "- and-1 (AND_2)" in text
