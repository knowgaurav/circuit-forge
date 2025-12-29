"""MongoDB database connection manager."""

from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings


class DatabaseManager:
    """Manages MongoDB connection lifecycle."""

    client: Optional[AsyncIOMotorClient] = None
    database: Optional[AsyncIOMotorDatabase] = None

    async def connect(self) -> None:
        """Establish database connection."""
        self.client = AsyncIOMotorClient(settings.mongodb_uri)
        self.database = self.client[settings.mongodb_database]

        # Create indexes
        await self._create_indexes()

    async def disconnect(self) -> None:
        """Close database connection."""
        if self.client:
            self.client.close()

    async def _create_indexes(self) -> None:
        """Create database indexes for optimal query performance."""
        if self.database is None:
            return

        # Sessions collection indexes
        await self.database.sessions.create_index("code", unique=True)
        await self.database.sessions.create_index("lastActivityAt")

        # Participants collection indexes
        await self.database.participants.create_index("sessionCode")
        await self.database.participants.create_index(
            [("sessionCode", 1), ("id", 1)], unique=True
        )

        # Events collection indexes
        await self.database.events.create_index("sessionCode")
        await self.database.events.create_index(
            [("sessionCode", 1), ("version", 1)], unique=True
        )

        # Snapshots collection indexes
        await self.database.snapshots.create_index(
            [("sessionCode", 1), ("version", -1)]
        )

    def get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if self.database is None:
            raise RuntimeError("Database not connected")
        return self.database


db_manager = DatabaseManager()
