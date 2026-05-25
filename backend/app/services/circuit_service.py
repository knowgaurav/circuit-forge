"""Circuit operations service with event sourcing."""

from collections import defaultdict
from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.events.schema import (
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
from app.exceptions.base import NotFoundException, ValidationException
from app.models.circuit import (
    Annotation,
    CircuitComponent,
    CircuitState,
    PinType,
    Position,
    Wire,
)
from app.repositories.event_repository import EventRepository
from app.services.session_service import SNAPSHOT_INTERVAL


class CircuitService:
    """Service for circuit operations with event sourcing.

    Method parameters use ``session_id`` (the 6-char session code) and
    ``actor_id`` (the participant id of the caller) to match the event schema
    in :mod:`app.events.schema`.
    """

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._event_repo = EventRepository(database)
        # Undo/redo stacks per actor per session
        self._undo_stacks: dict[str, dict[str, list[CircuitEvent]]] = defaultdict(
            lambda: defaultdict(list)
        )
        self._redo_stacks: dict[str, dict[str, list[CircuitEvent]]] = defaultdict(
            lambda: defaultdict(list)
        )

    async def get_circuit_state(self, session_id: str) -> CircuitState:
        """Reconstruct circuit state from events.

        Uses the latest snapshot when one is available, then replays events
        whose seq is greater than the snapshot's seq.
        """
        snapshot = await self._event_repo.get_latest_snapshot(session_id)

        if snapshot:
            state = CircuitState.model_validate(snapshot["state"])
            start_seq = snapshot["seq"]
        else:
            state = CircuitState.create_empty(session_id)
            start_seq = 0

        events = await self._event_repo.get_events_since_seq(session_id, start_seq)

        for event_data in events:
            state = self._apply_event(state, event_data)

        return state

    async def add_component(
        self,
        session_id: str,
        actor_id: str,
        component: CircuitComponent,
    ) -> tuple[CircuitEvent, CircuitState]:
        """Add a component to the circuit."""
        seq = await self._get_next_seq(session_id)

        event = ComponentAddedEvent(
            sessionId=session_id,
            seq=seq,
            actorId=actor_id,
            timestamp=datetime.utcnow(),
            payload=ComponentAddedPayload(component=component),
        )

        await self._event_repo.append_event(event)
        self._push_undo(session_id, actor_id, event)
        self._clear_redo(session_id, actor_id)

        await self._maybe_create_snapshot(session_id, seq)

        state = await self.get_circuit_state(session_id)
        return event, state

    async def move_component(
        self,
        session_id: str,
        actor_id: str,
        component_id: str,
        position: Position,
    ) -> tuple[CircuitEvent, CircuitState]:
        """Move a component to a new position."""
        state = await self.get_circuit_state(session_id)
        if not any(c.id == component_id for c in state.components):
            raise NotFoundException("Component", component_id)

        seq = await self._get_next_seq(session_id)

        event = ComponentMovedEvent(
            sessionId=session_id,
            seq=seq,
            actorId=actor_id,
            timestamp=datetime.utcnow(),
            payload=ComponentMovedPayload(componentId=component_id, position=position),
        )

        await self._event_repo.append_event(event)
        self._push_undo(session_id, actor_id, event)
        self._clear_redo(session_id, actor_id)

        await self._maybe_create_snapshot(session_id, seq)

        state = await self.get_circuit_state(session_id)
        return event, state

    async def delete_component(
        self,
        session_id: str,
        actor_id: str,
        component_id: str,
    ) -> tuple[list[CircuitEvent], CircuitState]:
        """Delete a component, cascading to all connected wires."""
        state = await self.get_circuit_state(session_id)

        if not any(c.id == component_id for c in state.components):
            raise NotFoundException("Component", component_id)

        events: list[CircuitEvent] = []

        connected_wires = [
            w for w in state.wires
            if w.from_component_id == component_id or w.to_component_id == component_id
        ]

        for wire in connected_wires:
            seq = await self._get_next_seq(session_id)
            wire_event = WireDeletedEvent(
                sessionId=session_id,
                seq=seq,
                actorId=actor_id,
                timestamp=datetime.utcnow(),
                payload=WireDeletedPayload(wireId=wire.id),
            )
            await self._event_repo.append_event(wire_event)
            await self._maybe_create_snapshot(session_id, seq)
            events.append(wire_event)

        seq = await self._get_next_seq(session_id)
        component_event = ComponentDeletedEvent(
            sessionId=session_id,
            seq=seq,
            actorId=actor_id,
            timestamp=datetime.utcnow(),
            payload=ComponentDeletedPayload(componentId=component_id),
        )
        await self._event_repo.append_event(component_event)
        await self._maybe_create_snapshot(session_id, seq)
        events.append(component_event)

        for event in events:
            self._push_undo(session_id, actor_id, event)
        self._clear_redo(session_id, actor_id)

        state = await self.get_circuit_state(session_id)
        return events, state

    async def add_wire(
        self,
        session_id: str,
        actor_id: str,
        wire: Wire,
    ) -> tuple[CircuitEvent, CircuitState]:
        """Add a wire connection between components."""
        state = await self.get_circuit_state(session_id)
        self._validate_wire_connection(state, wire)

        seq = await self._get_next_seq(session_id)

        event = WireAddedEvent(
            sessionId=session_id,
            seq=seq,
            actorId=actor_id,
            timestamp=datetime.utcnow(),
            payload=WireAddedPayload(wire=wire),
        )

        await self._event_repo.append_event(event)
        self._push_undo(session_id, actor_id, event)
        self._clear_redo(session_id, actor_id)
        await self._maybe_create_snapshot(session_id, seq)

        state = await self.get_circuit_state(session_id)
        return event, state

    async def delete_wire(
        self,
        session_id: str,
        actor_id: str,
        wire_id: str,
    ) -> tuple[CircuitEvent, CircuitState]:
        """Delete a wire connection."""
        state = await self.get_circuit_state(session_id)

        if not any(w.id == wire_id for w in state.wires):
            raise NotFoundException("Wire", wire_id)

        seq = await self._get_next_seq(session_id)

        event = WireDeletedEvent(
            sessionId=session_id,
            seq=seq,
            actorId=actor_id,
            timestamp=datetime.utcnow(),
            payload=WireDeletedPayload(wireId=wire_id),
        )

        await self._event_repo.append_event(event)
        self._push_undo(session_id, actor_id, event)
        self._clear_redo(session_id, actor_id)
        await self._maybe_create_snapshot(session_id, seq)

        state = await self.get_circuit_state(session_id)
        return event, state

    async def add_annotation(
        self,
        session_id: str,
        actor_id: str,
        annotation: Annotation,
    ) -> tuple[CircuitEvent, CircuitState]:
        """Add an annotation to the circuit."""
        seq = await self._get_next_seq(session_id)

        event = AnnotationAddedEvent(
            sessionId=session_id,
            seq=seq,
            actorId=actor_id,
            timestamp=datetime.utcnow(),
            payload=AnnotationAddedPayload(annotation=annotation),
        )

        await self._event_repo.append_event(event)
        self._push_undo(session_id, actor_id, event)
        self._clear_redo(session_id, actor_id)
        await self._maybe_create_snapshot(session_id, seq)

        state = await self.get_circuit_state(session_id)
        return event, state

    async def delete_annotation(
        self,
        session_id: str,
        actor_id: str,
        annotation_id: str,
    ) -> tuple[CircuitEvent, CircuitState]:
        """Delete an annotation."""
        state = await self.get_circuit_state(session_id)

        if not any(a.id == annotation_id for a in state.annotations):
            raise NotFoundException("Annotation", annotation_id)

        seq = await self._get_next_seq(session_id)

        event = AnnotationDeletedEvent(
            sessionId=session_id,
            seq=seq,
            actorId=actor_id,
            timestamp=datetime.utcnow(),
            payload=AnnotationDeletedPayload(annotationId=annotation_id),
        )

        await self._event_repo.append_event(event)
        self._push_undo(session_id, actor_id, event)
        self._clear_redo(session_id, actor_id)
        await self._maybe_create_snapshot(session_id, seq)

        state = await self.get_circuit_state(session_id)
        return event, state

    async def undo(
        self,
        session_id: str,
        actor_id: str,
    ) -> tuple[CircuitEvent, CircuitState] | None:
        """Undo the last action by this actor."""
        undo_stack = self._undo_stacks[session_id][actor_id]
        if not undo_stack:
            return None

        last_event = undo_stack.pop()
        state = await self.get_circuit_state(session_id)

        inverse_event = await self._create_inverse_event(
            session_id, actor_id, last_event, state
        )

        if inverse_event:
            await self._event_repo.append_event(inverse_event)
            self._redo_stacks[session_id][actor_id].append(last_event)
            state = await self.get_circuit_state(session_id)
            return inverse_event, state

        return None

    async def redo(
        self,
        session_id: str,
        actor_id: str,
    ) -> tuple[CircuitEvent, CircuitState] | None:
        """Redo the last undone action by this actor."""
        redo_stack = self._redo_stacks[session_id][actor_id]
        if not redo_stack:
            return None

        event_to_redo = redo_stack.pop()
        seq = await self._get_next_seq(session_id)

        new_event = self._recreate_event_with_seq(event_to_redo, seq)

        await self._event_repo.append_event(new_event)
        self._undo_stacks[session_id][actor_id].append(new_event)

        state = await self.get_circuit_state(session_id)
        return new_event, state

    # ------------------------------------------------------------------
    # Pure event application (deterministic)
    # ------------------------------------------------------------------

    def _apply_event(
        self, state: CircuitState, event_data: dict[str, Any]
    ) -> CircuitState:
        """Apply a single event to the circuit state.

        This is a pure function of ``state`` and ``event_data``. No clock
        reads, no random sources. ``state.version`` is set from the event's
        ``seq`` (the application rule documented in the contracts file).
        """
        event_type = event_data.get("type")
        payload = event_data.get("payload", {})
        seq = event_data["seq"]

        if event_type == CircuitEventType.COMPONENT_ADDED:
            component = CircuitComponent.model_validate(payload["component"])
            state.components.append(component)

        elif event_type == CircuitEventType.COMPONENT_MOVED:
            comp_id = payload.get("componentId")
            position = Position.model_validate(payload["position"])
            for comp in state.components:
                if comp.id == comp_id:
                    comp.position = position
                    break

        elif event_type == CircuitEventType.COMPONENT_DELETED:
            comp_id = payload.get("componentId")
            state.components = [c for c in state.components if c.id != comp_id]

        elif event_type == CircuitEventType.WIRE_ADDED:
            wire = Wire.model_validate(payload["wire"])
            state.wires.append(wire)

        elif event_type == CircuitEventType.WIRE_DELETED:
            wire_id = payload.get("wireId")
            state.wires = [w for w in state.wires if w.id != wire_id]

        elif event_type == CircuitEventType.ANNOTATION_ADDED:
            annotation = Annotation.model_validate(payload["annotation"])
            state.annotations.append(annotation)

        elif event_type == CircuitEventType.ANNOTATION_DELETED:
            ann_id = payload.get("annotationId")
            state.annotations = [a for a in state.annotations if a.id != ann_id]

        state.version = seq
        return state

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def _validate_wire_connection(self, state: CircuitState, wire: Wire) -> None:
        """Validate that a wire connects an output pin to a free input pin."""
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

        for existing_wire in state.wires:
            if (
                existing_wire.to_component_id == wire.to_component_id
                and existing_wire.to_pin_id == wire.to_pin_id
            ):
                raise ValidationException(
                    message="This input pin already has a connection",
                    code="INPUT_ALREADY_CONNECTED",
                )

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

    # ------------------------------------------------------------------
    # Seq + snapshot helpers
    # ------------------------------------------------------------------

    async def _get_next_seq(self, session_id: str) -> int:
        """Get the next event seq number for a session."""
        current = await self._event_repo.get_latest_seq(session_id)
        return current + 1

    async def _maybe_create_snapshot(self, session_id: str, seq: int) -> None:
        """Create a snapshot when seq is a multiple of ``SNAPSHOT_INTERVAL``."""
        if seq % SNAPSHOT_INTERVAL == 0:
            state = await self.get_circuit_state(session_id)
            await self._event_repo.save_snapshot(session_id, seq, state)

    def _push_undo(
        self, session_id: str, actor_id: str, event: CircuitEvent
    ) -> None:
        """Push an event to the undo stack (capped at 50)."""
        self._undo_stacks[session_id][actor_id].append(event)
        if len(self._undo_stacks[session_id][actor_id]) > 50:
            self._undo_stacks[session_id][actor_id].pop(0)

    def _clear_redo(self, session_id: str, actor_id: str) -> None:
        """Clear the redo stack when a new action is performed."""
        self._redo_stacks[session_id][actor_id].clear()

    # ------------------------------------------------------------------
    # Inverse / replay helpers (for undo + redo)
    # ------------------------------------------------------------------

    async def _create_inverse_event(
        self,
        session_id: str,
        actor_id: str,
        event: CircuitEvent,
        state: CircuitState,
    ) -> CircuitEvent | None:
        """Create an inverse event for undo."""
        seq = await self._get_next_seq(session_id)

        if isinstance(event, ComponentAddedEvent):
            return ComponentDeletedEvent(
                sessionId=session_id,
                seq=seq,
                actorId=actor_id,
                timestamp=datetime.utcnow(),
                payload=ComponentDeletedPayload(
                    componentId=event.payload.component.id
                ),
            )

        if isinstance(event, ComponentDeletedEvent):
            events = await self._event_repo.get_all_events(session_id)
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
                        sessionId=session_id,
                        seq=seq,
                        actorId=actor_id,
                        timestamp=datetime.utcnow(),
                        payload=ComponentAddedPayload(component=component),
                    )
            return None

        if isinstance(event, ComponentMovedEvent):
            events = await self._event_repo.get_all_events(session_id)
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
                        prev_position = Position.model_validate(
                            e["payload"]["position"]
                        )

            if prev_position:
                return ComponentMovedEvent(
                    sessionId=session_id,
                    seq=seq,
                    actorId=actor_id,
                    timestamp=datetime.utcnow(),
                    payload=ComponentMovedPayload(
                        componentId=event.payload.component_id,
                        position=prev_position,
                    ),
                )
            return None

        if isinstance(event, WireAddedEvent):
            return WireDeletedEvent(
                sessionId=session_id,
                seq=seq,
                actorId=actor_id,
                timestamp=datetime.utcnow(),
                payload=WireDeletedPayload(wireId=event.payload.wire.id),
            )

        if isinstance(event, WireDeletedEvent):
            events = await self._event_repo.get_all_events(session_id)
            for e in events:
                if (
                    e.get("type") == CircuitEventType.WIRE_ADDED
                    and e.get("payload", {}).get("wire", {}).get("id")
                    == event.payload.wire_id
                ):
                    wire = Wire.model_validate(e["payload"]["wire"])
                    return WireAddedEvent(
                        sessionId=session_id,
                        seq=seq,
                        actorId=actor_id,
                        timestamp=datetime.utcnow(),
                        payload=WireAddedPayload(wire=wire),
                    )
            return None

        if isinstance(event, AnnotationAddedEvent):
            return AnnotationDeletedEvent(
                sessionId=session_id,
                seq=seq,
                actorId=actor_id,
                timestamp=datetime.utcnow(),
                payload=AnnotationDeletedPayload(
                    annotationId=event.payload.annotation.id
                ),
            )

        if isinstance(event, AnnotationDeletedEvent):
            events = await self._event_repo.get_all_events(session_id)
            for e in events:
                if (
                    e.get("type") == CircuitEventType.ANNOTATION_ADDED
                    and e.get("payload", {}).get("annotation", {}).get("id")
                    == event.payload.annotation_id
                ):
                    annotation = Annotation.model_validate(
                        e["payload"]["annotation"]
                    )
                    return AnnotationAddedEvent(
                        sessionId=session_id,
                        seq=seq,
                        actorId=actor_id,
                        timestamp=datetime.utcnow(),
                        payload=AnnotationAddedPayload(annotation=annotation),
                    )
            return None

        return None

    def _recreate_event_with_seq(
        self, event: CircuitEvent, seq: int
    ) -> CircuitEvent:
        """Recreate an event with a new seq number (used for redo)."""
        event_dict = event.model_dump(by_alias=True)
        event_dict["seq"] = seq
        event_dict["timestamp"] = datetime.utcnow()

        if isinstance(event, ComponentAddedEvent):
            return ComponentAddedEvent.model_validate(event_dict)
        if isinstance(event, ComponentMovedEvent):
            return ComponentMovedEvent.model_validate(event_dict)
        if isinstance(event, ComponentDeletedEvent):
            return ComponentDeletedEvent.model_validate(event_dict)
        if isinstance(event, WireAddedEvent):
            return WireAddedEvent.model_validate(event_dict)
        if isinstance(event, WireDeletedEvent):
            return WireDeletedEvent.model_validate(event_dict)
        if isinstance(event, AnnotationAddedEvent):
            return AnnotationAddedEvent.model_validate(event_dict)
        if isinstance(event, AnnotationDeletedEvent):
            return AnnotationDeletedEvent.model_validate(event_dict)
        return event

    def cleanup_session(self, session_id: str) -> None:
        """Clean up in-memory undo/redo stacks for a session."""
        self._undo_stacks.pop(session_id, None)
        self._redo_stacks.pop(session_id, None)
