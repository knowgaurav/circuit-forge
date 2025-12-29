"""Session management service."""

import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.exceptions.base import NotFoundException, ValidationException
from app.models.circuit import CircuitState
from app.models.session import Participant, Role, Session
from app.repositories.event_repository import EventRepository
from app.repositories.participant_repository import ParticipantRepository
from app.repositories.session_repository import SessionRepository


# Cursor colors for participants (8 distinct colors)
CURSOR_COLORS = [
    "#FF5733",  # Red-Orange
    "#33A1FF",  # Blue
    "#33FF57",  # Green
    "#FF33F5",  # Pink
    "#FFD433",  # Yellow
    "#9B33FF",  # Purple
    "#33FFF5",  # Cyan
    "#FF8C33",  # Orange
]


class SessionService:
    """Service for managing collaborative sessions."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        """Initialize session service with repositories."""
        self._session_repo = SessionRepository(database)
        self._participant_repo = ParticipantRepository(database)
        self._event_repo = EventRepository(database)
        self._database = database

    async def create_session(self) -> Tuple[Session, str]:
        """
        Create a new collaborative session.
        
        Returns:
            Tuple of (Session, participant_id for the creator)
        """
        # Generate unique session code
        code = await self._generate_unique_code()
        
        # Generate participant ID for creator
        creator_id = str(uuid4())
        
        # Create session
        session = Session(
            code=code,
            creatorParticipantId=creator_id,
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        
        await self._session_repo.create(session)
        
        # Initialize empty circuit state snapshot
        initial_state = CircuitState.create_empty(code)
        await self._event_repo.save_snapshot(code, 0, initial_state)
        
        return session, creator_id

    async def get_session(self, code: str) -> Session:
        """Get session by code."""
        session = await self._session_repo.find_by_code(code)
        if session is None:
            raise NotFoundException("Session", code)
        return session

    async def session_exists(self, code: str) -> bool:
        """Check if a session exists."""
        return await self._session_repo.code_exists(code)

    async def join_session(
        self,
        code: str,
        display_name: str,
        participant_id: Optional[str] = None,
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
        
        # Debug logging
        import logging
        logging.info(f"Join session: new_id={new_id}, creator_id={session.creator_participant_id}, is_creator={is_creator}, can_edit={can_edit}")
        
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
    ) -> Optional[Participant]:
        """Get a participant by ID."""
        return await self._participant_repo.find_by_id(code, participant_id)

    async def get_session_participants(self, code: str) -> List[Participant]:
        """Get all participants in a session."""
        return await self._participant_repo.find_by_session(code)

    async def get_active_participants(self, code: str) -> List[Participant]:
        """Get all active participants in a session."""
        return await self._participant_repo.find_active_by_session(code)

    async def mark_participant_inactive(
        self, code: str, participant_id: str
    ) -> bool:
        """Mark a participant as inactive (disconnected)."""
        return await self._participant_repo.update_active_status(
            code, participant_id, False
        )

    async def remove_participant(
        self, code: str, participant_id: str
    ) -> bool:
        """Permanently remove a participant from a session (kick)."""
        return await self._participant_repo.delete_participant(
            code, participant_id
        )

    async def mark_participant_active(
        self, code: str, participant_id: str
    ) -> bool:
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

    async def cleanup_inactive_sessions(self) -> int:
        """
        Delete sessions that have been inactive for more than 24 hours.
        
        Returns:
            Number of sessions deleted
        """
        cutoff = datetime.utcnow() - timedelta(hours=settings.session_expiry_hours)
        
        # Find inactive sessions
        inactive_sessions = await self._session_repo.find_many(
            {"lastActivityAt": {"$lt": cutoff}}, limit=1000
        )
        
        deleted_count = 0
        for session in inactive_sessions:
            # Delete all related data
            await self._participant_repo.delete_by_session(session.code)
            await self._event_repo.delete_events_by_session(session.code)
            await self._event_repo.delete_snapshots_by_session(session.code)
            await self._session_repo.delete_by_code(session.code)
            deleted_count += 1
        
        return deleted_count

    async def _generate_unique_code(self) -> str:
        """Generate a unique 6-character session code."""
        chars = string.ascii_uppercase + string.digits
        
        for _ in range(100):  # Max attempts
            code = "".join(secrets.choice(chars) for _ in range(6))
            if not await self._session_repo.code_exists(code):
                return code
        
        raise RuntimeError("Failed to generate unique session code")

    async def _assign_color(self, code: str) -> str:
        """Assign a unique cursor color to a participant."""
        used_colors = await self._participant_repo.get_used_colors(code)
        
        # Find first unused color
        for color in CURSOR_COLORS:
            if color not in used_colors:
                return color
        
        # If all colors used, cycle through
        participant_count = await self._participant_repo.count_by_session(code)
        return CURSOR_COLORS[participant_count % len(CURSOR_COLORS)]

    def _validate_display_name(self, name: str) -> bool:
        """Validate display name format."""
        if len(name) < 3 or len(name) > 20:
            return False
        return all(c.isalnum() or c == " " for c in name)
