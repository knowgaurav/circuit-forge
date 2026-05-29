"""Pure projection of one stored event onto a circuit state.

Why this module exists separately
---------------------------------
``CircuitService.get_circuit_state`` rebuilds a circuit by replaying every
event since the last snapshot. The replay step itself is a *pure function*:
given a state and one event, return the new state. No database, no clock,
no random sources.

Pulling that function into its own file keeps two things clean:

1. The pure projection logic stays small and easy to read.
2. Other modules (``SessionService._apply_event_to_state`` for snapshot
   rebuilds, plus property tests) can rely on a single source of truth for
   "how does this event change the state?".

Dry run
-------
Suppose ``state`` has two components ``[A, B]`` and we apply a
``COMPONENT_DELETED`` event for ``A`` with ``seq=7``::

    before: state.components = [A, B], state.version = 6
    event:  {"type": "component.deleted", "seq": 7,
             "payload": {"componentId": "A"}}
    after:  state.components = [B], state.version = 7

The version is taken from the event's ``seq`` so the rebuilt state matches
the live ``get_circuit_state`` byte for byte.
"""

from typing import Any

from app.events.schema import CircuitEventType
from app.models.circuit import (
    Annotation,
    CircuitComponent,
    CircuitState,
    Position,
    Wire,
)


def apply_event(state: CircuitState, event_data: dict[str, Any]) -> CircuitState:
    """Apply a single stored event document to ``state`` in place and return it.

    ``event_data`` is the raw Mongo document shape (``type``, ``seq``,
    ``payload``, ...) — the same shape used in WebSocket replay messages and
    in snapshot/replay tests.
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

    # version is set from event.seq (not state.version + 1) so that a state
    # rebuilt from a snapshot + tail of events is byte-identical to a state
    # produced by replaying every event from scratch.
    state.version = seq
    return state
