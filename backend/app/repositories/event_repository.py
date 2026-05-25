"""Event repository for event sourcing operations.

Field naming: documents persist ``seq``, ``sessionId``, and ``actorId`` to
match the wire format (see ``app/events/schema.py``). The repo enforces
monotonic ``seq`` per session at the write path with a unique compound index
plus an explicit pre-check.
"""

from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.events.schema import CircuitEvent
from app.models.circuit import CircuitState


class EventOrderError(Exception):
    """Raised when an event's seq is not strictly greater than the latest seq."""


class EventDuplicateError(Exception):
    """Raised when an event's (session_id, seq) collides with an existing event."""


class EventRepository:
    """Repository for circuit event sourcing operations."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._database = database
        self._events = database["events"]
        self._snapshots = database["snapshots"]
        self._index_ready = False

    async def _ensure_indexes(self) -> None:
        """Lazily create the unique (sessionId, seq) index on first use."""
        if self._index_ready:
            return
        await self._events.create_index(
            [("sessionId", 1), ("seq", 1)],
            unique=True,
            name="events_sessionId_seq_unique",
        )
        await self._events.create_index("sessionId")
        await self._snapshots.create_index([("sessionId", 1), ("seq", -1)])
        self._index_ready = True

    # ------------------------------------------------------------------
    # Event writes
    # ------------------------------------------------------------------

    async def append_event(self, event: CircuitEvent) -> None:
        """Append a new event, enforcing strict monotonic seq per session.

        Raises:
            EventOrderError: ``event.seq`` is not strictly greater than the
                latest seq currently stored for ``event.session_id``.
            EventDuplicateError: a document with this ``(sessionId, seq)`` pair
                already exists (caught from the unique index).
        """
        await self._ensure_indexes()

        latest = await self.get_latest_seq(event.session_id)
        if event.seq <= latest:
            if event.seq == latest:
                raise EventDuplicateError(
                    f"Event seq={event.seq} for session {event.session_id} "
                    f"duplicates the latest seq"
                )
            raise EventOrderError(
                f"Event seq={event.seq} for session {event.session_id} "
                f"is not greater than latest seq {latest}"
            )

        doc = event.model_dump(by_alias=True)
        try:
            await self._events.insert_one(doc)
        except DuplicateKeyError as exc:
            raise EventDuplicateError(
                f"Event seq={event.seq} for session {event.session_id} "
                f"already exists"
            ) from exc

    # ------------------------------------------------------------------
    # Event reads
    # ------------------------------------------------------------------

    async def get_events_since_seq(
        self, session_id: str, seq: int
    ) -> list[dict[str, Any]]:
        """Get all events for a session with seq strictly greater than ``seq``."""
        cursor = self._events.find(
            {"sessionId": session_id, "seq": {"$gt": seq}}
        ).sort("seq", 1)

        events: list[dict[str, Any]] = []
        async for doc in cursor:
            doc.pop("_id", None)
            events.append(doc)
        return events

    async def get_all_events(self, session_id: str) -> list[dict[str, Any]]:
        """Get all events for a session in order."""
        return await self.get_events_since_seq(session_id, 0)

    async def get_latest_seq(self, session_id: str) -> int:
        """Get the latest event seq for a session, or 0 if there are none."""
        cursor = self._events.find({"sessionId": session_id}).sort("seq", -1).limit(1)
        async for doc in cursor:
            return doc.get("seq", 0)
        return 0

    async def get_events_in_range(
        self, session_id: str, from_seq: int, to_seq: int
    ) -> list[dict[str, Any]]:
        """Get events with from_seq < seq <= to_seq, in seq order."""
        cursor = self._events.find(
            {
                "sessionId": session_id,
                "seq": {"$gt": from_seq, "$lte": to_seq},
            }
        ).sort("seq", 1)

        events: list[dict[str, Any]] = []
        async for doc in cursor:
            doc.pop("_id", None)
            events.append(doc)
        return events

    async def get_events_by_actor(
        self, session_id: str, actor_id: str, limit: int = 50
    ) -> list[dict[str, Any]]:
        """Get recent events emitted by an actor (used for undo/redo)."""
        cursor = (
            self._events.find({"sessionId": session_id, "actorId": actor_id})
            .sort("seq", -1)
            .limit(limit)
        )

        events: list[dict[str, Any]] = []
        async for doc in cursor:
            doc.pop("_id", None)
            events.append(doc)
        return events

    async def delete_events_by_session(self, session_id: str) -> int:
        """Delete all events for a session."""
        result = await self._events.delete_many({"sessionId": session_id})
        return result.deleted_count

    async def count_events(self, session_id: str) -> int:
        """Count total events for a session."""
        return await self._events.count_documents({"sessionId": session_id})

    # ------------------------------------------------------------------
    # Snapshot operations
    # ------------------------------------------------------------------

    async def save_snapshot(
        self, session_id: str, seq: int, state: CircuitState
    ) -> None:
        """Save a circuit state snapshot at ``seq``."""
        await self._ensure_indexes()
        doc = {
            "sessionId": session_id,
            "seq": seq,
            "state": state.model_dump(by_alias=True),
            "createdAt": datetime.utcnow(),
        }
        await self._snapshots.insert_one(doc)

    async def get_latest_snapshot(self, session_id: str) -> dict[str, Any] | None:
        """Get the most recent snapshot for a session."""
        cursor = (
            self._snapshots.find({"sessionId": session_id})
            .sort("seq", -1)
            .limit(1)
        )
        async for doc in cursor:
            doc.pop("_id", None)
            return doc
        return None

    async def get_snapshot_at_or_before_seq(
        self, session_id: str, seq: int
    ) -> dict[str, Any] | None:
        """Get the latest snapshot whose seq is <= ``seq``."""
        cursor = (
            self._snapshots.find({"sessionId": session_id, "seq": {"$lte": seq}})
            .sort("seq", -1)
            .limit(1)
        )
        async for doc in cursor:
            doc.pop("_id", None)
            return doc
        return None

    async def delete_snapshots_by_session(self, session_id: str) -> int:
        """Delete all snapshots for a session."""
        result = await self._snapshots.delete_many({"sessionId": session_id})
        return result.deleted_count
