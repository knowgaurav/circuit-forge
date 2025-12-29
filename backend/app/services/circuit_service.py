"""Circuit operations service with event sourcing."""

from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.exceptions.base import NotFoundException, ValidationException
from app.models.circuit import (
    Annotation,
    CircuitComponent,
    CircuitState,
    Pin,
    PinType,
    Position,
    Wire,
)
from app.models.events import (
    AnnotationAddedEvent,
    AnnotationAddedPayload,
    AnnotationDeletedEvent,
    AnnotationDeletedPayload,
    CircuitEvent,
    CircuitEventType,
    ComponentAddedEvent,
    ComponentAddedPayload,
    ComponentDeletedEvent,
    ComponentDeletedPayload,
    ComponentMovedEvent,
    ComponentMovedPayload,
    WireAddedEvent,
    WireAddedPayload,
    WireDeletedEvent,
    WireDeletedPayload,
)
from app.repositories.event_repository import EventRepository


# Snapshot interval (create snapshot every N events)
SNAPSHOT_INTERVAL = 50


class CircuitService:
    """Service for circuit operations with event sourcing."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        """Initialize circuit service."""
        self._event_repo = EventRepository(database)
        # Undo/redo stacks per user per session
        self._undo_stacks: Dict[str, Dict[str, List[CircuitEvent]]] = defaultdict(
            lambda: defaultdict(list)
        )
        self._redo_stacks: Dict[str, Dict[str, List[CircuitEvent]]] = defaultdict(
            lambda: defaultdict(list)
        )

    async def get_circuit_state(self, session_code: str) -> CircuitState:
        """
        Reconstruct circuit state from events.
        
        Uses snapshots for efficiency when available.
        """
        # Try to get latest snapshot
        snapshot = await self._event_repo.get_latest_snapshot(session_code)
        
        if snapshot:
            state = CircuitState.model_validate(snapshot["state"])
            start_version = snapshot["version"]
        else:
            state = CircuitState.create_empty(session_code)
            start_version = 0
        
        # Apply events since snapshot
        events = await self._event_repo.get_events_since_version(
            session_code, start_version
        )
        
        for event_data in events:
            state = self._apply_event(state, event_data)
        
        return state

    async def add_component(
        self,
        session_code: str,
        user_id: str,
        component: CircuitComponent,
    ) -> Tuple[CircuitEvent, CircuitState]:
        """Add a component to the circuit."""
        version = await self._get_next_version(session_code)
        
        event = ComponentAddedEvent(
            sessionCode=session_code,
            version=version,
            userId=user_id,
            timestamp=datetime.utcnow(),
            payload=ComponentAddedPayload(component=component),
        )
        
        await self._event_repo.append_event(event)
        self._push_undo(session_code, user_id, event)
        self._clear_redo(session_code, user_id)
        
        # Check if we need to create a snapshot
        await self._maybe_create_snapshot(session_code, version)
        
        state = await self.get_circuit_state(session_code)
        return event, state

    async def move_component(
        self,
        session_code: str,
        user_id: str,
        component_id: str,
        position: Position,
    ) -> Tuple[CircuitEvent, CircuitState]:
        """Move a component to a new position."""
        # Verify component exists
        state = await self.get_circuit_state(session_code)
        if not any(c.id == component_id for c in state.components):
            raise NotFoundException("Component", component_id)
        
        version = await self._get_next_version(session_code)
        
        event = ComponentMovedEvent(
            sessionCode=session_code,
            version=version,
            userId=user_id,
            timestamp=datetime.utcnow(),
            payload=ComponentMovedPayload(componentId=component_id, position=position),
        )
        
        await self._event_repo.append_event(event)
        self._push_undo(session_code, user_id, event)
        self._clear_redo(session_code, user_id)
        
        state = await self.get_circuit_state(session_code)
        return event, state

    async def delete_component(
        self,
        session_code: str,
        user_id: str,
        component_id: str,
    ) -> Tuple[List[CircuitEvent], CircuitState]:
        """
        Delete a component and all connected wires (cascade delete).
        
        Returns list of events (component delete + wire deletes).
        """
        state = await self.get_circuit_state(session_code)
        
        # Verify component exists
        if not any(c.id == component_id for c in state.components):
            raise NotFoundException("Component", component_id)
        
        events: List[CircuitEvent] = []
        
        # Find and delete connected wires first
        connected_wires = [
            w for w in state.wires
            if w.from_component_id == component_id or w.to_component_id == component_id
        ]
        
        for wire in connected_wires:
            version = await self._get_next_version(session_code)
            wire_event = WireDeletedEvent(
                sessionCode=session_code,
                version=version,
                userId=user_id,
                timestamp=datetime.utcnow(),
                payload=WireDeletedPayload(wireId=wire.id),
            )
            await self._event_repo.append_event(wire_event)
            events.append(wire_event)
        
        # Delete the component
        version = await self._get_next_version(session_code)
        component_event = ComponentDeletedEvent(
            sessionCode=session_code,
            version=version,
            userId=user_id,
            timestamp=datetime.utcnow(),
            payload=ComponentDeletedPayload(componentId=component_id),
        )
        await self._event_repo.append_event(component_event)
        events.append(component_event)
        
        # Push all events to undo stack as a group
        for event in events:
            self._push_undo(session_code, user_id, event)
        self._clear_redo(session_code, user_id)
        
        state = await self.get_circuit_state(session_code)
        return events, state

    async def add_wire(
        self,
        session_code: str,
        user_id: str,
        wire: Wire,
    ) -> Tuple[CircuitEvent, CircuitState]:
        """
        Add a wire connection between components.
        
        Validates that wire connects output pin to input pin.
        """
        state = await self.get_circuit_state(session_code)
        
        # Validate wire connection
        self._validate_wire_connection(state, wire)
        
        version = await self._get_next_version(session_code)
        
        event = WireAddedEvent(
            sessionCode=session_code,
            version=version,
            userId=user_id,
            timestamp=datetime.utcnow(),
            payload=WireAddedPayload(wire=wire),
        )
        
        await self._event_repo.append_event(event)
        self._push_undo(session_code, user_id, event)
        self._clear_redo(session_code, user_id)
        
        state = await self.get_circuit_state(session_code)
        return event, state

    async def delete_wire(
        self,
        session_code: str,
        user_id: str,
        wire_id: str,
    ) -> Tuple[CircuitEvent, CircuitState]:
        """Delete a wire connection."""
        state = await self.get_circuit_state(session_code)
        
        if not any(w.id == wire_id for w in state.wires):
            raise NotFoundException("Wire", wire_id)
        
        version = await self._get_next_version(session_code)
        
        event = WireDeletedEvent(
            sessionCode=session_code,
            version=version,
            userId=user_id,
            timestamp=datetime.utcnow(),
            payload=WireDeletedPayload(wireId=wire_id),
        )
        
        await self._event_repo.append_event(event)
        self._push_undo(session_code, user_id, event)
        self._clear_redo(session_code, user_id)
        
        state = await self.get_circuit_state(session_code)
        return event, state

    async def add_annotation(
        self,
        session_code: str,
        user_id: str,
        annotation: Annotation,
    ) -> Tuple[CircuitEvent, CircuitState]:
        """Add an annotation to the circuit."""
        version = await self._get_next_version(session_code)
        
        event = AnnotationAddedEvent(
            sessionCode=session_code,
            version=version,
            userId=user_id,
            timestamp=datetime.utcnow(),
            payload=AnnotationAddedPayload(annotation=annotation),
        )
        
        await self._event_repo.append_event(event)
        self._push_undo(session_code, user_id, event)
        self._clear_redo(session_code, user_id)
        
        state = await self.get_circuit_state(session_code)
        return event, state

    async def delete_annotation(
        self,
        session_code: str,
        user_id: str,
        annotation_id: str,
    ) -> Tuple[CircuitEvent, CircuitState]:
        """Delete an annotation."""
        state = await self.get_circuit_state(session_code)
        
        if not any(a.id == annotation_id for a in state.annotations):
            raise NotFoundException("Annotation", annotation_id)
        
        version = await self._get_next_version(session_code)
        
        event = AnnotationDeletedEvent(
            sessionCode=session_code,
            version=version,
            userId=user_id,
            timestamp=datetime.utcnow(),
            payload=AnnotationDeletedPayload(annotationId=annotation_id),
        )
        
        await self._event_repo.append_event(event)
        self._push_undo(session_code, user_id, event)
        self._clear_redo(session_code, user_id)
        
        state = await self.get_circuit_state(session_code)
        return event, state

    async def undo(
        self,
        session_code: str,
        user_id: str,
    ) -> Optional[Tuple[CircuitEvent, CircuitState]]:
        """
        Undo the last action by this user.
        
        Returns the inverse event and new state, or None if nothing to undo.
        """
        undo_stack = self._undo_stacks[session_code][user_id]
        if not undo_stack:
            return None
        
        last_event = undo_stack.pop()
        state = await self.get_circuit_state(session_code)
        
        # Create inverse event
        inverse_event = await self._create_inverse_event(
            session_code, user_id, last_event, state
        )
        
        if inverse_event:
            await self._event_repo.append_event(inverse_event)
            self._redo_stacks[session_code][user_id].append(last_event)
            state = await self.get_circuit_state(session_code)
            return inverse_event, state
        
        return None

    async def redo(
        self,
        session_code: str,
        user_id: str,
    ) -> Optional[Tuple[CircuitEvent, CircuitState]]:
        """
        Redo the last undone action by this user.
        
        Returns the re-applied event and new state, or None if nothing to redo.
        """
        redo_stack = self._redo_stacks[session_code][user_id]
        if not redo_stack:
            return None
        
        event_to_redo = redo_stack.pop()
        version = await self._get_next_version(session_code)
        
        # Create new event with updated version
        new_event = self._recreate_event_with_version(event_to_redo, version)
        
        await self._event_repo.append_event(new_event)
        self._undo_stacks[session_code][user_id].append(new_event)
        
        state = await self.get_circuit_state(session_code)
        return new_event, state

    def _apply_event(
        self, state: CircuitState, event_data: Dict[str, Any]
    ) -> CircuitState:
        """Apply a single event to the circuit state."""
        event_type = event_data.get("type")
        payload = event_data.get("payload", {})
        
        if event_type == CircuitEventType.COMPONENT_ADDED:
            component = CircuitComponent.model_validate(payload["component"])
            state.components.append(component)
            state.version = event_data["version"]
        
        elif event_type == CircuitEventType.COMPONENT_MOVED:
            comp_id = payload.get("componentId")
            position = Position.model_validate(payload["position"])
            for comp in state.components:
                if comp.id == comp_id:
                    comp.position = position
                    break
            state.version = event_data["version"]
        
        elif event_type == CircuitEventType.COMPONENT_DELETED:
            comp_id = payload.get("componentId")
            state.components = [c for c in state.components if c.id != comp_id]
            state.version = event_data["version"]
        
        elif event_type == CircuitEventType.WIRE_ADDED:
            wire = Wire.model_validate(payload["wire"])
            state.wires.append(wire)
            state.version = event_data["version"]
        
        elif event_type == CircuitEventType.WIRE_DELETED:
            wire_id = payload.get("wireId")
            state.wires = [w for w in state.wires if w.id != wire_id]
            state.version = event_data["version"]
        
        elif event_type == CircuitEventType.ANNOTATION_ADDED:
            annotation = Annotation.model_validate(payload["annotation"])
            state.annotations.append(annotation)
            state.version = event_data["version"]
        
        elif event_type == CircuitEventType.ANNOTATION_DELETED:
            ann_id = payload.get("annotationId")
            state.annotations = [a for a in state.annotations if a.id != ann_id]
            state.version = event_data["version"]
        
        state.updated_at = datetime.utcnow()
        return state

    def _validate_wire_connection(self, state: CircuitState, wire: Wire) -> None:
        """Validate that a wire connects output to input."""
        # Check for duplicate wire
        for existing_wire in state.wires:
            if (
                existing_wire.from_component_id == wire.from_component_id
                and existing_wire.from_pin_id == wire.from_pin_id
                and existing_wire.to_component_id == wire.to_component_id
                and existing_wire.to_pin_id == wire.to_pin_id
            ):
                raise ValidationException(
                    message="This wire connection already exists",
                    code="DUPLICATE_WIRE",
                )
        
        # Check if target input pin already has a connection (multiple drivers)
        for existing_wire in state.wires:
            if (
                existing_wire.to_component_id == wire.to_component_id
                and existing_wire.to_pin_id == wire.to_pin_id
            ):
                raise ValidationException(
                    message="This input pin already has a connection",
                    code="INPUT_ALREADY_CONNECTED",
                )
        
        # Find source component and pin
        from_component = next(
            (c for c in state.components if c.id == wire.from_component_id), None
        )
        if from_component is None:
            raise ValidationException(
                message=f"Source component '{wire.from_component_id}' not found",
                code="INVALID_WIRE",
            )
        
        from_pin = next(
            (p for p in from_component.pins if p.id == wire.from_pin_id), None
        )
        if from_pin is None:
            raise ValidationException(
                message=f"Source pin '{wire.from_pin_id}' not found",
                code="INVALID_WIRE",
            )
        
        # Find target component and pin
        to_component = next(
            (c for c in state.components if c.id == wire.to_component_id), None
        )
        if to_component is None:
            raise ValidationException(
                message=f"Target component '{wire.to_component_id}' not found",
                code="INVALID_WIRE",
            )
        
        to_pin = next(
            (p for p in to_component.pins if p.id == wire.to_pin_id), None
        )
        if to_pin is None:
            raise ValidationException(
                message=f"Target pin '{wire.to_pin_id}' not found",
                code="INVALID_WIRE",
            )
        
        # Validate connection direction: output -> input
        if from_pin.type != PinType.OUTPUT:
            raise ValidationException(
                message="Wire must start from an output pin",
                code="INVALID_WIRE_DIRECTION",
            )
        
        if to_pin.type != PinType.INPUT:
            raise ValidationException(
                message="Wire must end at an input pin",
                code="INVALID_WIRE_DIRECTION",
            )

    async def _get_next_version(self, session_code: str) -> int:
        """Get the next event version number."""
        current = await self._event_repo.get_latest_version(session_code)
        return current + 1

    async def _maybe_create_snapshot(
        self, session_code: str, version: int
    ) -> None:
        """Create a snapshot if we've reached the snapshot interval."""
        if version % SNAPSHOT_INTERVAL == 0:
            state = await self.get_circuit_state(session_code)
            await self._event_repo.save_snapshot(session_code, version, state)

    def _push_undo(
        self, session_code: str, user_id: str, event: CircuitEvent
    ) -> None:
        """Push an event to the undo stack."""
        self._undo_stacks[session_code][user_id].append(event)
        # Limit stack size
        if len(self._undo_stacks[session_code][user_id]) > 50:
            self._undo_stacks[session_code][user_id].pop(0)

    def _clear_redo(self, session_code: str, user_id: str) -> None:
        """Clear the redo stack when a new action is performed."""
        self._redo_stacks[session_code][user_id].clear()

    async def _create_inverse_event(
        self,
        session_code: str,
        user_id: str,
        event: CircuitEvent,
        state: CircuitState,
    ) -> Optional[CircuitEvent]:
        """Create an inverse event for undo."""
        version = await self._get_next_version(session_code)
        
        if isinstance(event, ComponentAddedEvent):
            return ComponentDeletedEvent(
                sessionCode=session_code,
                version=version,
                userId=user_id,
                timestamp=datetime.utcnow(),
                payload=ComponentDeletedPayload(
                    componentId=event.payload.component.id
                ),
            )
        
        elif isinstance(event, ComponentDeletedEvent):
            # Need to find the deleted component from history
            # For simplicity, we'll reconstruct from events
            events = await self._event_repo.get_all_events(session_code)
            for e in events:
                if (
                    e.get("type") == CircuitEventType.COMPONENT_ADDED
                    and e.get("payload", {}).get("component", {}).get("id")
                    == event.payload.component_id
                ):
                    component = CircuitComponent.model_validate(
                        e["payload"]["component"]
                    )
                    return ComponentAddedEvent(
                        sessionCode=session_code,
                        version=version,
                        userId=user_id,
                        timestamp=datetime.utcnow(),
                        payload=ComponentAddedPayload(component=component),
                    )
            return None
        
        elif isinstance(event, ComponentMovedEvent):
            # Find previous position from events
            events = await self._event_repo.get_all_events(session_code)
            prev_position = None
            for e in events:
                if e.get("type") == CircuitEventType.COMPONENT_ADDED:
                    if (
                        e.get("payload", {}).get("component", {}).get("id")
                        == event.payload.component_id
                    ):
                        prev_position = Position.model_validate(
                            e["payload"]["component"]["position"]
                        )
                elif e.get("type") == CircuitEventType.COMPONENT_MOVED:
                    if (
                        e.get("payload", {}).get("componentId")
                        == event.payload.component_id
                    ):
                        prev_position = Position.model_validate(e["payload"]["position"])
            
            if prev_position:
                return ComponentMovedEvent(
                    sessionCode=session_code,
                    version=version,
                    userId=user_id,
                    timestamp=datetime.utcnow(),
                    payload=ComponentMovedPayload(
                        componentId=event.payload.component_id,
                        position=prev_position,
                    ),
                )
            return None
        
        elif isinstance(event, WireAddedEvent):
            return WireDeletedEvent(
                sessionCode=session_code,
                version=version,
                userId=user_id,
                timestamp=datetime.utcnow(),
                payload=WireDeletedPayload(wireId=event.payload.wire.id),
            )
        
        elif isinstance(event, WireDeletedEvent):
            # Find the deleted wire from history
            events = await self._event_repo.get_all_events(session_code)
            for e in events:
                if (
                    e.get("type") == CircuitEventType.WIRE_ADDED
                    and e.get("payload", {}).get("wire", {}).get("id")
                    == event.payload.wire_id
                ):
                    wire = Wire.model_validate(e["payload"]["wire"])
                    return WireAddedEvent(
                        sessionCode=session_code,
                        version=version,
                        userId=user_id,
                        timestamp=datetime.utcnow(),
                        payload=WireAddedPayload(wire=wire),
                    )
            return None
        
        elif isinstance(event, AnnotationAddedEvent):
            return AnnotationDeletedEvent(
                sessionCode=session_code,
                version=version,
                userId=user_id,
                timestamp=datetime.utcnow(),
                payload=AnnotationDeletedPayload(
                    annotationId=event.payload.annotation.id
                ),
            )
        
        elif isinstance(event, AnnotationDeletedEvent):
            # Find the deleted annotation from history
            events = await self._event_repo.get_all_events(session_code)
            for e in events:
                if (
                    e.get("type") == CircuitEventType.ANNOTATION_ADDED
                    and e.get("payload", {}).get("annotation", {}).get("id")
                    == event.payload.annotation_id
                ):
                    annotation = Annotation.model_validate(e["payload"]["annotation"])
                    return AnnotationAddedEvent(
                        sessionCode=session_code,
                        version=version,
                        userId=user_id,
                        timestamp=datetime.utcnow(),
                        payload=AnnotationAddedPayload(annotation=annotation),
                    )
            return None
        
        return None

    def _recreate_event_with_version(
        self, event: CircuitEvent, version: int
    ) -> CircuitEvent:
        """Recreate an event with a new version number."""
        event_dict = event.model_dump(by_alias=True)
        event_dict["version"] = version
        event_dict["timestamp"] = datetime.utcnow()
        
        if isinstance(event, ComponentAddedEvent):
            return ComponentAddedEvent.model_validate(event_dict)
        elif isinstance(event, ComponentMovedEvent):
            return ComponentMovedEvent.model_validate(event_dict)
        elif isinstance(event, ComponentDeletedEvent):
            return ComponentDeletedEvent.model_validate(event_dict)
        elif isinstance(event, WireAddedEvent):
            return WireAddedEvent.model_validate(event_dict)
        elif isinstance(event, WireDeletedEvent):
            return WireDeletedEvent.model_validate(event_dict)
        elif isinstance(event, AnnotationAddedEvent):
            return AnnotationAddedEvent.model_validate(event_dict)
        elif isinstance(event, AnnotationDeletedEvent):
            return AnnotationDeletedEvent.model_validate(event_dict)
        
        return event

    def cleanup_session(self, session_code: str) -> None:
        """Clean up in-memory data for a session."""
        if session_code in self._undo_stacks:
            del self._undo_stacks[session_code]
        if session_code in self._redo_stacks:
            del self._redo_stacks[session_code]
