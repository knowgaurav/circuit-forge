"""Tool: ``move_component`` — reposition a component on the board.

Thin wrapper over ``CircuitService.move_component``. Useful when a component
sits where the learner can't reach a pin, or to declutter before wiring.
Wiring topology is unchanged — only the component's position moves.

The service raises ``NotFoundException`` when the component is absent, which
we re-raise as a structured :class:`ToolError` (``COMPONENT_NOT_FOUND``).

Worked example::

    args = MoveComponentArgs(
        session_id="tutor-...", actor_id="tutor-agent",
        component_id="and-1", position=Position(x=240, y=120),
    )
    result = await move_component(args, deps=deps)
    # result.seq == 9   (the COMPONENT_MOVED event's seq)
"""

from __future__ import annotations

from app.exceptions.base import NotFoundException
from app.services.agent.schemas import MoveComponentArgs, MoveComponentResult

from ._types import ToolDeps, ToolError


async def move_component(
    args: MoveComponentArgs, *, deps: ToolDeps
) -> MoveComponentResult:
    """Reposition a component and return the resulting event seq."""
    try:
        event, _state = await deps.circuit_service.move_component(
            args.session_id, args.actor_id, args.component_id, args.position
        )
    except NotFoundException as exc:
        raise ToolError("COMPONENT_NOT_FOUND", str(exc)) from exc

    return MoveComponentResult(seq=event.seq)
