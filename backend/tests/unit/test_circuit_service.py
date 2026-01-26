"""Unit tests for CircuitService.

Tests circuit operations with event sourcing: add/delete components, wire validation.
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

from app.services.circuit_service import CircuitService
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
from app.models.events import (
    CircuitEventType,
    ComponentAddedEvent,
    WireAddedEvent,
)
from app.exceptions.base import ValidationException
from tests.factories import ComponentFactory, WireFactory


@pytest.fixture
def mock_db():
    """Create a mock database."""
    db = MagicMock()
    db.__getitem__ = MagicMock(return_value=AsyncMock())
    return db


@pytest.fixture
def circuit_service(mock_db):
    """Create a CircuitService with mocked event repository."""
    service = CircuitService(mock_db)
    service._event_repo = AsyncMock()
    return service


class TestAddComponent:
    """Tests for adding components."""

    @pytest.mark.asyncio
    async def test_add_component_creates_event_and_updates_state(self, circuit_service):
        """Adding a component creates an event and updates circuit state."""
        session_code = "ABC123"
        user_id = "user-1"
        component = ComponentFactory.create_and_gate(id="and-1")

        # Mock repository responses
        circuit_service._event_repo.get_latest_version.return_value = 0
        circuit_service._event_repo.append_event.return_value = None
        circuit_service._event_repo.get_latest_snapshot.return_value = None
        circuit_service._event_repo.get_events_since_version.return_value = [
            {
                "type": CircuitEventType.COMPONENT_ADDED,
                "version": 1,
                "payload": {"component": component.model_dump(by_alias=True)},
            }
        ]

        event, state = await circuit_service.add_component(session_code, user_id, component)

        # Verify event was created
        assert isinstance(event, ComponentAddedEvent)
        assert event.session_code == session_code
        assert event.user_id == user_id
        assert event.payload.component.id == "and-1"
        assert event.version == 1

        # Verify event was appended
        circuit_service._event_repo.append_event.assert_called_once()

        # Verify state contains the component
        assert len(state.components) == 1
        assert state.components[0].id == "and-1"


class TestDeleteComponent:
    """Tests for deleting components."""

    @pytest.mark.asyncio
    async def test_delete_component_cascades_to_connected_wires(self, circuit_service):
        """Deleting a component also deletes all connected wires."""
        session_code = "ABC123"
        user_id = "user-1"

        # Create components
        switch = ComponentFactory.create_switch(id="switch-1")
        and_gate = ComponentFactory.create_and_gate(id="and-1")
        led = ComponentFactory.create_led(id="led-1")

        # Create wires connected to and-1
        wire1 = WireFactory.create("switch-1", "OUT", "and-1", "A", id="wire-1")
        wire2 = WireFactory.create("and-1", "Y", "led-1", "IN", id="wire-2")

        # Initial state with component and wires
        initial_state = CircuitState(
            sessionId=session_code,
            version=3,
            schemaVersion="1.0.0",
            components=[switch, and_gate, led],
            wires=[wire1, wire2],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        # Track version increments
        version_counter = [3]

        def get_next_version(*args):
            version_counter[0] += 1
            return version_counter[0] - 1

        circuit_service._event_repo.get_latest_version.side_effect = get_next_version
        circuit_service._event_repo.append_event.return_value = None
        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "version": 3,
            "state": initial_state.model_dump(by_alias=True),
        }

        # Track calls to get_events_since_version to return different results
        call_count = [0]

        def get_events_since_version_side_effect(*args):
            call_count[0] += 1
            if call_count[0] == 1:
                # First call: return empty (state comes from snapshot)
                return []
            else:
                # Subsequent calls: return deletion events
                return [
                    {"type": CircuitEventType.WIRE_DELETED, "version": 4, "payload": {"wireId": "wire-1"}},
                    {"type": CircuitEventType.WIRE_DELETED, "version": 5, "payload": {"wireId": "wire-2"}},
                    {"type": CircuitEventType.COMPONENT_DELETED, "version": 6, "payload": {"componentId": "and-1"}},
                ]

        circuit_service._event_repo.get_events_since_version.side_effect = get_events_since_version_side_effect

        events, state = await circuit_service.delete_component(session_code, user_id, "and-1")

        # Should have 3 events: 2 wire deletions + 1 component deletion
        assert len(events) == 3

        # First two events should be wire deletions
        assert events[0].type == CircuitEventType.WIRE_DELETED
        assert events[1].type == CircuitEventType.WIRE_DELETED

        # Last event should be component deletion
        assert events[2].type == CircuitEventType.COMPONENT_DELETED
        assert events[2].payload.component_id == "and-1"

        # Verify append_event was called 3 times
        assert circuit_service._event_repo.append_event.call_count == 3


class TestWireValidation:
    """Tests for wire validation."""

    @pytest.mark.asyncio
    async def test_wire_must_connect_output_to_input(self, circuit_service):
        """Wire must start from output pin and end at input pin."""
        session_code = "ABC123"
        user_id = "user-1"

        # Create components
        and_gate1 = ComponentFactory.create_and_gate(id="and-1")
        and_gate2 = ComponentFactory.create_and_gate(id="and-2")

        # State with two AND gates
        state = CircuitState(
            sessionId=session_code,
            version=2,
            schemaVersion="1.0.0",
            components=[and_gate1, and_gate2],
            wires=[],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "version": 2,
            "state": state.model_dump(by_alias=True),
        }
        circuit_service._event_repo.get_events_since_version.return_value = []

        # Try to create wire from input to input (invalid)
        invalid_wire = Wire(
            id="wire-invalid",
            fromComponentId="and-1",
            fromPinId="A",  # Input pin
            toComponentId="and-2",
            toPinId="B",  # Input pin
            waypoints=[],
        )

        with pytest.raises(ValidationException) as exc_info:
            await circuit_service.add_wire(session_code, user_id, invalid_wire)

        assert exc_info.value.code == "INVALID_WIRE_DIRECTION"
        assert "output pin" in exc_info.value.message.lower()

    @pytest.mark.asyncio
    async def test_wire_from_output_to_output_rejected(self, circuit_service):
        """Wire from output to output is rejected."""
        session_code = "ABC123"
        user_id = "user-1"

        and_gate1 = ComponentFactory.create_and_gate(id="and-1")
        and_gate2 = ComponentFactory.create_and_gate(id="and-2")

        state = CircuitState(
            sessionId=session_code,
            version=2,
            schemaVersion="1.0.0",
            components=[and_gate1, and_gate2],
            wires=[],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "version": 2,
            "state": state.model_dump(by_alias=True),
        }
        circuit_service._event_repo.get_events_since_version.return_value = []

        # Try to create wire from output to output (invalid)
        invalid_wire = Wire(
            id="wire-invalid",
            fromComponentId="and-1",
            fromPinId="Y",  # Output pin
            toComponentId="and-2",
            toPinId="Y",  # Output pin
            waypoints=[],
        )

        with pytest.raises(ValidationException) as exc_info:
            await circuit_service.add_wire(session_code, user_id, invalid_wire)

        assert exc_info.value.code == "INVALID_WIRE_DIRECTION"
        assert "input pin" in exc_info.value.message.lower()


class TestDuplicateWireRejection:
    """Tests for duplicate wire rejection."""

    @pytest.mark.asyncio
    async def test_duplicate_wire_rejected(self, circuit_service):
        """Adding a duplicate wire connection is rejected."""
        session_code = "ABC123"
        user_id = "user-1"

        switch = ComponentFactory.create_switch(id="switch-1")
        and_gate = ComponentFactory.create_and_gate(id="and-1")

        # Existing wire
        existing_wire = WireFactory.create("switch-1", "OUT", "and-1", "A", id="wire-1")

        state = CircuitState(
            sessionId=session_code,
            version=2,
            schemaVersion="1.0.0",
            components=[switch, and_gate],
            wires=[existing_wire],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "version": 2,
            "state": state.model_dump(by_alias=True),
        }
        circuit_service._event_repo.get_events_since_version.return_value = []

        # Try to add duplicate wire
        duplicate_wire = Wire(
            id="wire-2",
            fromComponentId="switch-1",
            fromPinId="OUT",
            toComponentId="and-1",
            toPinId="A",
            waypoints=[],
        )

        with pytest.raises(ValidationException) as exc_info:
            await circuit_service.add_wire(session_code, user_id, duplicate_wire)

        assert exc_info.value.code == "DUPLICATE_WIRE"


class TestInputPinAlreadyConnected:
    """Tests for input pin connection validation."""

    @pytest.mark.asyncio
    async def test_input_pin_already_connected_rejected(self, circuit_service):
        """Connecting to an input pin that already has a connection is rejected."""
        session_code = "ABC123"
        user_id = "user-1"

        switch1 = ComponentFactory.create_switch(id="switch-1")
        switch2 = ComponentFactory.create_switch(id="switch-2")
        and_gate = ComponentFactory.create_and_gate(id="and-1")

        # Existing wire to and-1 input A
        existing_wire = WireFactory.create("switch-1", "OUT", "and-1", "A", id="wire-1")

        state = CircuitState(
            sessionId=session_code,
            version=3,
            schemaVersion="1.0.0",
            components=[switch1, switch2, and_gate],
            wires=[existing_wire],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "version": 3,
            "state": state.model_dump(by_alias=True),
        }
        circuit_service._event_repo.get_events_since_version.return_value = []

        # Try to connect another wire to the same input pin
        new_wire = Wire(
            id="wire-2",
            fromComponentId="switch-2",
            fromPinId="OUT",
            toComponentId="and-1",
            toPinId="A",  # Already connected
            waypoints=[],
        )

        with pytest.raises(ValidationException) as exc_info:
            await circuit_service.add_wire(session_code, user_id, new_wire)

        assert exc_info.value.code == "INPUT_ALREADY_CONNECTED"
