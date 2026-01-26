"""Unit tests for SessionService.

Tests session creation, joining, participant management, and validation.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from app.services.session_service import SessionService, CURSOR_COLORS
from app.models.session import Participant, Role, Session
from app.exceptions.base import NotFoundException, ValidationException


@pytest.fixture
def mock_db():
    """Create a mock database."""
    return MagicMock()


@pytest.fixture
def session_service(mock_db):
    """Create a SessionService with mocked repositories."""
    service = SessionService(mock_db)
    service._session_repo = AsyncMock()
    service._participant_repo = AsyncMock()
    service._event_repo = AsyncMock()
    return service


class TestSessionCreation:
    """Tests for session creation."""

    @pytest.mark.asyncio
    async def test_create_session_generates_valid_code(self, session_service):
        """Session creation generates a 6-character alphanumeric code."""
        session_service._session_repo.code_exists.return_value = False
        session_service._session_repo.create.return_value = None
        session_service._event_repo.save_snapshot.return_value = None

        session, creator_id = await session_service.create_session()

        assert len(session.code) == 6
        assert session.code.isalnum()
        assert session.code.isupper() or session.code.isdigit() or all(
            c.isupper() or c.isdigit() for c in session.code
        )
        assert creator_id is not None
        assert session.creator_participant_id == creator_id


class TestJoinSession:
    """Tests for joining sessions."""

    @pytest.mark.asyncio
    async def test_join_session_creates_participant_with_student_role(self, session_service):
        """Joining a session as non-creator creates participant with STUDENT role."""
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session
        session_service._participant_repo.find_by_id.return_value = None
        session_service._participant_repo.get_used_colors.return_value = []
        session_service._participant_repo.create.return_value = None
        session_service._session_repo.update_activity.return_value = True

        participant = await session_service.join_session("ABC123", "Test User")

        assert participant.role == Role.STUDENT
        assert participant.can_edit is False
        assert participant.display_name == "Test User"
        assert participant.session_code == "ABC123"

    @pytest.mark.asyncio
    async def test_join_session_as_creator_gets_teacher_role(self, session_service):
        """Joining a session with creator ID gets TEACHER role."""
        creator_id = "creator-id"
        session = Session(
            code="ABC123",
            creatorParticipantId=creator_id,
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session
        session_service._participant_repo.find_by_id.return_value = None
        session_service._participant_repo.get_used_colors.return_value = []
        session_service._participant_repo.create.return_value = None
        session_service._session_repo.update_activity.return_value = True

        participant = await session_service.join_session(
            "ABC123", "Teacher Name", participant_id=creator_id
        )

        assert participant.role == Role.TEACHER
        assert participant.can_edit is True


class TestDisplayNameValidation:
    """Tests for display name validation."""

    @pytest.mark.asyncio
    async def test_valid_display_name_alphanumeric(self, session_service):
        """Valid alphanumeric display name is accepted."""
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session
        session_service._participant_repo.find_by_id.return_value = None
        session_service._participant_repo.get_used_colors.return_value = []
        session_service._participant_repo.create.return_value = None
        session_service._session_repo.update_activity.return_value = True

        participant = await session_service.join_session("ABC123", "JohnDoe123")

        assert participant.display_name == "JohnDoe123"

    @pytest.mark.asyncio
    async def test_valid_display_name_with_spaces(self, session_service):
        """Valid display name with spaces is accepted."""
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session
        session_service._participant_repo.find_by_id.return_value = None
        session_service._participant_repo.get_used_colors.return_value = []
        session_service._participant_repo.create.return_value = None
        session_service._session_repo.update_activity.return_value = True

        participant = await session_service.join_session("ABC123", "John Doe")

        assert participant.display_name == "John Doe"

    @pytest.mark.asyncio
    async def test_invalid_display_name_too_short(self, session_service):
        """Display name shorter than 3 characters is rejected."""
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session

        with pytest.raises(ValidationException) as exc_info:
            await session_service.join_session("ABC123", "AB")

        assert exc_info.value.code == "INVALID_DISPLAY_NAME"

    @pytest.mark.asyncio
    async def test_invalid_display_name_too_long(self, session_service):
        """Display name longer than 20 characters is rejected."""
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session

        with pytest.raises(ValidationException) as exc_info:
            await session_service.join_session("ABC123", "A" * 21)

        assert exc_info.value.code == "INVALID_DISPLAY_NAME"

    @pytest.mark.asyncio
    async def test_invalid_display_name_special_characters(self, session_service):
        """Display name with special characters is rejected."""
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session

        with pytest.raises(ValidationException) as exc_info:
            await session_service.join_session("ABC123", "John@Doe!")

        assert exc_info.value.code == "INVALID_DISPLAY_NAME"


class TestColorAssignment:
    """Tests for color assignment."""

    @pytest.mark.asyncio
    async def test_first_participant_gets_first_color(self, session_service):
        """First participant gets the first available color."""
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session
        session_service._participant_repo.find_by_id.return_value = None
        session_service._participant_repo.get_used_colors.return_value = []
        session_service._participant_repo.create.return_value = None
        session_service._session_repo.update_activity.return_value = True

        participant = await session_service.join_session("ABC123", "User One")

        assert participant.color == CURSOR_COLORS[0]

    @pytest.mark.asyncio
    async def test_second_participant_gets_second_color(self, session_service):
        """Second participant gets the second available color."""
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session
        session_service._participant_repo.find_by_id.return_value = None
        session_service._participant_repo.get_used_colors.return_value = [CURSOR_COLORS[0]]
        session_service._participant_repo.create.return_value = None
        session_service._session_repo.update_activity.return_value = True

        participant = await session_service.join_session("ABC123", "User Two")

        assert participant.color == CURSOR_COLORS[1]

    @pytest.mark.asyncio
    async def test_color_cycles_when_all_used(self, session_service):
        """Colors cycle when all colors are used."""
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session
        session_service._participant_repo.find_by_id.return_value = None
        session_service._participant_repo.get_used_colors.return_value = CURSOR_COLORS.copy()
        session_service._participant_repo.count_by_session.return_value = 8
        session_service._participant_repo.create.return_value = None
        session_service._session_repo.update_activity.return_value = True

        participant = await session_service.join_session("ABC123", "User Nine")

        # 9th participant (index 8) should get color at index 8 % 8 = 0
        assert participant.color == CURSOR_COLORS[0]


class TestRejoin:
    """Tests for rejoining sessions."""

    @pytest.mark.asyncio
    async def test_rejoin_with_existing_participant_id(self, session_service):
        """Rejoining with existing participant ID reactivates the participant."""
        existing_participant = Participant(
            id="existing-id",
            sessionCode="ABC123",
            displayName="Existing User",
            role=Role.STUDENT,
            canEdit=False,
            color="#FF5733",
            isActive=False,
            lastSeenAt=datetime.utcnow(),
        )
        session = Session(
            code="ABC123",
            creatorParticipantId="creator-id",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )
        session_service._session_repo.find_by_code.return_value = session
        session_service._participant_repo.find_by_id.return_value = existing_participant
        session_service._participant_repo.update_active_status.return_value = True
        session_service._session_repo.update_activity.return_value = True

        participant = await session_service.join_session(
            "ABC123", "New Name", participant_id="existing-id"
        )

        assert participant.id == "existing-id"
        assert participant.display_name == "Existing User"  # Original name preserved
        session_service._participant_repo.update_active_status.assert_called_once_with(
            "ABC123", "existing-id", True
        )
