"""MongoDB database connection manager."""

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages MongoDB connection lifecycle."""

    client: AsyncIOMotorClient | None = None
    database: AsyncIOMotorDatabase | None = None

    async def connect(self) -> None:
        """Establish database connection."""
        logger.info(f"Connecting to MongoDB at {settings.mongodb_uri}...")
        self.client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
        )
        self.database = self.client[settings.mongodb_database]

        # Test connection
        try:
            await self.client.admin.command("ping")
            logger.info("MongoDB connected successfully")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            raise

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
