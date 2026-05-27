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

from dataclasses import dataclass
from typing import Awaitable, Callable

from pydantic import BaseModel

from app.models.circuit import ComponentType
from app.services.agent.schemas import (
    GetCircuitStateArgs,
    GetCircuitStateResult,
    SimulateArgs,
    SimulateResult,
)
from app.services.circuit_service import CircuitService
from app.services.component_registry import ComponentRegistry
from app.services.simulation_engine import SimulationEngine


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


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


TOOLS: dict[str, ToolFn] = {
    "get_circuit_state": get_circuit_state,
    "simulate": simulate,
}
