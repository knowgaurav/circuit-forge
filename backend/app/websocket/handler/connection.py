"""Connection lifecycle: accept, register, receive loop, cleanup.

Why this module exists separately
---------------------------------
This is the outermost layer of the WebSocket handler — the part that owns a
single client's whole session from connect to disconnect. Everything else
(sync, message dispatch, the per-feature handlers) is called from inside the
receive loop here.

Happy-path walk-through
-----------------------
1. A teacher's browser opens ``ws://.../ws/ABC123/p-7``.
2. We validate the session ``ABC123`` and participant ``p-7`` exist; if not,
   we close with a 4001/4004 code and stop.
3. We register the socket with the room manager and mark the participant
   active.
4. We send the initial sync (snapshot or delta — see :mod:`.sync`).
5. We broadcast ``presence:participant:joined`` to everyone else.
6. We loop forever reading JSON messages and routing each through
   ``_handle_message`` (see :mod:`.dispatch`).
7. When the socket drops (``WebSocketDisconnect``) or errors, the ``finally``
   block disconnects from the room, marks the participant inactive, and
   broadcasts ``presence:participant:left``.
"""

import json
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.exceptions.base import NotFoundException
from app.websocket.broadcaster import room_manager


class ConnectionMixin:
    """Owns the connect → receive-loop → disconnect lifecycle.

    Relies on the host class providing ``self._get_services``,
    ``self._session_service``, ``self._send_initial_sync``,
    ``self._handle_message``, and ``self._send_error``.
    """

    async def handle_connection(
        self,
        websocket: WebSocket,
        session_code: str,
        participant_id: str,
        last_seen_seq: int | None = None,
    ) -> None:
        """Handle a WebSocket connection lifecycle.

        If ``last_seen_seq`` is provided AND the latest snapshot's seq is
        less than or equal to it, we send a ``sync:delta`` carrying just the
        events with seq > ``last_seen_seq``. Otherwise we fall back to the
        full ``sync:state`` snapshot. The protocol is documented in
        ``docs/adr/0001-collaboration-consistency.md``.
        """
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

        # Decide between delta and snapshot reply
        await self._send_initial_sync(websocket, session_code, last_seen_seq)

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
