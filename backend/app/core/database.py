"""MongoDB database connection manager."""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger()


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

        # Events collection indexes (sessionId + seq is the new field naming;
        # see app/events/schema.py and EventRepository.append_event for the
        # write-path enforcement that pairs with this unique index).
        await self._drop_stale_events_indexes()
        await self.database.events.create_index("sessionId")
        await self.database.events.create_index(
            [("sessionId", 1), ("seq", 1)],
            unique=True,
            name="events_sessionId_seq_unique",
        )

        # Snapshots collection indexes
        await self.database.snapshots.create_index([("sessionId", 1), ("seq", -1)])

    async def _drop_stale_events_indexes(self) -> None:
        """Drop orphaned ``events`` indexes from the pre-``sessionId`` schema.

        Older builds keyed events on ``sessionCode``/``version``. Event
        documents no longer carry those fields, so a leftover unique index on
        them makes every event collide on ``(null, null)`` after the first
        insert. Drop any events index whose key references those fields so the
        correct ``(sessionId, seq)`` index is the only constraint.
        """
        try:
            indexes = await self.database.events.index_information()
        except Exception as e:
            logger.warning(f"Could not inspect events indexes: {e}")
            return

        for name, info in indexes.items():
            if name == "_id_":
                continue
            keyed_fields = {field for field, _direction in info.get("key", [])}
            if keyed_fields & {"sessionCode", "version"}:
                try:
                    await self.database.events.drop_index(name)
                    logger.info(f"Dropped stale events index: {name}")
                except Exception as e:
                    logger.warning(f"Failed to drop stale events index {name}: {e}")

    def get_database(self) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if self.database is None:
            raise RuntimeError("Database not connected")
        return self.database


db_manager = DatabaseManager()
