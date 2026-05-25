"""Event definitions for event sourcing.

Re-exports the public API from :mod:`app.events.schema` so callers can write
``from app.events import CircuitEvent`` without depending on the schema module
layout.
"""

from app.events.schema import (
    AnnotationAddedEvent,
    AnnotationAddedPayload,
    AnnotationDeletedEvent,
    AnnotationDeletedPayload,
    BaseEvent,
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

__all__ = [
    "AnnotationAddedEvent",
    "AnnotationAddedPayload",
    "AnnotationDeletedEvent",
    "AnnotationDeletedPayload",
    "BaseEvent",
    "CircuitEvent",
    "CircuitEventType",
    "ComponentAddedEvent",
    "ComponentAddedPayload",
    "ComponentDeletedEvent",
    "ComponentDeletedPayload",
    "ComponentMovedEvent",
    "ComponentMovedPayload",
    "WireAddedEvent",
    "WireAddedPayload",
    "WireDeletedEvent",
    "WireDeletedPayload",
]
