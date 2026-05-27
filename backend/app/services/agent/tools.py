"""Async implementations of the six agent tools.

Source of truth: ``.kiro/specs/system-design-improvement/contracts.md`` →
"Story B — Agent surface". Every tool is an ``async def`` function that takes
a Pydantic ``Args`` model and a :class:`ToolDeps` bag, and returns a Pydantic
``Result`` model.

Dependencies (``CircuitService``, the :class:`SimulationEngine` factory, and
the ``ComponentRegistry``) are injected through :class:`ToolDeps` so the
orchestrator can wire real services and tests can build them in-process. The
module never imports the global ``db_manager``.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Any, Awaitable, Callable
from uuid import uuid4

from pydantic import BaseModel

from app.exceptions.base import NotFoundException
from app.models.circuit import (
    CircuitComponent,
    ComponentType,
    Pin,
    PinType,
    Position,
    Rotation,
)
from app.services.agent.schemas import (
    AddComponentArgs,
    AddComponentResult,
    ExplainSignalPathArgs,
    ExplainSignalPathResult,
    GetCircuitStateArgs,
    GetCircuitStateResult,
    PathStep,
    PinRef,
    RemoveComponentArgs,
    RemoveComponentResult,
    SimulateArgs,
    SimulateResult,
    ValidateCircuitArgs,
    ValidateCircuitResult,
    WireRef,
)
from app.services.circuit_service import CircuitService
from app.services.component_registry import ComponentRegistry
from app.services.simulation_engine import (
    _SOURCE as _SIM_SOURCE,
    _STATEFUL as _SIM_STATEFUL,
    Signal,
    SimulationEngine,
)


# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------


ToolFn = Callable[..., Awaitable[BaseModel]]
"""Signature of every tool: ``async def fn(args, *, deps) -> Result``."""


@dataclass
class ToolDeps:
    """Services a tool needs at call time.

    The orchestrator builds one instance per request and passes it into every
    tool invocation. ``simulation_engine_factory`` is a zero-arg callable so
    each ``simulate`` call gets a fresh engine without sharing mutable state.
    """

    circuit_service: CircuitService
    simulation_engine_factory: Callable[[], SimulationEngine]
    component_registry: ComponentRegistry


class ToolError(Exception):
    """Structured tool failure surfaced to the orchestrator.

    The orchestrator catches this and renders it as a tool result the LLM
    sees, without aborting the loop.
    """

    def __init__(self, code: str, details: str) -> None:
        self.code = code
        self.details = details
        super().__init__(f"{code}: {details}")


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------


def _registry_pins(registry: ComponentRegistry, component_type: str) -> list[Pin]:
    """Map a registry component definition's pins to ``Pin`` instances."""
    definition = registry.get_component(component_type)
    if definition is None:
        raise ToolError(
            "UNKNOWN_COMPONENT_TYPE",
            f"component_type '{component_type}' is not registered",
        )

    pins: list[Pin] = []
    for pin_def in definition.pins:
        pins.append(
            Pin(
                id=pin_def.name,
                name=pin_def.name,
                type=PinType.INPUT if pin_def.type == "input" else PinType.OUTPUT,
                position=Position(x=pin_def.position["x"], y=pin_def.position["y"]),
            )
        )
    return pins


def _is_combinational(component_type: str) -> bool:
    """A component participates in combinational cycle analysis when it is
    neither a source (constants/switches/clock) nor a stateful element."""
    return component_type not in _SIM_SOURCE and component_type not in _SIM_STATEFUL


def _tarjan_sccs(
    nodes: list[str], adj: dict[str, list[str]]
) -> list[list[str]]:
    """Tarjan's strongly connected components."""
    index = 0
    stack: list[str] = []
    indices: dict[str, int] = {}
    lowlink: dict[str, int] = {}
    on_stack: set[str] = set()
    sccs: list[list[str]] = []

    def strongconnect(v: str) -> None:
        nonlocal index
        indices[v] = index
        lowlink[v] = index
        index += 1
        stack.append(v)
        on_stack.add(v)
        for w in adj.get(v, []):
            if w not in indices:
                strongconnect(w)
                lowlink[v] = min(lowlink[v], lowlink[w])
            elif w in on_stack:
                lowlink[v] = min(lowlink[v], indices[w])
        if lowlink[v] == indices[v]:
            component: list[str] = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                component.append(w)
                if w == v:
                    break
            sccs.append(component)

    for v in nodes:
        if v not in indices:
            strongconnect(v)
    return sccs


async def get_circuit_state(
    args: GetCircuitStateArgs, *, deps: ToolDeps
) -> GetCircuitStateResult:
    """Return the current components and wires for the session."""
    state = await deps.circuit_service.get_circuit_state(args.session_id)
    return GetCircuitStateResult(
        components=list(state.components),
        wires=list(state.wires),
    )


async def simulate(args: SimulateArgs, *, deps: ToolDeps) -> SimulateResult:
    """Evaluate the circuit and optionally advance clocks ``ticks`` times.

    Returns pin/wire signal maps as the engine reports them. ``errors`` is
    always empty: the engine surfaces error states implicitly via
    :class:`Signal.X` (floating, cycle, conflict).
    """
    state = await deps.circuit_service.get_circuit_state(args.session_id)
    engine = deps.simulation_engine_factory()
    engine.load_circuit(state)
    engine.evaluate()

    if args.ticks > 0:
        clock_ids = [c.id for c in state.components if c.type == ComponentType.CLOCK]
        for _ in range(args.ticks):
            for cid in clock_ids:
                engine.tick_clock(cid)

    return SimulateResult(
        pin_states=engine.get_pin_states(),  # type: ignore[arg-type]
        wire_states=engine.get_wire_states(),  # type: ignore[arg-type]
        errors=[],
    )


async def add_component(
    args: AddComponentArgs, *, deps: ToolDeps
) -> AddComponentResult:
    """Create a new component from the registry definition and persist it."""
    definition = deps.component_registry.get_component(args.component_type)
    if definition is None:
        raise ToolError(
            "UNKNOWN_COMPONENT_TYPE",
            f"component_type '{args.component_type}' is not registered",
        )

    pins = _registry_pins(deps.component_registry, args.component_type)
    component = CircuitComponent(
        id=str(uuid4()),
        type=ComponentType(args.component_type),
        position=args.position,
        rotation=Rotation.DEG_0,
        properties=dict(definition.properties),
        pins=pins,
    )

    event, _state = await deps.circuit_service.add_component(
        args.session_id, args.actor_id, component
    )
    return AddComponentResult(component_id=component.id, seq=event.seq)


async def remove_component(
    args: RemoveComponentArgs, *, deps: ToolDeps
) -> RemoveComponentResult:
    """Delete a component (cascading its wires) and return the resulting seq."""
    try:
        events, _state = await deps.circuit_service.delete_component(
            args.session_id, args.actor_id, args.component_id
        )
    except NotFoundException as exc:
        raise ToolError("COMPONENT_NOT_FOUND", str(exc)) from exc

    # ``delete_component`` emits wire-delete events first and the
    # component-delete event last; the LLM cares about the final seq.
    return RemoveComponentResult(seq=events[-1].seq)


async def validate_circuit(
    args: ValidateCircuitArgs, *, deps: ToolDeps
) -> ValidateCircuitResult:
    """Surface structural problems: floating inputs, output conflicts, cycles."""
    state = await deps.circuit_service.get_circuit_state(args.session_id)

    # Build incoming-wire index keyed by (to_component_id, to_pin_id).
    incoming: dict[tuple[str, str], list[str]] = {}
    for wire in state.wires:
        incoming.setdefault(
            (wire.to_component_id, wire.to_pin_id), []
        ).append(wire.id)

    # Floating inputs: every input pin on a non-source component without an
    # incoming wire. Constants/grounds are sources by definition.
    floating: list[PinRef] = []
    for component in state.components:
        if component.type.value in _SIM_SOURCE:
            continue
        for pin in component.pins:
            if pin.type != PinType.INPUT:
                continue
            if (component.id, pin.id) not in incoming:
                floating.append(PinRef(component_id=component.id, pin_id=pin.id))

    # Output conflicts: any input pin driven by more than one wire.
    conflicts: list[WireRef] = []
    for wire_ids in incoming.values():
        if len(wire_ids) > 1:
            for wire_id in wire_ids:
                conflicts.append(WireRef(wire_id=wire_id))

    # Combinational cycles: SCCs (size > 1 or self-loop) over the subgraph
    # induced by combinational components. Stateful elements break cycles.
    comb_ids = [
        c.id for c in state.components if _is_combinational(c.type.value)
    ]
    comb_set = set(comb_ids)
    adj: dict[str, list[str]] = {cid: [] for cid in comb_ids}
    for wire in state.wires:
        if (
            wire.from_component_id in comb_set
            and wire.to_component_id in comb_set
        ):
            adj[wire.from_component_id].append(wire.to_component_id)

    cycles: list[list[str]] = []
    for scc in _tarjan_sccs(comb_ids, adj):
        if len(scc) > 1:
            cycles.append(scc)
        elif len(scc) == 1 and scc[0] in adj.get(scc[0], []):
            cycles.append(scc)

    return ValidateCircuitResult(
        floating_inputs=floating,
        output_conflicts=conflicts,
        combinational_cycles=cycles,
    )


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


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


TOOLS: dict[str, ToolFn] = {
    "get_circuit_state": get_circuit_state,
    "simulate": simulate,
    "add_component": add_component,
    "remove_component": remove_component,
    "validate_circuit": validate_circuit,
    "explain_signal_path": explain_signal_path,
}
