"""Build inverse and re-sequenced events for undo and redo.

Why this module exists separately
---------------------------------
Undo and redo do not mutate the event log directly — they append *new*
events that produce the desired state change. Crafting those events takes
some lookups (e.g. "what position was this component at before the move?"),
so the logic is a bit chunky and lives in its own file.

Two public helpers
------------------
``create_inverse_event``
    Given the event the actor wants to undo, return a new event that
    cancels it. Some inverses need historical context (the previous
    position of a moved component, the original payload of a deleted
    component, etc.), so this helper reads the full event log via the
    repository.

``recreate_event_with_seq``
    Given a previously-undone event, produce an identical event with a
    fresh ``seq`` and ``timestamp`` so it can be appended to the log as a
    redo. The original event is left untouched.
"""

from datetime import datetime

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
from app.models.circuit import Annotation, CircuitComponent, Position, Wire
from app.repositories.event_repository import EventRepository


async def create_inverse_event(
    event_repo: EventRepository,
    session_id: str,
    actor_id: str,
    event: CircuitEvent,
    seq: int,
) -> CircuitEvent | None:
    """Return an event that, when applied, reverses ``event``.

    Returns ``None`` only when there is no historical info available to
    rebuild the inverse (e.g. a delete with no matching prior add — which
    in practice should not happen, but we stay defensive against malformed
    logs).
    """
    if isinstance(event, ComponentAddedEvent):
        # Inverse of "add component X" is "delete component X".
        return ComponentDeletedEvent(
            sessionId=session_id,
            seq=seq,
            actorId=actor_id,
            timestamp=datetime.utcnow(),
            payload=ComponentDeletedPayload(componentId=event.payload.component.id),
        )

    if isinstance(event, ComponentDeletedEvent):
        # Inverse of "delete component X" is "re-add component X with the
        # exact payload it had originally". Walk the log to find that add.
        events = await event_repo.get_all_events(session_id)
        for e in events:
            if (
                e.get("type") == CircuitEventType.COMPONENT_ADDED
                and e.get("payload", {}).get("component", {}).get("id")
                == event.payload.component_id
            ):
                component = CircuitComponent.model_validate(e["payload"]["component"])
                return ComponentAddedEvent(
                    sessionId=session_id,
                    seq=seq,
                    actorId=actor_id,
                    timestamp=datetime.utcnow(),
                    payload=ComponentAddedPayload(component=component),
                )
        return None

    if isinstance(event, ComponentMovedEvent):
        # Inverse of "move X to P" is "move X back to P_prev". P_prev is the
        # position from the most recent add or move *before* this event, so
        # we scan the whole log and keep updating prev_position as we go.
        events = await event_repo.get_all_events(session_id)
        prev_position: Position | None = None
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
        events = await event_repo.get_all_events(session_id)
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
            payload=AnnotationDeletedPayload(annotationId=event.payload.annotation.id),
        )

    if isinstance(event, AnnotationDeletedEvent):
        events = await event_repo.get_all_events(session_id)
        for e in events:
            if (
                e.get("type") == CircuitEventType.ANNOTATION_ADDED
                and e.get("payload", {}).get("annotation", {}).get("id")
                == event.payload.annotation_id
            ):
                annotation = Annotation.model_validate(e["payload"]["annotation"])
                return AnnotationAddedEvent(
                    sessionId=session_id,
                    seq=seq,
                    actorId=actor_id,
                    timestamp=datetime.utcnow(),
                    payload=AnnotationAddedPayload(annotation=annotation),
                )
        return None

    return None


def recreate_event_with_seq(event: CircuitEvent, seq: int) -> CircuitEvent:
    """Re-emit ``event`` with a fresh ``seq`` and current ``timestamp``.

    Used by redo: the original undone event is replayed onto the log under
    a new sequence number so it lands strictly after every other event.
    """
    # by_alias=True is important — Pydantic models use camelCase aliases on
    # the wire (sessionId, actorId), and model_validate expects those keys
    # back when we round-trip through a dict.
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
