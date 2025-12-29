"""Event sourcing event models."""

from datetime import datetime
from enum import Enum
from typing import Literal, Union

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
    """Base event model."""

    session_code: str = Field(alias="sessionCode")
    version: int = Field(ge=1)
    user_id: str = Field(alias="userId")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True}


class ComponentAddedPayload(BaseModel):
    """Payload for component added event."""

    component: CircuitComponent


class ComponentMovedPayload(BaseModel):
    """Payload for component moved event."""

    component_id: str = Field(alias="componentId")
    position: Position

    model_config = {"populate_by_name": True}


class ComponentDeletedPayload(BaseModel):
    """Payload for component deleted event."""

    component_id: str = Field(alias="componentId")

    model_config = {"populate_by_name": True}


class WireAddedPayload(BaseModel):
    """Payload for wire added event."""

    wire: Wire


class WireDeletedPayload(BaseModel):
    """Payload for wire deleted event."""

    wire_id: str = Field(alias="wireId")

    model_config = {"populate_by_name": True}


class AnnotationAddedPayload(BaseModel):
    """Payload for annotation added event."""

    annotation: Annotation


class AnnotationDeletedPayload(BaseModel):
    """Payload for annotation deleted event."""

    annotation_id: str = Field(alias="annotationId")

    model_config = {"populate_by_name": True}


class ComponentAddedEvent(BaseEvent):
    """Event for adding a component."""

    type: Literal["COMPONENT_ADDED"] = "COMPONENT_ADDED"
    payload: ComponentAddedPayload


class ComponentMovedEvent(BaseEvent):
    """Event for moving a component."""

    type: Literal["COMPONENT_MOVED"] = "COMPONENT_MOVED"
    payload: ComponentMovedPayload


class ComponentDeletedEvent(BaseEvent):
    """Event for deleting a component."""

    type: Literal["COMPONENT_DELETED"] = "COMPONENT_DELETED"
    payload: ComponentDeletedPayload


class WireAddedEvent(BaseEvent):
    """Event for adding a wire."""

    type: Literal["WIRE_ADDED"] = "WIRE_ADDED"
    payload: WireAddedPayload


class WireDeletedEvent(BaseEvent):
    """Event for deleting a wire."""

    type: Literal["WIRE_DELETED"] = "WIRE_DELETED"
    payload: WireDeletedPayload


class AnnotationAddedEvent(BaseEvent):
    """Event for adding an annotation."""

    type: Literal["ANNOTATION_ADDED"] = "ANNOTATION_ADDED"
    payload: AnnotationAddedPayload


class AnnotationDeletedEvent(BaseEvent):
    """Event for deleting an annotation."""

    type: Literal["ANNOTATION_DELETED"] = "ANNOTATION_DELETED"
    payload: AnnotationDeletedPayload


CircuitEvent = Union[
    ComponentAddedEvent,
    ComponentMovedEvent,
    ComponentDeletedEvent,
    WireAddedEvent,
    WireDeletedEvent,
    AnnotationAddedEvent,
    AnnotationDeletedEvent,
]
