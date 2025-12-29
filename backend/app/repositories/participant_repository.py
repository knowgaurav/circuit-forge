"""Participant repository for database operations."""

from datetime import datetime
from typing import List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.session import Participant
from app.repositories.base import BaseRepository


class ParticipantRepository(BaseRepository[Participant]):
    """Repository for participant database operations."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        """Initialize participant repository."""
        super().__init__(database, "participants", Participant)

    async def find_by_id(
        self, session_code: str, participant_id: str
    ) -> Optional[Participant]:
        """Find a participant by session code and participant ID."""
        return await self.find_one(
            {"sessionCode": session_code, "id": participant_id}
        )

    async def find_by_session(self, session_code: str) -> List[Participant]:
        """Find all participants in a session."""
        return await self.find_many({"sessionCode": session_code}, limit=100)

    async def find_active_by_session(self, session_code: str) -> List[Participant]:
        """Find all active participants in a session."""
        return await self.find_many(
            {"sessionCode": session_code, "isActive": True}, limit=100
        )

    async def create(self, participant: Participant) -> None:
        """Create a new participant."""
        await self.insert_one(participant)

    async def update_active_status(
        self, session_code: str, participant_id: str, is_active: bool
    ) -> bool:
        """Update participant's active status."""
        update_data = {
            "isActive": is_active,
            "lastSeenAt": datetime.utcnow(),
        }
        return await self.update_one(
            {"sessionCode": session_code, "id": participant_id},
            update_data,
        )

    async def update_can_edit(
        self, session_code: str, participant_id: str, can_edit: bool
    ) -> bool:
        """Update participant's edit permission."""
        return await self.update_one(
            {"sessionCode": session_code, "id": participant_id},
            {"canEdit": can_edit},
        )

    async def update_last_seen(
        self, session_code: str, participant_id: str
    ) -> bool:
        """Update participant's last seen timestamp."""
        return await self.update_one(
            {"sessionCode": session_code, "id": participant_id},
            {"lastSeenAt": datetime.utcnow()},
        )

    async def delete_by_session(self, session_code: str) -> int:
        """Delete all participants in a session."""
        return await self.delete_many({"sessionCode": session_code})

    async def delete_participant(
        self, session_code: str, participant_id: str
    ) -> bool:
        """Delete a specific participant from a session."""
        result = await self.delete_many(
            {"sessionCode": session_code, "id": participant_id}
        )
        return result > 0

    async def count_by_session(self, session_code: str) -> int:
        """Count participants in a session."""
        return await self.count({"sessionCode": session_code})

    async def get_used_colors(self, session_code: str) -> List[str]:
        """Get list of colors already used in a session."""
        participants = await self.find_by_session(session_code)
        return [p.color for p in participants]
