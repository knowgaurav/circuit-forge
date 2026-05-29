"""Session lifecycle: create, look up, and expire sessions.

Why this module exists separately
---------------------------------
These are the methods that deal with a *session* as a whole — minting a new
one, fetching it, checking it exists, and garbage-collecting stale ones.
Participant-level concerns live in :mod:`.participants`; replay/branch lives
in :mod:`.replay`.

Creating a session also writes an empty seq=0 snapshot, so that the very
first ``get_circuit_state`` (or any replay) always has a starting point to
build from rather than special-casing "no snapshot yet".
"""

import secrets
import string
from datetime import datetime, timedelta
from uuid import uuid4

from app.core.config import settings
from app.core.logger import enrich_context, get_logger
from app.exceptions.base import NotFoundException
from app.models.circuit import CircuitState
from app.models.session import Session

logger = get_logger()


class LifecycleMixin:
    """Create / fetch / expire sessions.

    Relies on the host class providing ``self._session_repo``,
    ``self._participant_repo``, and ``self._event_repo``.
    """

    async def create_session(self) -> tuple[Session, str]:
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

        enrich_context(operation="create_session", session_code=code)
        logger.info(f"Created new session: {code}")

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
        """Generate a unique 6-character session code.

        Tries up to 100 random codes before giving up. With 36^6 ≈ 2.2 billion
        possible codes, a collision is astronomically unlikely until the table
        is enormous, so 100 attempts is plenty of head-room.
        """
        chars = string.ascii_uppercase + string.digits

        for _ in range(100):  # Max attempts
            code = "".join(secrets.choice(chars) for _ in range(6))
            if not await self._session_repo.code_exists(code):
                return code

        raise RuntimeError("Failed to generate unique session code")
