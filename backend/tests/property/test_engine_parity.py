"""Cross-engine parity test (Story 0 — 0.6).

Property: for an arbitrary acyclic circuit built from a restricted
component palette, the backend ``SimulationEngine.run()`` and the
frontend ``SimulationEngine.run()`` (invoked through
``frontend/scripts/dump-engine-output.ts``) emit identical
``pinStates`` / ``wireStates``.

Strategy: a 2-stage circuit with up to 8 components from
{AND_2, OR_2, NOT, CONST_HIGH, CONST_LOW, SWITCH_TOGGLE, LED_RED}.
Wires only flow forward (sources -> gates -> LEDs), so by construction
the graph is acyclic. Floating gate inputs are filled with CONST_LOW.

If ``npx``/``node`` is unavailable on the runner, the test is skipped
with ``pytest.skip()`` — never silently passes.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from app.models.circuit import (
    CircuitComponent,
    CircuitState,
    ComponentType,
    Pin,
    PinType,
    Position,
    Rotation,
    Wire,
)
from app.services.simulation_engine import SimulationEngine

REPO_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_DIR = REPO_ROOT / "frontend"
HARNESS = "scripts/dump-engine-output.ts"


def _harness_available() -> bool:
    if shutil.which("npx") is None or shutil.which("node") is None:
        return False
    return (FRONTEND_DIR / HARNESS).is_file()


pytestmark = pytest.mark.skipif(
    not _harness_available(),
    reason="npx/node not available or dump-engine-output.ts missing",
)


# --- Component constructors -------------------------------------------------

_GATE_PINS_2IN = lambda: [  # noqa: E731
    Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-30, y=-10)),
    Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=-30, y=10)),
    Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=30, y=0)),
]
_NOT_PINS = lambda: [  # noqa: E731
    Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-25, y=0)),
    Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=25, y=0)),
]
_OUT_PIN = lambda: [  # noqa: E731
    Pin(id="OUT", name="OUT", type=PinType.OUTPUT, position=Position(x=20, y=0)),
]
_LED_PIN = lambda: [  # noqa: E731
    Pin(id="IN", name="IN", type=PinType.INPUT, position=Position(x=-15, y=0)),
]


def _make_source(kind: str, idx: int, state: bool) -> CircuitComponent:
    cid = f"src_{idx}"
    if kind == "CONST_HIGH":
        return CircuitComponent(
            id=cid,
            type=ComponentType.CONST_HIGH,
            position=Position(x=0, y=idx * 40),
            rotation=Rotation.DEG_0,
            properties={},
            pins=_OUT_PIN(),
        )
    if kind == "CONST_LOW":
        return CircuitComponent(
            id=cid,
            type=ComponentType.CONST_LOW,
            position=Position(x=0, y=idx * 40),
            rotation=Rotation.DEG_0,
            properties={},
            pins=_OUT_PIN(),
        )
    return CircuitComponent(
        id=cid,
        type=ComponentType.SWITCH_TOGGLE,
        position=Position(x=0, y=idx * 40),
        rotation=Rotation.DEG_0,
        properties={"state": state},
        pins=_OUT_PIN(),
    )


def _make_gate(kind: str, idx: int) -> CircuitComponent:
    cid = f"gate_{idx}"
    pins = _NOT_PINS() if kind == "NOT" else _GATE_PINS_2IN()
    ctype = {
        "AND_2": ComponentType.AND_2,
        "OR_2": ComponentType.OR_2,
        "NOT": ComponentType.NOT,
    }[kind]
    return CircuitComponent(
        id=cid,
        type=ctype,
        position=Position(x=200, y=idx * 40),
        rotation=Rotation.DEG_0,
        properties={},
        pins=pins,
    )


def _make_led(idx: int) -> CircuitComponent:
    return CircuitComponent(
        id=f"led_{idx}",
        type=ComponentType.LED_RED,
        position=Position(x=400, y=idx * 40),
        rotation=Rotation.DEG_0,
        properties={},
        pins=_LED_PIN(),
    )


# --- Hypothesis strategy ----------------------------------------------------

SOURCE_KINDS = ["CONST_HIGH", "CONST_LOW", "SWITCH_TOGGLE"]
GATE_KINDS = ["AND_2", "OR_2", "NOT"]


@st.composite
def acyclic_circuit(draw) -> CircuitState:
    """Build a 2-stage acyclic circuit: sources -> gates -> LEDs."""
    n_sources = draw(st.integers(min_value=1, max_value=3))
    n_gates = draw(st.integers(min_value=0, max_value=3))
    n_leds = draw(st.integers(min_value=1, max_value=2))

    sources: list[CircuitComponent] = []
    for i in range(n_sources):
        kind = draw(st.sampled_from(SOURCE_KINDS))
        state = draw(st.booleans()) if kind == "SWITCH_TOGGLE" else False
        sources.append(_make_source(kind, i, state))

    gates: list[CircuitComponent] = []
    for i in range(n_gates):
        gates.append(_make_gate(draw(st.sampled_from(GATE_KINDS)), i))

    leds = [_make_led(i) for i in range(n_leds)]

    components = sources + gates + leds
    wires: list[Wire] = []

    # Wire each gate's input pins to a randomly chosen source.
    for gate in gates:
        for pin in gate.pins:
            if pin.type != PinType.INPUT:
                continue
            src = draw(st.sampled_from(sources))
            wires.append(
                Wire(
                    id=f"w_{uuid4().hex[:8]}",
                    fromComponentId=src.id,
                    fromPinId="OUT",
                    toComponentId=gate.id,
                    toPinId=pin.id,
                    waypoints=[],
                )
            )

    # Wire each LED's input to a gate output if any, otherwise to a source.
    drivers: list[tuple[str, str]] = [(g.id, "Y") for g in gates] + [
        (s.id, "OUT") for s in sources
    ]
    for led in leds:
        cid, pid = draw(st.sampled_from(drivers))
        wires.append(
            Wire(
                id=f"w_{uuid4().hex[:8]}",
                fromComponentId=cid,
                fromPinId=pid,
                toComponentId=led.id,
                toPinId="IN",
                waypoints=[],
            )
        )

    return CircuitState(
        sessionId="parity",
        version=1,
        schemaVersion="1.0.0",
        components=components,
        wires=wires,
        annotations=[],
        updatedAt=datetime(2024, 1, 1),
    )


def _backend_output(circuit: CircuitState) -> dict[str, object]:
    engine = SimulationEngine()
    engine.load_circuit(circuit)
    return {
        "pinStates": engine.get_pin_states(),
        "wireStates": engine.get_wire_states(),
    }


def _frontend_output(circuit: CircuitState) -> dict[str, object]:
    payload = circuit.model_dump_json(by_alias=True)
    proc = subprocess.run(
        ["npx", "--no-install", "tsx", HARNESS, "-"],
        input=payload,
        capture_output=True,
        text=True,
        cwd=str(FRONTEND_DIR),
        timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"frontend harness failed: {proc.stderr}")
    return json.loads(proc.stdout)


@settings(
    max_examples=500,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture],
)
@given(circuit=acyclic_circuit())
def test_backend_and_frontend_engines_produce_identical_states(
    circuit: CircuitState,
) -> None:
    backend = _backend_output(circuit)
    frontend = _frontend_output(circuit)
    assert backend["pinStates"] == frontend["pinStates"], (
        f"pin state mismatch:\nbackend={backend['pinStates']}\nfrontend={frontend['pinStates']}"
    )
    assert backend["wireStates"] == frontend["wireStates"], (
        f"wire state mismatch:\nbackend={backend['wireStates']}\nfrontend={frontend['wireStates']}"
    )
