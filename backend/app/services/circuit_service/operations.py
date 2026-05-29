"""Public mutation methods for the circuit service.

Why this module exists separately
---------------------------------
Each mutation method (``add_component``, ``move_component``, ``add_wire``,
...) follows the same recipe:

1. Optionally fetch state for an existence check.
2. Compute the next ``seq``.
3. Build the typed event for that mutation.
4. Hand it to ``self._record_action``, which appends the event, updates the
   undo/redo stacks, maybe takes a snapshot, and returns the new state.

There are seven of these methods; bundled together they crowd the core
service file. Splitting them into a mixin keeps the orchestrator small
without changing the public API: ``CircuitService`` inherits from
:class:`OperationsMixin`, so callers still write
``service.add_component(...)``.

The cascade in ``delete_component`` is the only deviation from the recipe:
it emits one ``WireDeletedEvent`` per wire touching the component before
the final ``ComponentDeletedEvent``. Each wire delete is appended directly
(without ``_record_action``) because the undo/redo bookkeeping for the
whole cascade happens once at the end.
"""

from datetime import datetime

from app.events.schema import (
    AnnotationAddedEvent,
    AnnotationAddedPayload,
    AnnotationDeletedEvent,
    AnnotationDeletedPayload,
    CircuitEvent,
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
from app.exceptions.base import NotFoundException
from app.models.circuit import (
    Annotation,
    CircuitComponent,
    CircuitState,
    Position,
    Wire,
)

from .validation import validate_wire_connection


class OperationsMixin:
    """Mixin that adds the public mutation methods to ``CircuitService``.

    This class relies on the following attributes/methods being provided by
    the host class (``CircuitService``):

    * ``self._event_repo`` — :class:`EventRepository`
    * ``self._stacks`` — :class:`UndoRedoStacks`
    * ``self._get_next_seq(session_id)``
    * ``self._maybe_create_snapshot(session_id, seq)``
    * ``self._record_action(session_id, actor_id, event)``
    * ``self.get_circuit_state(session_id)``
    """

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
        state = await self._record_action(session_id, actor_id, event)
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
        state = await self._record_action(session_id, actor_id, event)
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

        # Cascade: a deleted component drops every wire touching it. Wire
        # deletes are emitted before the component delete so the log
        # replays cleanly even if a snapshot lands mid-cascade.
        connected_wires = [
            w
            for w in state.wires
            if w.from_component_id == component_id or w.to_component_id == component_id
        ]

        events: list[CircuitEvent] = []

        for wire in connected_wires:
            seq = await self._get_next_seq(session_id)
            wire_event = WireDeletedEvent(
                sessionId=session_id,
                seq=seq,
                actorId=actor_id,
                timestamp=datetime.utcnow(),
                payload=WireDeletedPayload(wireId=wire.id),
            )
            # Direct append (no _record_action) because the undo/redo
            # bookkeeping for the cascade happens once at the end.
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
            self._stacks.push_undo(session_id, actor_id, event)
        self._stacks.clear_redo(session_id, actor_id)

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
        validate_wire_connection(state, wire)

        seq = await self._get_next_seq(session_id)
        event = WireAddedEvent(
            sessionId=session_id,
            seq=seq,
            actorId=actor_id,
            timestamp=datetime.utcnow(),
            payload=WireAddedPayload(wire=wire),
        )
        state = await self._record_action(session_id, actor_id, event)
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
        state = await self._record_action(session_id, actor_id, event)
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
        state = await self._record_action(session_id, actor_id, event)
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
        state = await self._record_action(session_id, actor_id, event)
        return event, state
