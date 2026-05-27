"""Tool: ``validate_circuit`` — surface structural problems.

Three checks run over the circuit state:

1. **Floating inputs** — every input pin on a non-source component that has
   no incoming wire. Sources (constants, switches, clocks) are excluded
   because they generate signal rather than receive it.
2. **Output conflicts** — an input pin driven by more than one wire. Each
   contributing wire is reported individually so the LLM can choose which
   to remove.
3. **Combinational cycles** — strongly connected components in the subgraph
   restricted to combinational gates. Stateful elements (flip-flops,
   latches) break cycles by design and are excluded from the subgraph.

SCC detection dry-run on a 2-NOT cycle::

    Components:    not1 (NOT), not2 (NOT)
    Wires:         w1: not1.out → not2.in
                   w2: not2.out → not1.in

    Combinational subgraph:
        nodes = ["not1", "not2"]
        adj   = {"not1": ["not2"], "not2": ["not1"]}

    Tarjan walk:
        visit not1 → push, index=0, lowlink=0
            visit not2 → push, index=1, lowlink=1
                edge not2 → not1, not1 is on_stack → lowlink[not2] = 0
            after recursion → lowlink[not1] = min(0, 0) = 0
        lowlink[not1] == indices[not1] → pop "not2", "not1" as one SCC.

    Result: combinational_cycles = [["not2", "not1"]]
    (single-node SCCs without a self-loop are filtered out)

Worked output::

    args = ValidateCircuitArgs(session_id="ABC123")
    result = await validate_circuit(args, deps=deps)
    # result.floating_inputs        == [PinRef(component_id="and1", pin_id="b")]
    # result.output_conflicts       == [WireRef(wire_id="w3"), WireRef(wire_id="w4")]
    # result.combinational_cycles   == [["not2", "not1"]]
"""

from __future__ import annotations

from app.models.circuit import PinType
from app.services.agent.schemas import (
    PinRef,
    ValidateCircuitArgs,
    ValidateCircuitResult,
    WireRef,
)
from app.services.simulation_engine import _SOURCE as _SIM_SOURCE

from ._helpers import _is_combinational, _tarjan_sccs
from ._types import ToolDeps


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
