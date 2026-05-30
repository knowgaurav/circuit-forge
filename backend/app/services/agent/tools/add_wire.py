"""Tool: ``add_wire`` — connect an output pin to an input pin.

The agent addresses the connection by component *label* and *pin name*
(e.g. "AND1":"Y" → "LED1":"IN"), which is how it sees the board in the
framing text. ``_resolve_pin`` turns each label/pin pair into the
``(component_id, pin_id)`` the persistence layer needs, validating
direction on the way: the source must be an OUTPUT and the target an INPUT.

The actual connection is created by ``CircuitService.add_wire``, which runs
``validate_wire_connection`` (duplicate wire, input-already-connected,
existence, direction). Any rejection there is a ``ValidationException`` that
we re-raise as a structured :class:`ToolError` carrying the same stable code
so the orchestrator can feed it back to the model.

Worked example::

    args = AddWireArgs(
        session_id="tutor-...",
        actor_id="tutor-agent",
        from_label="AND1", from_pin="Y",
        to_label="LED1", to_pin="IN",
    )
    result = await add_wire(args, deps=deps)
    # result.wire_id == "<new uuid4>"
    # result.seq     == 7

Failure modes (all structured ``ToolError``):

- ``COMPONENT_NOT_FOUND`` / ``INVALID_PIN`` — from ``_resolve_pin``.
- ``INVALID_WIRE_DIRECTION`` / ``INPUT_ALREADY_CONNECTED`` /
  ``DUPLICATE_WIRE`` / ``INVALID_WIRE`` — from ``validate_wire_connection``.
"""

from __future__ import annotations

from uuid import uuid4

from app.exceptions.base import ValidationException
from app.models.circuit import PinType, Wire
from app.services.agent.schemas import AddWireArgs, AddWireResult

from ._helpers import _resolve_pin
from ._types import ToolDeps, ToolError


async def add_wire(args: AddWireArgs, *, deps: ToolDeps) -> AddWireResult:
    """Connect ``from_label``:``from_pin`` (output) to ``to_label``:``to_pin`` (input)."""
    state = await deps.circuit_service.get_circuit_state(args.session_id)

    from_cid, from_pid = _resolve_pin(
        state.components, args.from_label, args.from_pin, PinType.OUTPUT
    )
    to_cid, to_pid = _resolve_pin(
        state.components, args.to_label, args.to_pin, PinType.INPUT
    )

    wire = Wire(
        id=str(uuid4()),
        fromComponentId=from_cid,
        fromPinId=from_pid,
        toComponentId=to_cid,
        toPinId=to_pid,
    )

    try:
        event, _state = await deps.circuit_service.add_wire(
            args.session_id, args.actor_id, wire
        )
    except ValidationException as exc:
        raise ToolError(exc.code, exc.message) from exc

    return AddWireResult(wire_id=wire.id, seq=event.seq)
