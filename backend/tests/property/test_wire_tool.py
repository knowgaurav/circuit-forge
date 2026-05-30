"""Property tests for the add_wire tool invariants (in-course-ai-tutor PBT-2).

For a seeded board and a random ``add_wire`` call addressed by label + pin:

* The call either raises a ``ToolError`` with one of the documented codes, or
* it succeeds — in which case the resolved source pin is an OUTPUT, the
  target pin is an INPUT, and the target input gains no second driver.

The board has stable labels and pin names so the strategy can mix valid and
invalid label/pin references and exercise every failure path.
"""

from __future__ import annotations

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from app.models.circuit import PinType
from app.services.agent.schemas import AddWireArgs
from app.services.agent.tools import ToolDeps, ToolError, add_wire
from app.services.circuit_service import CircuitService
from app.services.component_registry import ComponentRegistry
from app.services.simulation_engine import SimulationEngine
from tests.factories import ComponentFactory, WireFactory
from tests.unit.test_agent_tools import _FakeDatabase

SESSION_ID = "WIREPT"
ACTOR_ID = "tutor-agent"

_DOCUMENTED_CODES = {
    "COMPONENT_NOT_FOUND",
    "INVALID_PIN",
    "INVALID_WIRE_DIRECTION",
    "INPUT_ALREADY_CONNECTED",
    "DUPLICATE_WIRE",
    "INVALID_WIRE",
}

# Labels the board defines, plus a bogus one, and a pin pool mixing
# real inputs/outputs with a nonexistent pin.
_LABELS = ["SWA", "SWB", "AND1", "LED1", "GHOST"]
_PINS = ["OUT", "A", "B", "Y", "IN", "ZZZ"]


async def _seed_board(circuit_service: CircuitService) -> None:
    """SWA, SWB (outputs), AND1 (A,B in / Y out), LED1 (IN)."""
    sw_a = ComponentFactory.create_switch(id="sw-a", state=True)
    sw_a.properties["label"] = "SWA"
    sw_b = ComponentFactory.create_switch(id="sw-b", state=True)
    sw_b.properties["label"] = "SWB"
    and_gate = ComponentFactory.create_and_gate(id="and-1")
    and_gate.properties["label"] = "AND1"
    led = ComponentFactory.create_led(id="led-1")
    led.properties["label"] = "LED1"
    for comp in (sw_a, sw_b, and_gate, led):
        await circuit_service.add_component(SESSION_ID, ACTOR_ID, comp)
    # Pre-wire SWA -> AND1.A so INPUT_ALREADY_CONNECTED / DUPLICATE paths exist.
    await circuit_service.add_wire(
        SESSION_ID, ACTOR_ID, WireFactory.create("sw-a", "OUT", "and-1", "A")
    )


def _pin_lookup(components, label: str, pin_name: str):
    comp = next((c for c in components if c.properties.get("label") == label), None)
    if comp is None:
        return None
    return next((p for p in comp.pins if p.name == pin_name), None)


@settings(max_examples=200, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(
    from_label=st.sampled_from(_LABELS),
    from_pin=st.sampled_from(_PINS),
    to_label=st.sampled_from(_LABELS),
    to_pin=st.sampled_from(_PINS),
)
@pytest.mark.asyncio
async def test_add_wire_either_errors_or_respects_invariants(
    from_label: str, from_pin: str, to_label: str, to_pin: str
) -> None:
    circuit_service = CircuitService(_FakeDatabase())
    await _seed_board(circuit_service)
    deps = ToolDeps(
        circuit_service=circuit_service,
        simulation_engine_factory=SimulationEngine,
        component_registry=ComponentRegistry(),
    )

    args = AddWireArgs(
        session_id=SESSION_ID,
        actor_id=ACTOR_ID,
        from_label=from_label,
        from_pin=from_pin,
        to_label=to_label,
        to_pin=to_pin,
    )

    try:
        result = await add_wire(args, deps=deps)
    except ToolError as exc:
        assert exc.code in _DOCUMENTED_CODES
        return

    # Success path: verify the invariants held.
    state = await circuit_service.get_circuit_state(SESSION_ID)
    src_pin = _pin_lookup(state.components, from_label, from_pin)
    dst_pin = _pin_lookup(state.components, to_label, to_pin)
    assert src_pin is not None and src_pin.type == PinType.OUTPUT
    assert dst_pin is not None and dst_pin.type == PinType.INPUT

    created = next(w for w in state.wires if w.id == result.wire_id)
    drivers = [
        w
        for w in state.wires
        if w.to_component_id == created.to_component_id
        and w.to_pin_id == created.to_pin_id
    ]
    assert len(drivers) == 1
