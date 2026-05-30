"""Tool: ``remove_wire`` — delete a wrong connection by wire id.

Thin wrapper over ``CircuitService.delete_wire``. The service raises
``NotFoundException`` when the wire is absent, which we re-raise as a
structured :class:`ToolError` (``WIRE_NOT_FOUND``) so the orchestrator
surfaces it to the model instead of returning a 5xx.

Worked example::

    args = RemoveWireArgs(
        session_id="tutor-...", actor_id="tutor-agent", wire_id="w1"
    )
    result = await remove_wire(args, deps=deps)
    # result.seq == 8   (the WIRE_DELETED event's seq)
"""

from __future__ import annotations

from app.exceptions.base import NotFoundException
from app.services.agent.schemas import RemoveWireArgs, RemoveWireResult

from ._types import ToolDeps, ToolError


async def remove_wire(args: RemoveWireArgs, *, deps: ToolDeps) -> RemoveWireResult:
    """Delete a wire and return the resulting event seq."""
    try:
        event, _state = await deps.circuit_service.delete_wire(
            args.session_id, args.actor_id, args.wire_id
        )
    except NotFoundException as exc:
        raise ToolError("WIRE_NOT_FOUND", str(exc)) from exc

    return RemoveWireResult(seq=event.seq)
