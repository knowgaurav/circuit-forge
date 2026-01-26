"""Integration tests for Session API endpoints."""

from datetime import datetime
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.api.sessions import get_session_service
from app.main import app
from app.models.session import Participant, Role, Session


class TestCreateSession:
    """Tests for POST /api/sessions endpoint."""

    def test_create_session_returns_code_and_participant_id(self):
        """Test POST /sessions creates session and returns code."""
        mock_session = Session(
            code="ABC123",
            creatorParticipantId="creator-123",
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.create_session.return_value = (mock_session, "creator-123")

        app.dependency_overrides[get_session_service] = lambda: mock_service

        try:
            client = TestClient(app)
            response = client.post("/api/sessions")

            assert response.status_code == 200
            data = response.json()
            assert "code" in data
            assert "participantId" in data
            assert data["code"] == "ABC123"
            assert data["participantId"] == "creator-123"
        finally:
            app.dependency_overrides.clear()


class TestGetSession:
    """Tests for GET /api/sessions/{code} endpoint."""

    def test_get_session_returns_session_info(self):
        """Test GET /sessions/{code} returns session info."""
        mock_service = AsyncMock()
        mock_service.session_exists.return_value = True
        mock_service.get_session_participants.return_value = [
            Participant(
                id="p1",
                sessionCode="ABC123",
                displayName="User 1",
                role=Role.TEACHER,
                canEdit=True,
                color="#FF5733",
                isActive=True,
                lastSeenAt=datetime.utcnow(),
            ),
            Participant(
                id="p2",
                sessionCode="ABC123",
                displayName="User 2",
                role=Role.STUDENT,
                canEdit=False,
                color="#33A1FF",
                isActive=True,
                lastSeenAt=datetime.utcnow(),
            ),
        ]

        app.dependency_overrides[get_session_service] = lambda: mock_service

        try:
            client = TestClient(app)
            response = client.get("/api/sessions/ABC123")

            assert response.status_code == 200
            data = response.json()
            assert data["code"] == "ABC123"
            assert data["exists"] is True
            assert data["participantCount"] == 2
        finally:
            app.dependency_overrides.clear()

    def test_get_nonexistent_session_returns_exists_false(self):
        """Test GET /sessions/{code} for non-existent session."""
        mock_service = AsyncMock()
        mock_service.session_exists.return_value = False

        app.dependency_overrides[get_session_service] = lambda: mock_service

        try:
            client = TestClient(app)
            response = client.get("/api/sessions/NOTFOUND")

            assert response.status_code == 200
            data = response.json()
            assert data["code"] == "NOTFOUND"
            assert data["exists"] is False
            assert data["participantCount"] == 0
        finally:
            app.dependency_overrides.clear()


class TestJoinSession:
    """Tests for POST /api/sessions/{code}/join endpoint."""

    def test_join_session_with_valid_name(self):
        """Test POST /sessions/{code}/join with valid name."""
        mock_participant = Participant(
            id="new-participant-123",
            sessionCode="ABC123",
            displayName="Test User",
            role=Role.STUDENT,
            canEdit=False,
            color="#FF5733",
            isActive=True,
            lastSeenAt=datetime.utcnow(),
        )

        mock_service = AsyncMock()
        mock_service.join_session.return_value = mock_participant

        app.dependency_overrides[get_session_service] = lambda: mock_service

        try:
            client = TestClient(app)
            response = client.post(
                "/api/sessions/ABC123/join",
                json={"displayName": "Test User"},
            )

            assert response.status_code == 200
            data = response.json()
            assert "participant" in data
            assert data["participant"]["displayName"] == "Test User"
            assert data["participant"]["sessionCode"] == "ABC123"
            assert data["participant"]["role"] == "student"
        finally:
            app.dependency_overrides.clear()

    def test_join_session_with_invalid_name_too_short(self):
        """Test POST /sessions/{code}/join with invalid name returns 422."""
        mock_service = AsyncMock()
        app.dependency_overrides[get_session_service] = lambda: mock_service

        try:
            client = TestClient(app, raise_server_exceptions=False)
            response = client.post(
                "/api/sessions/ABC123/join",
                json={"displayName": "AB"},  # Too short (min 3)
            )

            assert response.status_code == 422  # Pydantic validation error
        finally:
            app.dependency_overrides.clear()

    def test_join_session_with_invalid_name_too_long(self):
        """Test POST /sessions/{code}/join with name too long returns 422."""
        mock_service = AsyncMock()
        app.dependency_overrides[get_session_service] = lambda: mock_service

        try:
            client = TestClient(app, raise_server_exceptions=False)
            response = client.post(
                "/api/sessions/ABC123/join",
                json={"displayName": "A" * 25},  # Too long (max 20)
            )

            assert response.status_code == 422  # Pydantic validation error
        finally:
            app.dependency_overrides.clear()

    def test_join_session_with_special_characters_rejected(self):
        """Test POST /sessions/{code}/join with special characters in name."""
        from app.exceptions.base import ValidationException

        mock_service = AsyncMock()
        mock_service.join_session.side_effect = ValidationException(
            code="INVALID_DISPLAY_NAME",
            message="Display name must be 3-20 characters, alphanumeric and spaces only",
        )

        app.dependency_overrides[get_session_service] = lambda: mock_service

        try:
            client = TestClient(app)
            response = client.post(
                "/api/sessions/ABC123/join",
                json={"displayName": "Test@User!"},
            )

            assert response.status_code == 400
            data = response.json()
            assert "detail" in data
            assert data["detail"]["error"]["code"] == "INVALID_DISPLAY_NAME"
        finally:
            app.dependency_overrides.clear()
