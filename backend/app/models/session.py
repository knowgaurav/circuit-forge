"""Session and participant Pydantic models."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class Role(str, Enum):
    """Participant role."""

    TEACHER = "teacher"
    STUDENT = "student"


class EditRequestStatus(str, Enum):
    """Edit request status."""

    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"


class Session(BaseModel):
    """A collaborative session."""

    code: str = Field(pattern=r"^[A-Z0-9]{6}$")
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    last_activity_at: datetime = Field(
        default_factory=datetime.utcnow, alias="lastActivityAt"
    )
    creator_participant_id: str = Field(alias="creatorParticipantId")

    model_config = {"populate_by_name": True}


class Participant(BaseModel):
    """A session participant."""

    id: str
    session_code: str = Field(alias="sessionCode")
    display_name: str = Field(
        min_length=3, max_length=20, alias="displayName"
    )
    role: Role
    can_edit: bool = Field(alias="canEdit")
    color: str
    is_active: bool = Field(default=True, alias="isActive")
    last_seen_at: datetime = Field(
        default_factory=datetime.utcnow, alias="lastSeenAt"
    )

    model_config = {"populate_by_name": True}

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        """Validate display name contains only alphanumeric and spaces."""
        if not all(c.isalnum() or c == " " for c in v):
            raise ValueError("Display name must contain only alphanumeric characters and spaces")
        return v


class EditRequest(BaseModel):
    """An edit permission request."""

    participant_id: str = Field(alias="participantId")
    display_name: str = Field(alias="displayName")
    requested_at: datetime = Field(
        default_factory=datetime.utcnow, alias="requestedAt"
    )
    status: EditRequestStatus = EditRequestStatus.PENDING

    model_config = {"populate_by_name": True}
