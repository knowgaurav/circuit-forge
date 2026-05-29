"""Circuit-edit message handlers (add/move/delete + undo/redo).

Why this module exists separately
---------------------------------
These handlers turn a validated client message into a ``CircuitService``
call and then broadcast the result to the rest of the room. They all follow
the same shape:

1. Parse the payload into a typed model (``CircuitComponent``, ``Wire``, ...).
2. Call the matching ``CircuitService`` method, which appends an event.
3. Broadcast a ``circuit:*`` message so every other client mirrors the edit.

Example — a student moves a gate
--------------------------------
Client sends::

    {"type": "circuit:component:move",
     "payload": {"componentId": "g1", "position": {"x": 120, "y": 80}}}

``_handle_component_move`` validates the position, calls
``circuit_service.move_component(...)`` (which records a ``COMPONENT_MOVED``
event), then broadcasts ``circuit:component:moved`` to the whole room so
everyone's canvas snaps the gate to its new spot.

The delete handler is the only one that broadcasts more than one message:
deleting a component cascades to its wires, so we emit a
``circuit:wire:deleted`` for each removed wire before the final
``circuit:component:deleted``.
"""

from typing import Any

from app.models.circuit import Annotation, CircuitComponent, Position, Wire
from app.websocket.broadcaster import room_manager


class CircuitActionsMixin:
    """Handlers for ``circuit:*`` messages.

    Relies on the host class providing ``self._circuit_service``.
    """

    async def _handle_component_add(
        self, session_code: str, user_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle component add."""
        component = CircuitComponent.model_validate(payload["component"])
        event, state = await self._circuit_service.add_component(
            session_code, user_id, component
        )

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "circuit:component:added",
                "payload": {
                    "component": component.model_dump(by_alias=True),
                    "userId": user_id,
                },
            },
        )

    async def _handle_component_move(
        self, session_code: str, user_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle component move."""
        component_id = payload["componentId"]
        position = Position.model_validate(payload["position"])

        event, state = await self._circuit_service.move_component(
            session_code, user_id, component_id, position
        )

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "circuit:component:moved",
                "payload": {
                    "componentId": component_id,
                    "position": position.model_dump(),
                    "userId": user_id,
                },
            },
        )

    async def _handle_component_delete(
        self, session_code: str, user_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle component delete (with wire cascade)."""
        component_id = payload["componentId"]

        events, state = await self._circuit_service.delete_component(
            session_code, user_id, component_id
        )

        # Broadcast wire deletions first
        for event in events[:-1]:  # All but last (component delete)
            await room_manager.broadcast_to_room(
                session_code,
                {
                    "type": "circuit:wire:deleted",
                    "payload": {
                        "wireId": event.payload.wire_id,
                        "userId": user_id,
                    },
                },
            )

        # Broadcast component deletion
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "circuit:component:deleted",
                "payload": {"componentId": component_id, "userId": user_id},
            },
        )

    async def _handle_wire_add(
        self, session_code: str, user_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle wire add."""
        wire = Wire.model_validate(payload["wire"])
        event, state = await self._circuit_service.add_wire(session_code, user_id, wire)

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "circuit:wire:added",
                "payload": {
                    "wire": wire.model_dump(by_alias=True),
                    "userId": user_id,
                },
            },
        )

    async def _handle_wire_delete(
        self, session_code: str, user_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle wire delete."""
        wire_id = payload["wireId"]
        event, state = await self._circuit_service.delete_wire(
            session_code, user_id, wire_id
        )

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "circuit:wire:deleted",
                "payload": {"wireId": wire_id, "userId": user_id},
            },
        )

    async def _handle_annotation_add(
        self, session_code: str, user_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle annotation add."""
        annotation = Annotation.model_validate(payload["annotation"])
        event, state = await self._circuit_service.add_annotation(
            session_code, user_id, annotation
        )

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "circuit:annotation:added",
                "payload": {
                    "annotation": annotation.model_dump(by_alias=True),
                    "userId": user_id,
                },
            },
        )

    async def _handle_annotation_delete(
        self, session_code: str, user_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle annotation delete."""
        annotation_id = payload["annotationId"]
        event, state = await self._circuit_service.delete_annotation(
            session_code, user_id, annotation_id
        )

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "circuit:annotation:deleted",
                "payload": {"annotationId": annotation_id, "userId": user_id},
            },
        )

    async def _handle_undo(self, session_code: str, user_id: str) -> None:
        """Handle undo."""
        result = await self._circuit_service.undo(session_code, user_id)
        if result:
            event, state = result
            await room_manager.broadcast_to_room(
                session_code,
                {
                    "type": "circuit:state:updated",
                    "payload": {"version": state.version},
                },
            )

    async def _handle_redo(self, session_code: str, user_id: str) -> None:
        """Handle redo."""
        result = await self._circuit_service.redo(session_code, user_id)
        if result:
            event, state = result
            await room_manager.broadcast_to_room(
                session_code,
                {
                    "type": "circuit:state:updated",
                    "payload": {"version": state.version},
                },
            )
