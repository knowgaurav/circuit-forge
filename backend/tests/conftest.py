"""Shared test fixtures and configuration."""

from datetime import datetime
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.models.circuit import (
    CircuitComponent,
    CircuitState,
    ComponentType,
    Pin,
    PinType,
    Position,
    Rotation,
    Wire,
)
from app.models.session import Participant, Role, Session


# ============================================================================
# Database Fixtures
# ============================================================================


@pytest.fixture
def mock_database() -> MagicMock:
    """Create a mock AsyncIOMotorDatabase."""
    db = MagicMock()
    db.__getitem__ = MagicMock(return_value=AsyncMock())
    return db


@pytest.fixture
def mock_collection() -> AsyncMock:
    """Create a mock MongoDB collection."""
    collection = AsyncMock()
    collection.find_one = AsyncMock(return_value=None)
    collection.insert_one = AsyncMock()
    collection.update_one = AsyncMock()
    collection.delete_one = AsyncMock()
    collection.delete_many = AsyncMock()
    collection.count_documents = AsyncMock(return_value=0)
    return collection


# ============================================================================
# Session Fixtures
# ============================================================================


@pytest.fixture
def sample_session() -> Session:
    """Create a sample session for testing."""
    return Session(
        code="ABC123",
        creatorParticipantId="creator-123",
        createdAt=datetime.utcnow(),
        lastActivityAt=datetime.utcnow(),
    )


@pytest.fixture
def sample_participant() -> Participant:
    """Create a sample participant for testing."""
    return Participant(
        id="participant-123",
        sessionCode="ABC123",
        displayName="Test User",
        role=Role.STUDENT,
        canEdit=False,
        color="#FF5733",
        isActive=True,
        lastSeenAt=datetime.utcnow(),
    )


# ============================================================================
# Circuit Fixtures
# ============================================================================


@pytest.fixture
def sample_position() -> Position:
    """Create a sample position."""
    return Position(x=100.0, y=200.0)


@pytest.fixture
def sample_switch() -> CircuitComponent:
    """Create a sample toggle switch component."""
    return CircuitComponent(
        id="switch-1",
        type=ComponentType.SWITCH_TOGGLE,
        position=Position(x=100, y=100),
        rotation=Rotation.DEG_0,
        properties={"state": False},
        pins=[
            Pin(id="OUT", name="OUT", type=PinType.OUTPUT, position=Position(x=20, y=0))
        ],
    )


@pytest.fixture
def sample_and_gate() -> CircuitComponent:
    """Create a sample AND gate component."""
    return CircuitComponent(
        id="and-1",
        type=ComponentType.AND_2,
        position=Position(x=200, y=100),
        rotation=Rotation.DEG_0,
        properties={},
        pins=[
            Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-30, y=-10)),
            Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=-30, y=10)),
            Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=30, y=0)),
        ],
    )


@pytest.fixture
def sample_led() -> CircuitComponent:
    """Create a sample LED component."""
    return CircuitComponent(
        id="led-1",
        type=ComponentType.LED_RED,
        position=Position(x=300, y=100),
        rotation=Rotation.DEG_0,
        properties={},
        pins=[
            Pin(id="IN", name="IN", type=PinType.INPUT, position=Position(x=-15, y=0))
        ],
    )


@pytest.fixture
def sample_circuit_state(sample_switch, sample_and_gate, sample_led) -> CircuitState:
    """Create a sample circuit state with switch -> AND -> LED."""
    wire1 = Wire(
        id="wire-1",
        fromComponentId="switch-1",
        fromPinId="OUT",
        toComponentId="and-1",
        toPinId="A",
        waypoints=[],
    )
    wire2 = Wire(
        id="wire-2",
        fromComponentId="and-1",
        fromPinId="Y",
        toComponentId="led-1",
        toPinId="IN",
        waypoints=[],
    )

    return CircuitState(
        sessionId="ABC123",
        version=1,
        schemaVersion="1.0.0",
        components=[sample_switch, sample_and_gate, sample_led],
        wires=[wire1, wire2],
        annotations=[],
        updatedAt=datetime.utcnow(),
    )


@pytest.fixture
def empty_circuit_state() -> CircuitState:
    """Create an empty circuit state."""
    return CircuitState.create_empty("ABC123")


# ============================================================================
# API Test Client
# ============================================================================


@pytest.fixture
def test_client() -> TestClient:
    """Create a FastAPI test client."""
    from app.main import app

    return TestClient(app)
