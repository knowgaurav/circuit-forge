"""WebSocket message type definitions."""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.models.circuit import Annotation, CircuitComponent, CircuitState, Position, Wire
from app.models.session import Participant


# Client -> Server Messages
class ComponentAddMessage(BaseModel):
    """Add component message."""
    type: Literal["circuit:component:add"] = "circuit:component:add"
    payload: Dict[str, Any]


class ComponentMoveMessage(BaseModel):
    """Move component message."""
    type: Literal["circuit:component:move"] = "circuit:component:move"
    payload: Dict[str, Any]


class ComponentDeleteMessage(BaseModel):
    """Delete component message."""
    type: Literal["circuit:component:delete"] = "circuit:component:delete"
    payload: Dict[str, Any]


class WireAddMessage(BaseModel):
    """Add wire message."""
    type: Literal["circuit:wire:add"] = "circuit:wire:add"
    payload: Dict[str, Any]


class WireDeleteMessage(BaseModel):
    """Delete wire message."""
    type: Literal["circuit:wire:delete"] = "circuit:wire:delete"
    payload: Dict[str, Any]


class AnnotationAddMessage(BaseModel):
    """Add annotation message."""
    type: Literal["circuit:annotation:add"] = "circuit:annotation:add"
    payload: Dict[str, Any]


class AnnotationDeleteMessage(BaseModel):
    """Delete annotation message."""
    type: Literal["circuit:annotation:delete"] = "circuit:annotation:delete"
    payload: Dict[str, Any]


class UndoMessage(BaseModel):
    """Undo message."""
    type: Literal["circuit:undo"] = "circuit:undo"
    payload: Dict[str, Any] = Field(default_factory=dict)


class RedoMessage(BaseModel):
    """Redo message."""
    type: Literal["circuit:redo"] = "circuit:redo"
    payload: Dict[str, Any] = Field(default_factory=dict)


class CursorMoveMessage(BaseModel):
    """Cursor move message."""
    type: Literal["presence:cursor:move"] = "presence:cursor:move"
    payload: Dict[str, Any]


class SelectionChangeMessage(BaseModel):
    """Selection change message."""
    type: Literal["presence:selection:change"] = "presence:selection:change"
    payload: Dict[str, Any]


class EditRequestMessage(BaseModel):
    """Edit request message."""
    type: Literal["permission:request:edit"] = "permission:request:edit"
    payload: Dict[str, Any] = Field(default_factory=dict)


class PermissionApproveMessage(BaseModel):
    """Permission approve message."""
    type: Literal["permission:approve"] = "permission:approve"
    payload: Dict[str, Any]


class PermissionDenyMessage(BaseModel):
    """Permission deny message."""
    type: Literal["permission:deny"] = "permission:deny"
    payload: Dict[str, Any]


class PermissionRevokeMessage(BaseModel):
    """Permission revoke message."""
    type: Literal["permission:revoke"] = "permission:revoke"
    payload: Dict[str, Any]


class SimulationStartMessage(BaseModel):
    """Simulation start message."""
    type: Literal["simulation:start"] = "simulation:start"
    payload: Dict[str, Any] = Field(default_factory=dict)


class SimulationStopMessage(BaseModel):
    """Simulation stop message."""
    type: Literal["simulation:stop"] = "simulation:stop"
    payload: Dict[str, Any] = Field(default_factory=dict)


class SimulationStateMessage(BaseModel):
    """Simulation state message."""
    type: Literal["simulation:state"] = "simulation:state"
    payload: Dict[str, Any]


ClientMessage = Union[
    ComponentAddMessage,
    ComponentMoveMessage,
    ComponentDeleteMessage,
    WireAddMessage,
    WireDeleteMessage,
    AnnotationAddMessage,
    AnnotationDeleteMessage,
    UndoMessage,
    RedoMessage,
    CursorMoveMessage,
    SelectionChangeMessage,
    EditRequestMessage,
    PermissionApproveMessage,
    PermissionDenyMessage,
    PermissionRevokeMessage,
    SimulationStartMessage,
    SimulationStopMessage,
    SimulationStateMessage,
]


# Server -> Client Messages
class SyncStateMessage(BaseModel):
    """Sync state message."""
    type: Literal["sync:state"] = "sync:state"
    payload: Dict[str, Any]


class ComponentAddedMessage(BaseModel):
    """Component added broadcast."""
    type: Literal["circuit:component:added"] = "circuit:component:added"
    payload: Dict[str, Any]


class ComponentMovedMessage(BaseModel):
    """Component moved broadcast."""
    type: Literal["circuit:component:moved"] = "circuit:component:moved"
    payload: Dict[str, Any]


class ComponentDeletedMessage(BaseModel):
    """Component deleted broadcast."""
    type: Literal["circuit:component:deleted"] = "circuit:component:deleted"
    payload: Dict[str, Any]


class WireAddedMessage(BaseModel):
    """Wire added broadcast."""
    type: Literal["circuit:wire:added"] = "circuit:wire:added"
    payload: Dict[str, Any]


class WireDeletedMessage(BaseModel):
    """Wire deleted broadcast."""
    type: Literal["circuit:wire:deleted"] = "circuit:wire:deleted"
    payload: Dict[str, Any]


class AnnotationAddedMessage(BaseModel):
    """Annotation added broadcast."""
    type: Literal["circuit:annotation:added"] = "circuit:annotation:added"
    payload: Dict[str, Any]


class AnnotationDeletedMessage(BaseModel):
    """Annotation deleted broadcast."""
    type: Literal["circuit:annotation:deleted"] = "circuit:annotation:deleted"
    payload: Dict[str, Any]


class StateUpdatedMessage(BaseModel):
    """State updated broadcast."""
    type: Literal["circuit:state:updated"] = "circuit:state:updated"
    payload: Dict[str, Any]


class CursorMovedMessage(BaseModel):
    """Cursor moved broadcast."""
    type: Literal["presence:cursor:moved"] = "presence:cursor:moved"
    payload: Dict[str, Any]


class SelectionChangedMessage(BaseModel):
    """Selection changed broadcast."""
    type: Literal["presence:selection:changed"] = "presence:selection:changed"
    payload: Dict[str, Any]


class ParticipantJoinedMessage(BaseModel):
    """Participant joined broadcast."""
    type: Literal["presence:participant:joined"] = "presence:participant:joined"
    payload: Dict[str, Any]


class ParticipantLeftMessage(BaseModel):
    """Participant left broadcast."""
    type: Literal["presence:participant:left"] = "presence:participant:left"
    payload: Dict[str, Any]


class EditRequestReceivedMessage(BaseModel):
    """Edit request received broadcast."""
    type: Literal["permission:request:received"] = "permission:request:received"
    payload: Dict[str, Any]


class PermissionGrantedMessage(BaseModel):
    """Permission granted broadcast."""
    type: Literal["permission:granted"] = "permission:granted"
    payload: Dict[str, Any]


class PermissionDeniedMessage(BaseModel):
    """Permission denied broadcast."""
    type: Literal["permission:denied"] = "permission:denied"
    payload: Dict[str, Any]


class PermissionRevokedMessage(BaseModel):
    """Permission revoked broadcast."""
    type: Literal["permission:revoked"] = "permission:revoked"
    payload: Dict[str, Any]


class ErrorMessage(BaseModel):
    """Error message."""
    type: Literal["error"] = "error"
    payload: Dict[str, Any]


class SimulationStartedMessage(BaseModel):
    """Simulation started broadcast."""
    type: Literal["simulation:started"] = "simulation:started"
    payload: Dict[str, Any]


class SimulationStoppedMessage(BaseModel):
    """Simulation stopped broadcast."""
    type: Literal["simulation:stopped"] = "simulation:stopped"
    payload: Dict[str, Any]


class SimulationStateUpdatedMessage(BaseModel):
    """Simulation state updated broadcast."""
    type: Literal["simulation:state:updated"] = "simulation:state:updated"
    payload: Dict[str, Any]


ServerMessage = Union[
    SyncStateMessage,
    ComponentAddedMessage,
    ComponentMovedMessage,
    ComponentDeletedMessage,
    WireAddedMessage,
    WireDeletedMessage,
    AnnotationAddedMessage,
    AnnotationDeletedMessage,
    StateUpdatedMessage,
    CursorMovedMessage,
    SelectionChangedMessage,
    ParticipantJoinedMessage,
    ParticipantLeftMessage,
    EditRequestReceivedMessage,
    PermissionGrantedMessage,
    PermissionDeniedMessage,
    PermissionRevokedMessage,
    SimulationStartedMessage,
    SimulationStoppedMessage,
    SimulationStateUpdatedMessage,
    ErrorMessage,
]
