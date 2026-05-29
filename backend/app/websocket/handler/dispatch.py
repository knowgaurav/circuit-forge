"""Inbound message routing.

Why this module exists separately
---------------------------------
Every message a client sends arrives as ``{"type": "...", "payload": {...}}``.
This module is the single switchboard that looks at ``type`` and calls the
right per-feature handler. Keeping the routing in one place means the
handler mixins (circuit/presence/permission/simulation) stay focused on
*doing* the work, not on deciding who does it.

Message-type → handler table
-----------------------------
``circuit:*`` (all require edit permission except undo/redo):
    circuit:component:add      → _handle_component_add
    circuit:component:move     → _handle_component_move
    circuit:component:delete   → _handle_component_delete
    circuit:wire:add           → _handle_wire_add
    circuit:wire:delete        → _handle_wire_delete
    circuit:annotation:add     → _handle_annotation_add
    circuit:annotation:delete  → _handle_annotation_delete
    circuit:undo               → _handle_undo
    circuit:redo               → _handle_redo

``presence:*``:
    presence:cursor:move       → _handle_cursor_move
    presence:selection:change  → _handle_selection_change

``permission:*``:
    permission:request:edit    → _handle_edit_request
    permission:approve         → _handle_permission_approve
    permission:deny            → _handle_permission_deny
    permission:revoke          → _handle_permission_revoke
    permission:kick            → _handle_kick_participant

``simulation:*`` (all require edit permission):
    simulation:start           → _handle_simulation_start
    simulation:stop            → _handle_simulation_stop
    simulation:toggle          → _handle_simulation_toggle
    simulation:clock:tick      → _handle_simulation_clock_tick
    simulation:step            → _handle_simulation_step

Permission and app exceptions are caught here and sent back to the
originating participant as an ``error`` message, so a single bad request
never tears down the connection.
"""

from typing import Any

from app.exceptions.base import AppException, AuthorizationException
from app.websocket.broadcaster import room_manager


class DispatchMixin:
    """Routes one inbound message to the matching feature handler.

    Relies on the host class providing ``self._permission_service`` and the
    per-feature ``_handle_*`` methods defined in the action mixins.
    """

    async def _handle_message(
        self,
        session_code: str,
        participant_id: str,
        participant: Any,
        message: dict[str, Any],
    ) -> None:
        """Route and handle incoming messages."""
        msg_type = message.get("type", "")
        payload = message.get("payload", {})

        try:
            # Circuit operations (require edit permission)
            if msg_type.startswith("circuit:"):
                if msg_type not in ["circuit:undo", "circuit:redo"]:
                    await self._permission_service.check_edit_permission(
                        session_code, participant_id
                    )

                if msg_type == "circuit:component:add":
                    await self._handle_component_add(
                        session_code, participant_id, payload
                    )
                elif msg_type == "circuit:component:move":
                    await self._handle_component_move(
                        session_code, participant_id, payload
                    )
                elif msg_type == "circuit:component:delete":
                    await self._handle_component_delete(
                        session_code, participant_id, payload
                    )
                elif msg_type == "circuit:wire:add":
                    await self._handle_wire_add(session_code, participant_id, payload)
                elif msg_type == "circuit:wire:delete":
                    await self._handle_wire_delete(
                        session_code, participant_id, payload
                    )
                elif msg_type == "circuit:annotation:add":
                    await self._handle_annotation_add(
                        session_code, participant_id, payload
                    )
                elif msg_type == "circuit:annotation:delete":
                    await self._handle_annotation_delete(
                        session_code, participant_id, payload
                    )
                elif msg_type == "circuit:undo":
                    await self._handle_undo(session_code, participant_id)
                elif msg_type == "circuit:redo":
                    await self._handle_redo(session_code, participant_id)

            # Presence messages
            elif msg_type.startswith("presence:"):
                if msg_type == "presence:cursor:move":
                    await self._handle_cursor_move(
                        session_code, participant_id, payload
                    )
                elif msg_type == "presence:selection:change":
                    await self._handle_selection_change(
                        session_code, participant_id, payload
                    )

            # Permission messages
            elif msg_type.startswith("permission:"):
                if msg_type == "permission:request:edit":
                    await self._handle_edit_request(session_code, participant_id)
                elif msg_type == "permission:approve":
                    await self._handle_permission_approve(
                        session_code, participant_id, payload
                    )
                elif msg_type == "permission:deny":
                    await self._handle_permission_deny(
                        session_code, participant_id, payload
                    )
                elif msg_type == "permission:revoke":
                    await self._handle_permission_revoke(
                        session_code, participant_id, payload
                    )
                elif msg_type == "permission:kick":
                    await self._handle_kick_participant(
                        session_code, participant_id, payload
                    )

            # Simulation messages (requires edit permission)
            elif msg_type.startswith("simulation:"):
                if msg_type == "simulation:start":
                    await self._handle_simulation_start(session_code, participant_id)
                elif msg_type == "simulation:stop":
                    await self._handle_simulation_stop(session_code, participant_id)
                elif msg_type == "simulation:toggle":
                    await self._handle_simulation_toggle(
                        session_code, participant_id, payload
                    )
                elif msg_type == "simulation:clock:tick":
                    await self._handle_simulation_clock_tick(
                        session_code, participant_id, payload
                    )
                elif msg_type == "simulation:step":
                    await self._handle_simulation_step(session_code, participant_id)

        except AuthorizationException as e:
            await room_manager.send_to_participant(
                participant_id,
                {"type": "error", "payload": {"code": e.code, "message": e.message}},
            )
        except AppException as e:
            await room_manager.send_to_participant(
                participant_id,
                {"type": "error", "payload": {"code": e.code, "message": e.message}},
            )
