"""WebSocket connection handler."""

import json
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.core.database import db_manager
from app.exceptions.base import (
    AppException,
    AuthorizationException,
    NotFoundException,
)
from app.models.circuit import Annotation, CircuitComponent, Position, Wire
from app.models.session import Role
from app.services.circuit_service import CircuitService
from app.services.permission_service import PermissionService
from app.services.session_service import SessionService
from app.services.simulation_engine import SimulationEngine
from app.websocket.broadcaster import room_manager


class WebSocketHandler:
    """Handles WebSocket connections and message routing."""

    def __init__(self) -> None:
        self._session_service: SessionService | None = None
        self._permission_service: PermissionService | None = None
        self._circuit_service: CircuitService | None = None
        self._simulations: dict[str, SimulationEngine] = {}  # session_code -> engine

    def _get_services(self) -> None:
        """Initialize services with database connection."""
        if self._session_service is None:
            db = db_manager.get_database()
            self._session_service = SessionService(db)
            self._permission_service = PermissionService(db)
            self._circuit_service = CircuitService(db)

    async def handle_connection(
        self,
        websocket: WebSocket,
        session_code: str,
        participant_id: str,
    ) -> None:
        """Handle a WebSocket connection lifecycle."""
        self._get_services()

        # Validate session and participant
        try:
            session = await self._session_service.get_session(session_code)
            participant = await self._session_service.get_participant(
                session_code, participant_id
            )
            if participant is None:
                await websocket.close(code=4001, reason="Participant not found")
                return
        except NotFoundException:
            await websocket.close(code=4004, reason="Session not found")
            return

        # Connect to room
        conn = await room_manager.connect(websocket, session_code, participant_id)

        # Mark participant as active
        await self._session_service.mark_participant_active(
            session_code, participant_id
        )

        # Send initial state
        await self._send_sync_state(websocket, session_code)

        # Broadcast participant joined
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "presence:participant:joined",
                "payload": {
                    "participant": participant.model_dump(by_alias=True),
                },
            },
            exclude_participant=participant_id,
        )

        try:
            while True:
                # Receive message
                data = await websocket.receive_text()
                message = json.loads(data)

                # Route message to handler
                await self._handle_message(
                    session_code, participant_id, participant, message
                )
        except WebSocketDisconnect:
            pass
        except Exception as e:
            await self._send_error(websocket, "INTERNAL_ERROR", str(e))
        finally:
            # Disconnect and cleanup
            await room_manager.disconnect(participant_id)
            await self._session_service.mark_participant_inactive(
                session_code, participant_id
            )

            # Broadcast participant left
            await room_manager.broadcast_to_room(
                session_code,
                {
                    "type": "presence:participant:left",
                    "payload": {"participantId": participant_id},
                },
            )

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
                    await self._handle_wire_add(
                        session_code, participant_id, payload
                    )
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
                    await self._handle_simulation_start(
                        session_code, participant_id
                    )
                elif msg_type == "simulation:stop":
                    await self._handle_simulation_stop(
                        session_code, participant_id
                    )
                elif msg_type == "simulation:toggle":
                    await self._handle_simulation_toggle(
                        session_code, participant_id, payload
                    )
                elif msg_type == "simulation:clock:tick":
                    await self._handle_simulation_clock_tick(
                        session_code, participant_id, payload
                    )
                elif msg_type == "simulation:step":
                    await self._handle_simulation_step(
                        session_code, participant_id
                    )

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

    async def _send_sync_state(
        self, websocket: WebSocket, session_code: str
    ) -> None:
        """Send current circuit state and participants."""
        circuit = await self._circuit_service.get_circuit_state(session_code)
        participants = await self._session_service.get_session_participants(
            session_code
        )

        await websocket.send_json({
            "type": "sync:state",
            "payload": {
                "circuit": circuit.model_dump(by_alias=True, mode='json'),
                "participants": [p.model_dump(by_alias=True, mode='json') for p in participants],
            },
        })

    async def _send_error(
        self, websocket: WebSocket, code: str, message: str
    ) -> None:
        """Send error message to client."""
        try:
            await websocket.send_json({
                "type": "error",
                "payload": {"code": code, "message": message},
            })
        except Exception:
            pass

    # Circuit operation handlers
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
        event, state = await self._circuit_service.add_wire(
            session_code, user_id, wire
        )

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

    # Presence handlers
    async def _handle_cursor_move(
        self, session_code: str, participant_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle cursor move (broadcast to others)."""
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "presence:cursor:moved",
                "payload": {
                    "participantId": participant_id,
                    "position": payload.get("position"),
                },
            },
            exclude_participant=participant_id,
        )

    async def _handle_selection_change(
        self, session_code: str, participant_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle selection change (broadcast to others)."""
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "presence:selection:changed",
                "payload": {
                    "participantId": participant_id,
                    "componentIds": payload.get("componentIds", []),
                },
            },
            exclude_participant=participant_id,
        )

    # Permission handlers
    async def _handle_edit_request(
        self, session_code: str, participant_id: str
    ) -> None:
        """Handle edit request from student."""
        request = await self._permission_service.request_edit_access(
            session_code, participant_id
        )

        # Get session to find teacher
        session = await self._session_service.get_session(session_code)

        # Send confirmation to the student
        await room_manager.send_to_participant(
            participant_id,
            {
                "type": "permission:request:sent",
                "payload": {
                    "participantId": participant_id,
                    "status": "pending",
                },
            },
        )

        # Notify teacher
        await room_manager.send_to_participant(
            session.creator_participant_id,
            {
                "type": "permission:request:received",
                "payload": {
                    "participantId": participant_id,
                    "displayName": request.display_name,
                },
            },
        )

    async def _handle_permission_approve(
        self, session_code: str, teacher_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle permission approval."""
        student_id = payload["participantId"]
        await self._permission_service.approve_edit_request(
            session_code, teacher_id, student_id
        )

        # Broadcast to all (student will show toast, others update UI)
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "permission:granted",
                "payload": {"participantId": student_id},
            },
        )

    async def _handle_permission_deny(
        self, session_code: str, teacher_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle permission denial."""
        student_id = payload["participantId"]
        await self._permission_service.deny_edit_request(
            session_code, teacher_id, student_id
        )

        # Broadcast to all (student will show toast, others update UI)
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "permission:denied",
                "payload": {"participantId": student_id},
            },
        )

    async def _handle_permission_revoke(
        self, session_code: str, teacher_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle permission revocation."""
        student_id = payload["participantId"]
        await self._permission_service.revoke_edit_permission(
            session_code, teacher_id, student_id
        )

        # Broadcast to all (student will show toast, others update UI)
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "permission:revoked",
                "payload": {"participantId": student_id},
            },
        )

    async def _handle_kick_participant(
        self, session_code: str, teacher_id: str, payload: dict[str, Any]
    ) -> None:
        """Handle kicking a participant from the session."""
        student_id = payload["participantId"]

        # Verify teacher has permission
        teacher = await self._session_service.get_participant(session_code, teacher_id)
        if teacher is None or teacher.role != Role.TEACHER:
            raise AuthorizationException(
                "kick participant",
                "Only teachers can kick participants.",
            )

        # Verify student exists and is not a teacher
        student = await self._session_service.get_participant(session_code, student_id)
        if student is None:
            raise NotFoundException("Participant", student_id)

        if student.role == Role.TEACHER:
            raise AuthorizationException(
                "kick participant",
                "Cannot kick a teacher from the session.",
            )

        # Notify the student they're being kicked (before disconnecting)
        await room_manager.send_to_participant(
            student_id,
            {
                "type": "session:kicked",
                "payload": {"participantId": student_id},
            },
        )

        # Disconnect the student
        await room_manager.disconnect(student_id)

        # Permanently remove participant from the session
        await self._session_service.remove_participant(session_code, student_id)

        # Broadcast to all remaining participants
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "presence:participant:kicked",
                "payload": {
                    "participantId": student_id,
                    "displayName": student.display_name,
                },
            },
        )

    # Simulation handlers
    async def _handle_simulation_start(
        self, session_code: str, participant_id: str
    ) -> None:
        """Start simulation with current circuit state."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "start simulation",
                "Edit permission required to start simulation.",
            )

        # Load circuit and create simulation engine
        circuit = await self._circuit_service.get_circuit_state(session_code)
        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()  # Run initial simulation
        self._simulations[session_code] = engine

        # Broadcast simulation started with initial state
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:started",
                "payload": {
                    "startedBy": participant_id,
                    "wireStates": engine.get_wire_states(),
                    "pinStates": engine.get_pin_states(),
                },
            },
        )

    async def _handle_simulation_stop(
        self, session_code: str, participant_id: str
    ) -> None:
        """Stop simulation and cleanup."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "stop simulation",
                "Edit permission required to stop simulation.",
            )

        # Remove simulation engine
        self._simulations.pop(session_code, None)

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:stopped",
                "payload": {"stoppedBy": participant_id},
            },
        )

    async def _handle_simulation_toggle(
        self, session_code: str, participant_id: str, payload: dict[str, Any]
    ) -> None:
        """Toggle a switch component in simulation."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "toggle switch",
                "Edit permission required to toggle switch.",
            )

        engine = self._simulations.get(session_code)
        if not engine:
            return

        component_id = payload["componentId"]
        engine.toggle_switch(component_id)
        engine.run()

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:state:updated",
                "payload": {
                    "wireStates": engine.get_wire_states(),
                    "pinStates": engine.get_pin_states(),
                },
            },
        )

    async def _handle_simulation_clock_tick(
        self, session_code: str, participant_id: str, payload: dict[str, Any]
    ) -> None:
        """Tick a clock component in simulation."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "tick clock",
                "Edit permission required to tick clock.",
            )

        engine = self._simulations.get(session_code)
        if not engine:
            return

        component_id = payload["componentId"]
        engine.tick_clock(component_id)
        engine.run()

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:state:updated",
                "payload": {
                    "wireStates": engine.get_wire_states(),
                    "pinStates": engine.get_pin_states(),
                },
            },
        )

    async def _handle_simulation_step(
        self, session_code: str, participant_id: str
    ) -> None:
        """Run one simulation step."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "step simulation",
                "Edit permission required to step simulation.",
            )

        engine = self._simulations.get(session_code)
        if not engine:
            return

        engine.step()

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:state:updated",
                "payload": {
                    "wireStates": engine.get_wire_states(),
                    "pinStates": engine.get_pin_states(),
                },
            },
        )


# Global handler instance
ws_handler = WebSocketHandler()
