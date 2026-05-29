"""Participant management: join, presence, roles, and color assignment.

Why this module exists separately
---------------------------------
Everything about the *people* in a session lives here: joining (and
rejoining), marking active/inactive on connect/disconnect, kicking, updating
last-seen, and handing out a cursor color. Session-wide concerns are in
:mod:`.lifecycle`.

Join example
------------
1. A browser POSTs to join ``ABC123`` with display name "Riya".
2. ``join_session`` checks the session exists and the name is valid.
3. If a ``participant_id`` was supplied and already exists, we treat it as a
   *rejoin*: flip the existing participant back to active and return it.
4. Otherwise we mint a new participant. The session creator becomes the
   TEACHER (can edit by default); everyone else is a STUDENT (read-only
   until granted edit access).
5. We assign the first free cursor color and persist the participant.
"""

from datetime import datetime
from uuid import uuid4

from app.core.logger import enrich_context, get_logger
from app.exceptions.base import ValidationException
from app.models.session import Participant, Role

from .constants import CURSOR_COLORS

logger = get_logger()


class ParticipantsMixin:
    """Join / presence / role / color logic for participants.

    Relies on the host class providing ``self._participant_repo``,
    ``self._session_repo``, and ``self.get_session`` (from
    :class:`LifecycleMixin`).
    """

    async def join_session(
        self,
        code: str,
        display_name: str,
        participant_id: str | None = None,
    ) -> Participant:
        """
        Join an existing session.

        Args:
            code: Session code
            display_name: User's display name
            participant_id: Optional existing participant ID for rejoin

        Returns:
            Participant object
        """
        # Verify session exists
        session = await self.get_session(code)

        # Validate display name
        if not self._validate_display_name(display_name):
            raise ValidationException(
                code="INVALID_DISPLAY_NAME",
                message="Display name must be 3-20 characters, alphanumeric and spaces only",
            )

        # Check if rejoining with existing ID
        if participant_id:
            existing = await self._participant_repo.find_by_id(code, participant_id)
            if existing:
                # Reactivate existing participant
                await self._participant_repo.update_active_status(
                    code, participant_id, True
                )
                await self._session_repo.update_activity(code)
                return existing

        # Create new participant
        new_id = participant_id or str(uuid4())

        # Determine role - check if this is the session creator
        is_creator = session.creator_participant_id == new_id
        role = Role.TEACHER if is_creator else Role.STUDENT
        can_edit = is_creator  # Teacher (creator) can edit by default

        enrich_context(
            operation="join_session",
            session_code=code,
            participant_role=role.value,
            is_creator=is_creator,
        )
        logger.info(
            f"Join session: new_id={new_id}, creator_id={session.creator_participant_id}, is_creator={is_creator}, can_edit={can_edit}"
        )

        # Assign color
        color = await self._assign_color(code)

        participant = Participant(
            id=new_id,
            sessionCode=code,
            displayName=display_name,
            role=role,
            canEdit=can_edit,
            color=color,
            isActive=True,
            lastSeenAt=datetime.utcnow(),
        )

        await self._participant_repo.create(participant)
        await self._session_repo.update_activity(code)

        return participant

    async def get_participant(
        self, code: str, participant_id: str
    ) -> Participant | None:
        """Get a participant by ID."""
        return await self._participant_repo.find_by_id(code, participant_id)

    async def get_session_participants(self, code: str) -> list[Participant]:
        """Get all participants in a session."""
        return await self._participant_repo.find_by_session(code)

    async def get_active_participants(self, code: str) -> list[Participant]:
        """Get all active participants in a session."""
        return await self._participant_repo.find_active_by_session(code)

    async def mark_participant_inactive(self, code: str, participant_id: str) -> bool:
        """Mark a participant as inactive (disconnected)."""
        return await self._participant_repo.update_active_status(
            code, participant_id, False
        )

    async def remove_participant(self, code: str, participant_id: str) -> bool:
        """Permanently remove a participant from a session (kick)."""
        return await self._participant_repo.delete_participant(code, participant_id)

    async def mark_participant_active(self, code: str, participant_id: str) -> bool:
        """Mark a participant as active (reconnected)."""
        result = await self._participant_repo.update_active_status(
            code, participant_id, True
        )
        if result:
            await self._session_repo.update_activity(code)
        return result

    async def update_participant_last_seen(
        self, code: str, participant_id: str
    ) -> bool:
        """Update participant's last seen timestamp."""
        return await self._participant_repo.update_last_seen(code, participant_id)

    async def _assign_color(self, code: str) -> str:
        """Assign a unique cursor color to a participant.

        Hands out the first color not already in use. Once all eight are
        taken we wrap around by participant count, so a ninth participant
        reuses the first color — acceptable since cursors are still
        distinguishable by name label.
        """
        used_colors = await self._participant_repo.get_used_colors(code)

        # Find first unused color
        for color in CURSOR_COLORS:
            if color not in used_colors:
                return color

        # If all colors used, cycle through
        participant_count = await self._participant_repo.count_by_session(code)
        return CURSOR_COLORS[participant_count % len(CURSOR_COLORS)]

    def _validate_display_name(self, name: str) -> bool:
        """Validate display name format (3-20 chars, alphanumeric + spaces)."""
        if len(name) < 3 or len(name) > 20:
            return False
        return all(c.isalnum() or c == " " for c in name)
