"""Tool: ``explain_signal_path`` — trace a signal from one component to another.

Algorithm: forward breadth-first search across wires, treating each component
as a node and each wire as a directed edge ``from_component_id → to_component_id``.
The first time we dequeue ``to_id``, we have a shortest hop chain. The chain is
reconstructed by walking ``parent_wire`` back to ``from_id``, then reversed so
it reads source-to-sink.

Each path step pairs a (component_id, pin_id) with its current signal value,
so the LLM can narrate "AND.out is HIGH, feeding NOT.in HIGH, which produces
NOT.out LOW". Signals come from a fresh simulation pass that reads
``engine.pin_values`` after ``evaluate``.

BFS dry-run on a 3-component circuit::

    Components: sw1 (SWITCH), and1 (AND), led1 (LED)
    Wires:      w1: sw1.out  → and1.a
                w2: sw1.out  → and1.b
                w3: and1.out → led1.in

    args = ExplainSignalPathArgs(session_id="ABC", from_id="sw1", to_id="led1")

    BFS state:
        queue=[sw1], parent_wire={sw1: None}
        pop sw1 → enqueue and1 (via w1).  parent_wire[and1]=w1
                  (w2 → and1 already visited, skip)
        queue=[and1]
        pop and1 → enqueue led1 (via w3). parent_wire[led1]=w3
        queue=[led1]
        pop led1 → matches to_id → break

    Reconstruct chain (walk parent_wire backwards from led1):
        chain = [w3]              # parent of led1
              + [w1]              # parent of and1 (which is parent of led1's source)
        reversed → [w1, w3]

    For each wire emit two PathSteps (source pin, then sink pin):
        path = [
            (sw1, out, HIGH),     # from w1
            (and1, a,  HIGH),     # to   w1
            (and1, out, HIGH),    # from w3
            (led1, in, HIGH),     # to   w3
        ]
        reachable = True

When ``from_id`` or ``to_id`` is missing, or no chain exists, the tool returns
``ExplainSignalPathResult(path=[], reachable=False)`` rather than raising.
"""

from __future__ import annotations

from collections import deque
from typing import Any

from app.services.agent.schemas import (
    ExplainSignalPathArgs,
    ExplainSignalPathResult,
    PathStep,
)
from app.services.simulation_engine import Signal

from ._types import ToolDeps


async def explain_signal_path(
    args: ExplainSignalPathArgs, *, deps: ToolDeps
) -> ExplainSignalPathResult:
    """BFS forward across wires from ``from_id`` until ``to_id`` is reached.

    The returned path interleaves output pins of the source component and
    input pins of the next component along each wire, with the signal value
    captured from a fresh simulation pass.
    """
    state = await deps.circuit_service.get_circuit_state(args.session_id)
    component_ids = {c.id for c in state.components}

    if args.from_id not in component_ids or args.to_id not in component_ids:
        return ExplainSignalPathResult(path=[], reachable=False)

    # Forward BFS over components, tracking which wire produced each visit.
    parent_wire: dict[str, Any] = {args.from_id: None}
    queue: deque[str] = deque([args.from_id])
    while queue:
        cur = queue.popleft()
        if cur == args.to_id:
            break
        for wire in state.wires:
            if wire.from_component_id != cur:
                continue
            if wire.to_component_id in parent_wire:
                continue
            parent_wire[wire.to_component_id] = wire
            queue.append(wire.to_component_id)

    if args.to_id not in parent_wire:
        return ExplainSignalPathResult(path=[], reachable=False)

    # Reconstruct the chain of wires from from_id → to_id.
    wires_chain: list[Any] = []
    node = args.to_id
    while node != args.from_id:
        wire = parent_wire[node]
        wires_chain.append(wire)
        node = wire.from_component_id
    wires_chain.reverse()

    engine = deps.simulation_engine_factory()
    engine.load_circuit(state)
    engine.evaluate()
    pin_values = engine.pin_values

    def _signal_at(component_id: str, pin_id: str) -> Signal:
        return pin_values.get(f"{component_id}:{pin_id}", Signal.X)

    path: list[PathStep] = []
    for wire in wires_chain:
        path.append(
            PathStep(
                component_id=wire.from_component_id,
                pin_id=wire.from_pin_id,
                signal=_signal_at(wire.from_component_id, wire.from_pin_id),
            )
        )
        path.append(
            PathStep(
                component_id=wire.to_component_id,
                pin_id=wire.to_pin_id,
                signal=_signal_at(wire.to_component_id, wire.to_pin_id),
            )
        )

    return ExplainSignalPathResult(path=path, reachable=True)
