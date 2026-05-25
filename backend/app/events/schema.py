"""Event schema for circuit event sourcing.

Single source of truth for circuit event types. All event-related code reads
from here. Field naming follows the inter-story contract:

- ``seq``        — monotonic per-session sequence number (1, 2, 3, ...)
- ``session_id`` — 6-char session code identifying the session
                    (Pydantic alias: ``sessionId``)
- ``actor_id``   — participant id of the event emitter
                    (Pydantic alias: ``actorId``)
- ``timestamp``  — wall-clock time the event was created

The discriminated union ``CircuitEvent`` lets Pydantic deserialize stored event
documents back into the correct typed model based on the ``type`` field.
"""

from datetime import datetime
from enum import Enum
from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field

from app.models.circuit import Annotation, CircuitComponent, Position, Wire


class CircuitEventType(str, Enum):
    """Circuit event types for event sourcing."""

    COMPONENT_ADDED = "COMPONENT_ADDED"
    COMPONENT_MOVED = "COMPONENT_MOVED"
    COMPONENT_DELETED = "COMPONENT_DELETED"
    WIRE_ADDED = "WIRE_ADDED"
    WIRE_DELETED = "WIRE_DELETED"
    ANNOTATION_ADDED = "ANNOTATION_ADDED"
    ANNOTATION_DELETED = "ANNOTATION_DELETED"


class BaseEvent(BaseModel):
    """Common fields for every circuit event."""

    seq: int = Field(ge=1)
    session_id: str = Field(alias="sessionId")
    actor_id: str = Field(alias="actorId")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Payload models
# ---------------------------------------------------------------------------


class ComponentAddedPayload(BaseModel):
    component: CircuitComponent


class ComponentMovedPayload(BaseModel):
    component_id: str = Field(alias="componentId")
    position: Position

    model_config = {"populate_by_name": True}


class ComponentDeletedPayload(BaseModel):
    component_id: str = Field(alias="componentId")

    model_config = {"populate_by_name": True}


class WireAddedPayload(BaseModel):
    wire: Wire


class WireDeletedPayload(BaseModel):
    wire_id: str = Field(alias="wireId")

    model_config = {"populate_by_name": True}


class AnnotationAddedPayload(BaseModel):
    annotation: Annotation


class AnnotationDeletedPayload(BaseModel):
    annotation_id: str = Field(alias="annotationId")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Concrete events
# ---------------------------------------------------------------------------


class ComponentAddedEvent(BaseEvent):
    type: Literal["COMPONENT_ADDED"] = "COMPONENT_ADDED"
    payload: ComponentAddedPayload


class ComponentMovedEvent(BaseEvent):
    type: Literal["COMPONENT_MOVED"] = "COMPONENT_MOVED"
    payload: ComponentMovedPayload


class ComponentDeletedEvent(BaseEvent):
    type: Literal["COMPONENT_DELETED"] = "COMPONENT_DELETED"
    payload: ComponentDeletedPayload


class WireAddedEvent(BaseEvent):
    type: Literal["WIRE_ADDED"] = "WIRE_ADDED"
    payload: WireAddedPayload


class WireDeletedEvent(BaseEvent):
    type: Literal["WIRE_DELETED"] = "WIRE_DELETED"
    payload: WireDeletedPayload


class AnnotationAddedEvent(BaseEvent):
    type: Literal["ANNOTATION_ADDED"] = "ANNOTATION_ADDED"
    payload: AnnotationAddedPayload


class AnnotationDeletedEvent(BaseEvent):
    type: Literal["ANNOTATION_DELETED"] = "ANNOTATION_DELETED"
    payload: AnnotationDeletedPayload


CircuitEvent = Annotated[
    Union[
        ComponentAddedEvent,
        ComponentMovedEvent,
        ComponentDeletedEvent,
        WireAddedEvent,
        WireDeletedEvent,
        AnnotationAddedEvent,
        AnnotationDeletedEvent,
    ],
    Field(discriminator="type"),
]
