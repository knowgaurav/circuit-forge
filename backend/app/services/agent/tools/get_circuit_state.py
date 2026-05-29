"""Tool: ``get_circuit_state`` — snapshot the session's circuit.

The tool fetches the current circuit document from ``CircuitService`` and
returns its components and wires verbatim. It is a pure read; nothing is
mutated and no event is appended. The orchestrator typically calls it before
any structural change so the LLM can reason about the live topology.

Worked example::

    args = GetCircuitStateArgs(session_id="ABC123")
    result = await get_circuit_state(args, deps=deps)
    # result.components == [CircuitComponent(id="g1", type=AND, ...), ...]
    # result.wires      == [CircuitWire(id="w1", from_component_id="g1", ...)]

Failure modes propagate from ``CircuitService`` (for example
``NotFoundException`` when the session does not exist). This tool does not
raise :class:`ToolError` itself — there is nothing it can validate beyond
what the service already enforces.
"""

from __future__ import annotations

from app.services.agent.schemas import GetCircuitStateArgs, GetCircuitStateResult

from ._types import ToolDeps


async def get_circuit_state(
    args: GetCircuitStateArgs, *, deps: ToolDeps
) -> GetCircuitStateResult:
    """Return the current components and wires for the session."""
    state = await deps.circuit_service.get_circuit_state(args.session_id)
    return GetCircuitStateResult(
        components=list(state.components),
        wires=list(state.wires),
    )
