"""Session repository for database operations."""

from datetime import datetime
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.session import Session
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[Session]):
    """Repository for session database operations."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        """Initialize session repository."""
        super().__init__(database, "sessions", Session)

    async def find_by_code(self, code: str) -> Optional[Session]:
        """Find a session by its code."""
        return await self.find_one({"code": code})

    async def create(self, session: Session) -> None:
        """Create a new session."""
        await self.insert_one(session)

    async def update_activity(self, code: str) -> bool:
        """Update the last activity timestamp for a session."""
        return await self.update_one(
            {"code": code},
            {"lastActivityAt": datetime.utcnow()},
        )

    async def delete_by_code(self, code: str) -> bool:
        """Delete a session by its code."""
        return await self.delete_one({"code": code})

    async def delete_inactive_sessions(self, before: datetime) -> int:
        """Delete sessions that have been inactive since before the given time."""
        return await self.delete_many({"lastActivityAt": {"$lt": before}})

    async def code_exists(self, code: str) -> bool:
        """Check if a session code already exists."""
        return await self.exists({"code": code})
