"""The ``SessionService`` class — wires the repositories to the mixins.

This is the thin assembly point. All behavior lives in the mixins:

* :class:`LifecycleMixin`     — create / fetch / expire sessions.
* :class:`ParticipantsMixin`  — join, presence, roles, color.
* :class:`ReplayMixin`        — state-at-seq and branching (Story C).

``__init__`` constructs the three repositories every mixin reads through.
The mixins define disjoint method sets, so inheritance order only matters
for ``__init__`` (defined here, not in any mixin).
"""

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.event_repository import EventRepository
from app.repositories.participant_repository import ParticipantRepository
from app.repositories.session_repository import SessionRepository

from .lifecycle import LifecycleMixin
from .participants import ParticipantsMixin
from .replay import ReplayMixin


class SessionService(LifecycleMixin, ParticipantsMixin, ReplayMixin):
    """Service for managing collaborative sessions."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        """Initialize session service with repositories."""
        self._session_repo = SessionRepository(database)
        self._participant_repo = ParticipantRepository(database)
        self._event_repo = EventRepository(database)
        self._database = database
