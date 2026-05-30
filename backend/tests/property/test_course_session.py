"""Property tests for the tutor state bridge & context (PBT-1, PBT-5).

PBT-1 — Seed/snapshot round-trip. Seeding a client snapshot into an ephemeral
session and reading it back must yield a board that *frames identically*:
same labelled components and same label:pin connection set.

PBT-5 — Context windowing. The existing ``AgentContext`` sliding window must
always keep the system prompt as ``messages[0]`` and never exceed the budget
when at least the system prompt fits.
"""

from __future__ import annotations

from datetime import datetime

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from app.models.circuit import CircuitState
from app.services.agent.context import AgentContext
from app.services.agent.course_session import seed_session
from app.services.agent.framing import render_circuit_framing
from app.services.circuit_service import CircuitService
from tests.factories import ComponentFactory, WireFactory
from tests.unit.test_agent_tools import _FakeDatabase


# ---------------------------------------------------------------------------
# PBT-1 — seed / framing round-trip
# ---------------------------------------------------------------------------

_GATE_FACTORIES = [
    ComponentFactory.create_and_gate,
    ComponentFactory.create_or_gate,
    ComponentFactory.create_nand_gate,
    ComponentFactory.create_xor_gate,
]


@st.composite
def _simple_circuits(draw) -> CircuitState:
    """A switch -> 2-input gate -> LED chain with both gate inputs driven.

    Acyclic and connection-valid by construction (single driver per input,
    output->input direction), so ``seed_session`` never rejects a wire.
    """
    gate_factory = draw(st.sampled_from(_GATE_FACTORIES))
    n_gates = draw(st.integers(min_value=1, max_value=3))

    components = []
    wires = []
    for i in range(n_gates):
        sw_a = ComponentFactory.create_switch(id=f"swa-{i}", state=draw(st.booleans()))
        sw_a.properties["label"] = f"SWA{i}"
        sw_b = ComponentFactory.create_switch(id=f"swb-{i}", state=draw(st.booleans()))
        sw_b.properties["label"] = f"SWB{i}"
        gate = gate_factory(id=f"g-{i}")
        gate.properties["label"] = f"G{i}"
        led = ComponentFactory.create_led(id=f"led-{i}")
        led.properties["label"] = f"LED{i}"
        components.extend([sw_a, sw_b, gate, led])
        wires.extend(
            [
                WireFactory.create(f"swa-{i}", "OUT", f"g-{i}", "A"),
                WireFactory.create(f"swb-{i}", "OUT", f"g-{i}", "B"),
                WireFactory.create(f"g-{i}", "Y", f"led-{i}", "IN"),
            ]
        )

    return CircuitState(
        sessionId="CLIENT",
        version=0,
        components=components,
        wires=wires,
        annotations=[],
        updatedAt=datetime.utcnow(),
    )


@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(circuit=_simple_circuits())
@pytest.mark.asyncio
async def test_seed_preserves_framing(circuit: CircuitState) -> None:
    circuit_service = CircuitService(_FakeDatabase())
    session_id = await seed_session(circuit_service, circuit)
    seeded = await circuit_service.get_circuit_state(session_id)

    assert render_circuit_framing(seeded) == render_circuit_framing(circuit)


# ---------------------------------------------------------------------------
# PBT-5 — context windowing
# ---------------------------------------------------------------------------


@settings(max_examples=100, deadline=None)
@given(
    system=st.text(min_size=1, max_size=200),
    turns=st.lists(st.text(min_size=1, max_size=400), min_size=1, max_size=12),
    budget=st.integers(min_value=50, max_value=4000),
)
def test_context_window_keeps_system_and_respects_budget(
    system: str, turns: list[str], budget: int
) -> None:
    ctx = AgentContext(system)
    for text in turns:
        ctx.add_user(text)

    messages = ctx.messages_for_llm(budget)

    # System prompt is always retained as the first message.
    assert messages[0]["role"] == "system"
    assert messages[0]["content"] == system

    # When the system prompt alone fits the budget, the result fits too.
    system_tokens = len(system) // 4
    if system_tokens <= budget:
        total = sum(len(m["content"]) // 4 for m in messages)
        assert total <= budget
