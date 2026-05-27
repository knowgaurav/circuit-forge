"""Tool: ``simulate`` — evaluate the circuit and optionally advance clocks.

Workflow:

1. Fetch the current circuit state via ``CircuitService``.
2. Build a fresh engine through ``deps.simulation_engine_factory`` so no
   state leaks between calls.
3. ``engine.load_circuit(state)`` wires the components and wires into the
   engine's internal graph.
4. ``engine.evaluate()`` runs combinational propagation to a fixed point.
5. If ``args.ticks > 0``, every CLOCK component is ticked ``ticks`` times.
   Each ``tick_clock`` toggles the clock output and re-propagates, which is
   what advances flip-flops and other rising-edge-triggered elements.
6. Pin and wire signal maps are captured **after** the final ``evaluate``
   pass (or the last clock tick), so the values reflect the settled state
   the caller will observe — not an intermediate transient.

Why capture after ``evaluate``? Combinational logic can take several
propagation passes to reach a steady value (a chain of NOTs, for example).
Reading pin values mid-pass would surface stale signals.

Worked example — single AND gate with both inputs high::

    args = SimulateArgs(session_id="ABC123", ticks=0)
    result = await simulate(args, deps=deps)
    # result.pin_states["and1:out"]  == Signal.HIGH
    # result.wire_states["w_out"]    == Signal.HIGH
    # result.errors                  == []   (X signals encode failures)

Worked example — clocked counter, advance two cycles::

    args = SimulateArgs(session_id="ABC123", ticks=2)
    result = await simulate(args, deps=deps)
    # Each clock component receives two tick_clock() calls before the
    # final pin_states / wire_states snapshot is taken.

The ``errors`` list is intentionally empty: error conditions surface as
``Signal.X`` on individual pins (floating, cycle, conflict). The companion
``validate_circuit`` tool enumerates structural problems explicitly.
"""

from __future__ import annotations

from app.models.circuit import ComponentType
from app.services.agent.schemas import SimulateArgs, SimulateResult

from ._types import ToolDeps


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
