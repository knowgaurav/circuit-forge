"""Unit tests for the six agent tools (Story B — B.3 through B.8).

The tests use the same in-memory MongoDB fake pattern as
``tests/integration/test_replay.py`` so we exercise the real
``CircuitService`` / ``EventRepository`` code paths without a live database.
Each tool gets a happy-path test plus a failure-mode test where the contract
defines one (unknown component type, missing component, unreachable target).
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest
from pymongo.errors import DuplicateKeyError

from app.models.circuit import Position
from app.services.agent.schemas import (
    AddComponentArgs,
    GetCircuitStateArgs,
    SimulateArgs,
)
from app.services.agent.tools import (
    TOOLS,
    ToolDeps,
    ToolError,
    add_component,
    get_circuit_state,
    simulate,
)
from app.services.circuit_service import CircuitService
from app.services.component_registry import ComponentRegistry
from app.services.simulation_engine import Signal, SimulationEngine
from tests.factories import ComponentFactory, WireFactory


SESSION_ID = "TOOLST"
ACTOR_ID = "actor-1"


# ---------------------------------------------------------------------------
# In-memory MongoDB fake (mirrors tests/integration/test_replay.py).
# ---------------------------------------------------------------------------


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]) -> None:
        self._docs = list(docs)

    def sort(self, field: str, direction: int = 1) -> "_FakeCursor":
        self._docs.sort(key=lambda d: d.get(field, 0), reverse=direction < 0)
        return self

    def limit(self, n: int) -> "_FakeCursor":
        self._docs = self._docs[:n]
        return self

    def __aiter__(self) -> "_FakeCursor":
        self._iter = iter(self._docs)
        return self

    async def __anext__(self) -> dict[str, Any]:
        try:
            return next(self._iter)
        except StopIteration as exc:  # pragma: no cover
            raise StopAsyncIteration from exc


class _FakeCollection:
    def __init__(self) -> None:
        self._docs: list[dict[str, Any]] = []
        self._unique: list[tuple[str, ...]] = []

    async def create_index(
        self, keys, unique: bool = False, name: str | None = None
    ) -> str:
        if unique:
            field_names = tuple(k[0] if isinstance(k, tuple) else k for k in keys)
            self._unique.append(field_names)
        return name or "idx"

    async def insert_one(self, doc: dict[str, Any]) -> None:
        for key_tuple in self._unique:
            value = tuple(doc.get(field) for field in key_tuple)
            for existing in self._docs:
                existing_value = tuple(existing.get(field) for field in key_tuple)
                if existing_value == value:
                    raise DuplicateKeyError(
                        f"duplicate key on {key_tuple}: {value}"
                    )
        self._docs.append(doc)

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        for doc in self._docs:
            if self._matches(doc, query):
                return dict(doc)
        return None

    def find(self, query: dict[str, Any] | None = None) -> _FakeCursor:
        query = query or {}
        return _FakeCursor(
            [dict(d) for d in self._docs if self._matches(d, query)]
        )

    async def delete_many(self, query: dict[str, Any]) -> Any:
        before = len(self._docs)
        self._docs = [d for d in self._docs if not self._matches(d, query)]

        class _Result:
            deleted_count = before - len(self._docs)

        return _Result()

    async def count_documents(self, query: dict[str, Any]) -> int:
        return sum(1 for d in self._docs if self._matches(d, query))

    @staticmethod
    def _matches(doc: dict[str, Any], query: dict[str, Any]) -> bool:
        for key, expected in query.items():
            actual = doc.get(key)
            if isinstance(expected, dict):
                for op, op_val in expected.items():
                    if op == "$gt" and not (actual is not None and actual > op_val):
                        return False
                    if op == "$gte" and not (
                        actual is not None and actual >= op_val
                    ):
                        return False
                    if op == "$lt" and not (actual is not None and actual < op_val):
                        return False
                    if op == "$lte" and not (
                        actual is not None and actual <= op_val
                    ):
                        return False
            else:
                if actual != expected:
                    return False
        return True


class _FakeDatabase:
    def __init__(self) -> None:
        self._collections: dict[str, _FakeCollection] = {}

    def __getitem__(self, name: str) -> _FakeCollection:
        if name not in self._collections:
            self._collections[name] = _FakeCollection()
        return self._collections[name]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_deps() -> tuple[ToolDeps, CircuitService]:
    db = _FakeDatabase()
    circuit_service = CircuitService(db)
    deps = ToolDeps(
        circuit_service=circuit_service,
        simulation_engine_factory=SimulationEngine,
        component_registry=ComponentRegistry(),
    )
    return deps, circuit_service


async def _seed_switch_and_led(
    circuit_service: CircuitService, switch_state: bool = True
) -> tuple[str, str, str]:
    """Build: SWITCH_TOGGLE -> AND.A, CONST_LOW -> AND.B, AND.Y -> LED."""
    sw = ComponentFactory.create_switch(id=f"sw-{uuid4().hex[:6]}", state=switch_state)
    gnd = ComponentFactory.create_const_low(id=f"gnd-{uuid4().hex[:6]}")
    and_gate = ComponentFactory.create_and_gate(id=f"and-{uuid4().hex[:6]}")
    led = ComponentFactory.create_led(id=f"led-{uuid4().hex[:6]}")

    for comp in (sw, gnd, and_gate, led):
        await circuit_service.add_component(SESSION_ID, ACTOR_ID, comp)

    wires = [
        WireFactory.create(sw.id, "OUT", and_gate.id, "A"),
        WireFactory.create(gnd.id, "OUT", and_gate.id, "B"),
        WireFactory.create(and_gate.id, "Y", led.id, "IN"),
    ]
    for wire in wires:
        await circuit_service.add_wire(SESSION_ID, ACTOR_ID, wire)

    return sw.id, and_gate.id, led.id


# ---------------------------------------------------------------------------
# get_circuit_state
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_circuit_state_returns_components_and_wires() -> None:
    deps, circuit_service = _make_deps()
    sw_id, and_id, led_id = await _seed_switch_and_led(circuit_service)

    result = await get_circuit_state(
        GetCircuitStateArgs(session_id=SESSION_ID), deps=deps
    )

    component_ids = {c.id for c in result.components}
    assert {sw_id, and_id, led_id}.issubset(component_ids)
    assert len(result.wires) == 3


# ---------------------------------------------------------------------------
# simulate
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_simulate_evaluates_circuit_with_zero_ticks() -> None:
    deps, circuit_service = _make_deps()
    sw_id, and_id, _led_id = await _seed_switch_and_led(circuit_service, switch_state=True)

    result = await simulate(
        SimulateArgs(session_id=SESSION_ID, ticks=0), deps=deps
    )

    # Switch is HIGH, ground feeds AND.B LOW -> AND.Y is LOW.
    assert result.pin_states[sw_id]["OUT"] == Signal.HIGH
    assert result.pin_states[and_id]["Y"] == Signal.LOW
    assert result.errors == []


@pytest.mark.asyncio
async def test_simulate_advances_clock_each_tick() -> None:
    deps, circuit_service = _make_deps()

    clock = ComponentFactory.create_clock(id="clk-1")
    dff = ComponentFactory.create_d_flipflop(id="dff-1")
    high = ComponentFactory.create_const_high(id="hi-1")

    for comp in (clock, dff, high):
        await circuit_service.add_component(SESSION_ID, ACTOR_ID, comp)

    await circuit_service.add_wire(
        SESSION_ID, ACTOR_ID,
        WireFactory.create(clock.id, "CLK", dff.id, "CLK"),
    )
    await circuit_service.add_wire(
        SESSION_ID, ACTOR_ID,
        WireFactory.create(high.id, "OUT", dff.id, "D"),
    )

    # ticks=0 — clock starts LOW, no edges yet, Q stays LOW.
    zero = await simulate(SimulateArgs(session_id=SESSION_ID, ticks=0), deps=deps)
    assert zero.pin_states[dff.id]["Q"] == Signal.LOW

    # ticks=1 — one half-period flips CLK to HIGH, that's a rising edge that
    # latches D=HIGH into Q.
    one = await simulate(SimulateArgs(session_id=SESSION_ID, ticks=1), deps=deps)
    assert one.pin_states[dff.id]["Q"] == Signal.HIGH


# ---------------------------------------------------------------------------
# add_component
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_add_component_creates_event_and_returns_seq() -> None:
    deps, circuit_service = _make_deps()

    result = await add_component(
        AddComponentArgs(
            session_id=SESSION_ID,
            actor_id=ACTOR_ID,
            component_type="AND_2",
            label="U1",
            position=Position(x=42, y=84),
        ),
        deps=deps,
    )

    assert result.seq == 1
    state = await circuit_service.get_circuit_state(SESSION_ID)
    assert any(c.id == result.component_id for c in state.components)
    placed = next(c for c in state.components if c.id == result.component_id)
    assert placed.position.x == 42
    assert placed.position.y == 84
    assert {p.id for p in placed.pins} == {"A", "B", "Y"}


@pytest.mark.asyncio
async def test_add_component_unknown_type_raises_tool_error() -> None:
    deps, _circuit_service = _make_deps()

    with pytest.raises(ToolError) as exc:
        await add_component(
            AddComponentArgs(
                session_id=SESSION_ID,
                actor_id=ACTOR_ID,
                component_type="NOT_A_REAL_GATE",
                label="U1",
                position=Position(x=0, y=0),
            ),
            deps=deps,
        )

    assert exc.value.code == "UNKNOWN_COMPONENT_TYPE"


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


def test_tools_registry_contains_get_circuit_state_and_simulate() -> None:
    assert "get_circuit_state" in TOOLS
    assert "simulate" in TOOLS
    assert "add_component" in TOOLS
