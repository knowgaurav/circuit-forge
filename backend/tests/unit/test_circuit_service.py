"""Unit tests for CircuitService.

Tests circuit operations with event sourcing: add/delete components, wire validation.
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.events.schema import (
    CircuitEventType,
    ComponentAddedEvent,
)
from app.exceptions.base import ValidationException
from app.models.circuit import CircuitState, Wire
from app.services.circuit_service import CircuitService
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
        session_id = "ABC123"
        actor_id = "user-1"
        component = ComponentFactory.create_and_gate(id="and-1")

        circuit_service._event_repo.get_latest_seq.return_value = 0
        circuit_service._event_repo.append_event.return_value = None
        circuit_service._event_repo.get_latest_snapshot.return_value = None
        circuit_service._event_repo.get_events_since_seq.return_value = [
            {
                "type": CircuitEventType.COMPONENT_ADDED,
                "seq": 1,
                "payload": {"component": component.model_dump(by_alias=True)},
            }
        ]

        event, state = await circuit_service.add_component(
            session_id, actor_id, component
        )

        assert isinstance(event, ComponentAddedEvent)
        assert event.session_id == session_id
        assert event.actor_id == actor_id
        assert event.payload.component.id == "and-1"
        assert event.seq == 1

        circuit_service._event_repo.append_event.assert_called_once()

        assert len(state.components) == 1
        assert state.components[0].id == "and-1"
        assert state.version == 1


class TestDeleteComponent:
    """Tests for deleting components."""

    @pytest.mark.asyncio
    async def test_delete_component_cascades_to_connected_wires(self, circuit_service):
        """Deleting a component also deletes all connected wires."""
        session_id = "ABC123"
        actor_id = "user-1"

        switch = ComponentFactory.create_switch(id="switch-1")
        and_gate = ComponentFactory.create_and_gate(id="and-1")
        led = ComponentFactory.create_led(id="led-1")

        wire1 = WireFactory.create("switch-1", "OUT", "and-1", "A", id="wire-1")
        wire2 = WireFactory.create("and-1", "Y", "led-1", "IN", id="wire-2")

        initial_state = CircuitState(
            sessionId=session_id,
            version=3,
            schemaVersion="1.0.0",
            components=[switch, and_gate, led],
            wires=[wire1, wire2],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        seq_counter = [3]

        async def get_latest_seq(_):
            return seq_counter[0]

        async def append_event(event):
            seq_counter[0] = max(seq_counter[0], event.seq)

        circuit_service._event_repo.get_latest_seq.side_effect = get_latest_seq
        circuit_service._event_repo.append_event.side_effect = append_event
        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "seq": 3,
            "state": initial_state.model_dump(by_alias=True),
        }

        call_count = [0]

        async def get_events_since_seq(*args):
            call_count[0] += 1
            if call_count[0] == 1:
                # First call (initial state load): no extra events
                return []
            return [
                {
                    "type": CircuitEventType.WIRE_DELETED,
                    "seq": 4,
                    "payload": {"wireId": "wire-1"},
                },
                {
                    "type": CircuitEventType.WIRE_DELETED,
                    "seq": 5,
                    "payload": {"wireId": "wire-2"},
                },
                {
                    "type": CircuitEventType.COMPONENT_DELETED,
                    "seq": 6,
                    "payload": {"componentId": "and-1"},
                },
            ]

        circuit_service._event_repo.get_events_since_seq.side_effect = (
            get_events_since_seq
        )

        events, state = await circuit_service.delete_component(
            session_id, actor_id, "and-1"
        )

        assert len(events) == 3
        assert events[0].type == CircuitEventType.WIRE_DELETED
        assert events[1].type == CircuitEventType.WIRE_DELETED
        assert events[2].type == CircuitEventType.COMPONENT_DELETED
        assert events[2].payload.component_id == "and-1"
        assert circuit_service._event_repo.append_event.call_count == 3


class TestWireValidation:
    """Tests for wire validation."""

    @pytest.mark.asyncio
    async def test_wire_must_connect_output_to_input(self, circuit_service):
        """Wire must start from output pin and end at input pin."""
        session_id = "ABC123"
        actor_id = "user-1"

        and_gate1 = ComponentFactory.create_and_gate(id="and-1")
        and_gate2 = ComponentFactory.create_and_gate(id="and-2")

        state = CircuitState(
            sessionId=session_id,
            version=2,
            schemaVersion="1.0.0",
            components=[and_gate1, and_gate2],
            wires=[],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "seq": 2,
            "state": state.model_dump(by_alias=True),
        }
        circuit_service._event_repo.get_events_since_seq.return_value = []

        invalid_wire = Wire(
            id="wire-invalid",
            fromComponentId="and-1",
            fromPinId="A",  # Input pin
            toComponentId="and-2",
            toPinId="B",  # Input pin
            waypoints=[],
        )

        with pytest.raises(ValidationException) as exc_info:
            await circuit_service.add_wire(session_id, actor_id, invalid_wire)

        assert exc_info.value.code == "INVALID_WIRE_DIRECTION"
        assert "output pin" in exc_info.value.message.lower()

    @pytest.mark.asyncio
    async def test_wire_from_output_to_output_rejected(self, circuit_service):
        """Wire from output to output is rejected."""
        session_id = "ABC123"
        actor_id = "user-1"

        and_gate1 = ComponentFactory.create_and_gate(id="and-1")
        and_gate2 = ComponentFactory.create_and_gate(id="and-2")

        state = CircuitState(
            sessionId=session_id,
            version=2,
            schemaVersion="1.0.0",
            components=[and_gate1, and_gate2],
            wires=[],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "seq": 2,
            "state": state.model_dump(by_alias=True),
        }
        circuit_service._event_repo.get_events_since_seq.return_value = []

        invalid_wire = Wire(
            id="wire-invalid",
            fromComponentId="and-1",
            fromPinId="Y",  # Output pin
            toComponentId="and-2",
            toPinId="Y",  # Output pin
            waypoints=[],
        )

        with pytest.raises(ValidationException) as exc_info:
            await circuit_service.add_wire(session_id, actor_id, invalid_wire)

        assert exc_info.value.code == "INVALID_WIRE_DIRECTION"
        assert "input pin" in exc_info.value.message.lower()


class TestDuplicateWireRejection:
    """Tests for duplicate wire rejection."""

    @pytest.mark.asyncio
    async def test_duplicate_wire_rejected(self, circuit_service):
        """Adding a duplicate wire connection is rejected."""
        session_id = "ABC123"
        actor_id = "user-1"

        switch = ComponentFactory.create_switch(id="switch-1")
        and_gate = ComponentFactory.create_and_gate(id="and-1")

        existing_wire = WireFactory.create("switch-1", "OUT", "and-1", "A", id="wire-1")

        state = CircuitState(
            sessionId=session_id,
            version=2,
            schemaVersion="1.0.0",
            components=[switch, and_gate],
            wires=[existing_wire],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "seq": 2,
            "state": state.model_dump(by_alias=True),
        }
        circuit_service._event_repo.get_events_since_seq.return_value = []

        duplicate_wire = Wire(
            id="wire-2",
            fromComponentId="switch-1",
            fromPinId="OUT",
            toComponentId="and-1",
            toPinId="A",
            waypoints=[],
        )

        with pytest.raises(ValidationException) as exc_info:
            await circuit_service.add_wire(session_id, actor_id, duplicate_wire)

        assert exc_info.value.code == "DUPLICATE_WIRE"


class TestInputPinAlreadyConnected:
    """Tests for input pin connection validation."""

    @pytest.mark.asyncio
    async def test_input_pin_already_connected_rejected(self, circuit_service):
        """Connecting to an input pin that already has a connection is rejected."""
        session_id = "ABC123"
        actor_id = "user-1"

        switch1 = ComponentFactory.create_switch(id="switch-1")
        switch2 = ComponentFactory.create_switch(id="switch-2")
        and_gate = ComponentFactory.create_and_gate(id="and-1")

        existing_wire = WireFactory.create("switch-1", "OUT", "and-1", "A", id="wire-1")

        state = CircuitState(
            sessionId=session_id,
            version=3,
            schemaVersion="1.0.0",
            components=[switch1, switch2, and_gate],
            wires=[existing_wire],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "seq": 3,
            "state": state.model_dump(by_alias=True),
        }
        circuit_service._event_repo.get_events_since_seq.return_value = []

        new_wire = Wire(
            id="wire-2",
            fromComponentId="switch-2",
            fromPinId="OUT",
            toComponentId="and-1",
            toPinId="A",  # Already connected
            waypoints=[],
        )

        with pytest.raises(ValidationException) as exc_info:
            await circuit_service.add_wire(session_id, actor_id, new_wire)

        assert exc_info.value.code == "INPUT_ALREADY_CONNECTED"


class TestSnapshotPolicy:
    """A.4: snapshot + delta replay equals full replay from zero."""

    @pytest.mark.asyncio
    async def test_snapshot_plus_delta_equals_full_replay(self, circuit_service):
        """Apply 60 events; latest snapshot at seq=50; replay-from-snapshot
        + delta(51..60) == full replay from seq 0.
        """
        session_id = "SNP123"

        # Build 60 component_added events with predictable ids.
        events: list[dict] = []
        for i in range(1, 61):
            comp = ComponentFactory.create_switch(id=f"sw-{i}", x=float(i), y=0)
            events.append(
                {
                    "type": CircuitEventType.COMPONENT_ADDED,
                    "seq": i,
                    "sessionId": session_id,
                    "actorId": "u1",
                    "timestamp": datetime.utcnow(),
                    "payload": {"component": comp.model_dump(by_alias=True)},
                }
            )

        # Full replay from zero — no snapshot, all 60 events
        circuit_service._event_repo.get_latest_snapshot.return_value = None
        circuit_service._event_repo.get_events_since_seq.return_value = events

        full_state = await circuit_service.get_circuit_state(session_id)

        # Replay from snapshot at seq=50 + delta of last 10
        snapshot_state = CircuitState(
            sessionId=session_id,
            version=50,
            schemaVersion="1.0.0",
            components=[
                ComponentFactory.create_switch(id=f"sw-{i}", x=float(i), y=0)
                for i in range(1, 51)
            ],
            wires=[],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        circuit_service._event_repo.get_latest_snapshot.return_value = {
            "seq": 50,
            "state": snapshot_state.model_dump(by_alias=True),
        }
        circuit_service._event_repo.get_events_since_seq.return_value = events[50:]

        snapshot_state_replay = await circuit_service.get_circuit_state(session_id)

        # Compare without timestamps (state.updated_at is incidental wallclock data)
        full_dump = full_state.model_dump(by_alias=True)
        snap_dump = snapshot_state_replay.model_dump(by_alias=True)
        full_dump.pop("updatedAt", None)
        snap_dump.pop("updatedAt", None)

        assert snap_dump == full_dump
        assert snapshot_state_replay.version == 60
