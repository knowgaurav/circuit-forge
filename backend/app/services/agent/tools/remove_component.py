"""Tool: ``remove_component`` — delete a component (cascading its wires).

``CircuitService.delete_component`` does the heavy lifting: it emits a
``WIRE_DELETED`` event for each connected wire and a final
``COMPONENT_DELETED`` event. The list comes back in append order, so the
last entry's ``seq`` is the one the LLM should track for ordering.

Failure modes:

- ``NotFoundException`` from the service is converted to
  :class:`ToolError` with code ``COMPONENT_NOT_FOUND`` so the orchestrator
  surfaces it as a structured tool result instead of a 5xx.

Worked example — removing an AND gate connected to two wires::

    args = RemoveComponentArgs(
        session_id="ABC123",
        actor_id="agent-1",
        component_id="and1",
    )
    result = await remove_component(args, deps=deps)
    # Service emits seqs 5 (WIRE_DELETED w1), 6 (WIRE_DELETED w2),
    # 7 (COMPONENT_DELETED and1).
    # result.seq == 7

When the component does not exist::

    ToolError(code="COMPONENT_NOT_FOUND",
              details="component 'and1' not in session 'ABC123'")
"""

from __future__ import annotations

from app.exceptions.base import NotFoundException
from app.services.agent.schemas import RemoveComponentArgs, RemoveComponentResult

from ._types import ToolDeps, ToolError


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
