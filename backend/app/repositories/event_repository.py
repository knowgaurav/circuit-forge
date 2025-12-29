"""Event repository for event sourcing operations."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.circuit import CircuitState
from app.models.events import CircuitEvent


class EventRepository:
    """Repository for circuit event sourcing operations."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        """Initialize event repository."""
        self._database = database
        self._events = database["events"]
        self._snapshots = database["snapshots"]

    async def append_event(self, event: CircuitEvent) -> None:
        """Append a new event to the event store."""
        doc = event.model_dump(by_alias=True)
        await self._events.insert_one(doc)

    async def get_events_since_version(
        self, session_code: str, version: int
    ) -> List[Dict[str, Any]]:
        """Get all events for a session since a specific version."""
        cursor = self._events.find(
            {"sessionCode": session_code, "version": {"$gt": version}}
        ).sort("version", 1)
        
        events = []
        async for doc in cursor:
            doc.pop("_id", None)
            events.append(doc)
        return events

    async def get_all_events(self, session_code: str) -> List[Dict[str, Any]]:
        """Get all events for a session in order."""
        return await self.get_events_since_version(session_code, 0)

    async def get_latest_version(self, session_code: str) -> int:
        """Get the latest event version for a session."""
        cursor = self._events.find(
            {"sessionCode": session_code}
        ).sort("version", -1).limit(1)
        
        async for doc in cursor:
            return doc.get("version", 0)
        return 0

    async def get_events_by_user(
        self, session_code: str, user_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get recent events by a specific user (for undo/redo)."""
        cursor = self._events.find(
            {"sessionCode": session_code, "userId": user_id}
        ).sort("version", -1).limit(limit)
        
        events = []
        async for doc in cursor:
            doc.pop("_id", None)
            events.append(doc)
        return events

    async def delete_events_by_session(self, session_code: str) -> int:
        """Delete all events for a session."""
        result = await self._events.delete_many({"sessionCode": session_code})
        return result.deleted_count

    # Snapshot operations
    async def save_snapshot(
        self, session_code: str, version: int, state: CircuitState
    ) -> None:
        """Save a circuit state snapshot."""
        doc = {
            "sessionCode": session_code,
            "version": version,
            "state": state.model_dump(by_alias=True),
            "createdAt": datetime.utcnow(),
        }
        await self._snapshots.insert_one(doc)

    async def get_latest_snapshot(
        self, session_code: str
    ) -> Optional[Dict[str, Any]]:
        """Get the most recent snapshot for a session."""
        cursor = self._snapshots.find(
            {"sessionCode": session_code}
        ).sort("version", -1).limit(1)
        
        async for doc in cursor:
            doc.pop("_id", None)
            return doc
        return None

    async def get_snapshot_at_version(
        self, session_code: str, version: int
    ) -> Optional[Dict[str, Any]]:
        """Get the snapshot at or before a specific version."""
        cursor = self._snapshots.find(
            {"sessionCode": session_code, "version": {"$lte": version}}
        ).sort("version", -1).limit(1)
        
        async for doc in cursor:
            doc.pop("_id", None)
            return doc
        return None

    async def delete_snapshots_by_session(self, session_code: str) -> int:
        """Delete all snapshots for a session."""
        result = await self._snapshots.delete_many({"sessionCode": session_code})
        return result.deleted_count

    async def count_events(self, session_code: str) -> int:
        """Count total events for a session."""
        return await self._events.count_documents({"sessionCode": session_code})
