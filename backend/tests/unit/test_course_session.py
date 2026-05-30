"""Unit tests for the ephemeral course session bridge (in-course-ai-tutor R3).

Uses the same in-memory MongoDB fake as ``test_agent_tools.py`` so the real
``CircuitService`` / ``EventRepository`` paths run without a live database.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from app.repositories.event_repository import EventRepository
from app.services.agent.course_session import (
    CLIENT_APPLICABLE_TYPES,
    collect_mutations,
    discard_session,
    seed_session,
)
from app.services.circuit_service import CircuitService
from tests.factories import ComponentFactory, WireFactory
from tests.unit.test_agent_tools import _FakeDatabase

from app.models.circuit import CircuitState


def _labelled_circuit() -> CircuitState:
    and_gate = ComponentFactory.create_and_gate(id="and-1")
    and_gate.properties["label"] = "AND1"
    led = ComponentFactory.create_led(id="led-1")
    led.properties["label"] = "LED1"
    sw_a = ComponentFactory.create_switch(id="sw-a", state=True)
    sw_a.properties["label"] = "SWA"
    sw_b = ComponentFactory.create_switch(id="sw-b", state=True)
    sw_b.properties["label"] = "SWB"
    wires = [
        WireFactory.create("sw-a", "OUT", "and-1", "A"),
        WireFactory.create("sw-b", "OUT", "and-1", "B"),
        WireFactory.create("and-1", "Y", "led-1", "IN"),
    ]
    return CircuitState(
        sessionId="CLIENT",
        version=0,
        components=[sw_a, sw_b, and_gate, led],
        wires=wires,
        annotations=[],
        updatedAt=datetime.utcnow(),
    )


@pytest.mark.asyncio
async def test_seed_session_round_trips_components_and_wires() -> None:
    db = _FakeDatabase()
    circuit_service = CircuitService(db)
    circuit = _labelled_circuit()

    session_id = await seed_session(circuit_service, circuit)

    assert session_id.startswith("tutor-")
    state = await circuit_service.get_circuit_state(session_id)
    assert {c.id for c in state.components} == {"sw-a", "sw-b", "and-1", "led-1"}
    assert {c.properties.get("label") for c in state.components} == {
        "SWA",
        "SWB",
        "AND1",
        "LED1",
    }
    # Connection set preserved (by component/pin endpoints).
    conns = {
        (w.from_component_id, w.from_pin_id, w.to_component_id, w.to_pin_id)
        for w in state.wires
    }
    assert conns == {
        ("sw-a", "OUT", "and-1", "A"),
        ("sw-b", "OUT", "and-1", "B"),
        ("and-1", "Y", "led-1", "IN"),
    }


@pytest.mark.asyncio
async def test_discard_session_removes_all_events() -> None:
    db = _FakeDatabase()
    circuit_service = CircuitService(db)
    event_repo = EventRepository(db)
    session_id = await seed_session(circuit_service, _labelled_circuit())
    assert await event_repo.get_latest_seq(session_id) > 0

    await discard_session(circuit_service, event_repo, session_id)

    assert await event_repo.get_latest_seq(session_id) == 0
    assert await event_repo.count_events(session_id) == 0


def test_collect_mutations_keeps_only_applicable_types() -> None:
    events = [
        {"type": "COMPONENT_ADDED", "payload": {"component": {"id": "x"}}},
        {"type": "WIRE_ADDED", "payload": {"wire": {"id": "w"}}},
        {"type": "ANNOTATION_ADDED", "payload": {"annotation": {"id": "a"}}},
        {"type": "WIRE_DELETED", "payload": {"wireId": "w"}},
    ]

    mutations = collect_mutations(events)

    assert [m.type for m in mutations] == [
        "COMPONENT_ADDED",
        "WIRE_ADDED",
        "WIRE_DELETED",
    ]
    assert all(m.type in CLIENT_APPLICABLE_TYPES for m in mutations)
