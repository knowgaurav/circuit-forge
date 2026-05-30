"""Unit tests for the ``_resolve_pin`` helper (in-course-ai-tutor R1).

``_resolve_pin`` maps a component label + pin name + expected direction onto
the ``(component_id, pin_id)`` pair the wire tools need. Labels live in
``properties["label"]`` (the tutor seeds them there). The tests cover the
happy path plus every documented failure: unknown label, unknown pin name,
and a direction mismatch.
"""

from __future__ import annotations

import pytest

from app.models.circuit import PinType
from app.services.agent.tools import ToolError
from app.services.agent.tools._helpers import _resolve_pin
from tests.factories import ComponentFactory


def _labelled(component, label: str):
    component.properties["label"] = label
    return component


def test_resolve_pin_returns_component_and_pin_ids() -> None:
    and_gate = _labelled(ComponentFactory.create_and_gate(id="and-1"), "AND1")

    comp_id, pin_id = _resolve_pin([and_gate], "AND1", "Y", PinType.OUTPUT)

    assert comp_id == "and-1"
    assert pin_id == "Y"


def test_resolve_pin_resolves_input_pin() -> None:
    and_gate = _labelled(ComponentFactory.create_and_gate(id="and-1"), "AND1")

    comp_id, pin_id = _resolve_pin([and_gate], "AND1", "A", PinType.INPUT)

    assert (comp_id, pin_id) == ("and-1", "A")


def test_resolve_pin_unknown_label_raises() -> None:
    and_gate = _labelled(ComponentFactory.create_and_gate(id="and-1"), "AND1")

    with pytest.raises(ToolError) as exc:
        _resolve_pin([and_gate], "NOPE", "Y", PinType.OUTPUT)

    assert exc.value.code == "COMPONENT_NOT_FOUND"


def test_resolve_pin_unknown_pin_raises() -> None:
    and_gate = _labelled(ComponentFactory.create_and_gate(id="and-1"), "AND1")

    with pytest.raises(ToolError) as exc:
        _resolve_pin([and_gate], "AND1", "Z", PinType.OUTPUT)

    assert exc.value.code == "INVALID_PIN"


def test_resolve_pin_direction_mismatch_raises() -> None:
    # "Y" exists but is an OUTPUT; asking for it as an INPUT must fail.
    and_gate = _labelled(ComponentFactory.create_and_gate(id="and-1"), "AND1")

    with pytest.raises(ToolError) as exc:
        _resolve_pin([and_gate], "AND1", "Y", PinType.INPUT)

    assert exc.value.code == "INVALID_PIN"
