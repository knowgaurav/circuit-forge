"""Presence and permission message handlers.

Why this module exists separately
---------------------------------
Two related but lightweight feature groups live together here:

* **Presence** — cursor moves and selection changes. These are pure
  broadcasts: we forward the event to everyone *except* the sender so each
  client can draw the others' cursors and selections.
* **Permission** — the teacher/student edit-access workflow: a student
  requests edit access, the teacher approves/denies/revokes, and a teacher
  can kick a student.

Permission example — a student asks to edit
-------------------------------------------
1. Student sends ``permission:request:edit``.
2. ``_handle_edit_request`` records the request, replies to the student with
   ``permission:request:sent`` (status pending), and notifies the teacher
   with ``permission:request:received``.
3. Teacher sends ``permission:approve`` with the student's id.
4. ``_handle_permission_approve`` grants access and broadcasts
   ``permission:granted`` so the student's UI unlocks and others update.

Kicking is the most guarded path: only a teacher may kick, and a teacher
cannot be kicked — both checks raise :class:`AuthorizationException` which
the dispatcher turns into an ``error`` reply.
"""

from typing import Any

from app.exceptions.base import AuthorizationException, NotFoundException
from app.models.session import Role
from app.websocket.broadcaster import room_manager


class PresenceActionsMixin:
    """Handlers for ``presence:*`` and ``permission:*`` messages.

    Relies on the host class providing ``self._permission_service`` and
    ``self._session_service``.
    """

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
