"""Property tests for event-log determinism (Story A — A.7, A.8).

Two properties are exercised:

* **A.7 — Determinism.** Applying the same event log twice from a fresh
  empty state yields identical ``CircuitState`` (modulo the wallclock
  ``updatedAt`` field, which is incidental).

* **A.8 — Order-invariance under composition.** Folding events one-by-one
  and folding the same events as a single batch must yield the same final
  state. This is what guarantees ``get_circuit_state`` and the
  reconnect-delta replay agree.

The strategy generates random valid event sequences with monotonic seq.
Only event types whose payloads are fully self-contained (no global
registry lookups) are emitted: ``COMPONENT_ADDED``, ``COMPONENT_MOVED``
and ``COMPONENT_DELETED``. Wires are intentionally excluded because
``add_wire`` runs an interactive validation step against the live state;
those are tested separately in ``test_circuit_service.py``.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from app.events.schema import CircuitEventType
from app.models.circuit import CircuitState
from app.services.circuit_service import CircuitService
from tests.factories import ComponentFactory


def _replay(events: list[dict[str, Any]]) -> CircuitState:
    """Apply every event to a fresh empty state via ``CircuitService._apply_event``.

    ``CircuitService`` is constructed with ``None`` for the database because
    ``_apply_event`` is a pure function and never touches the repository.
    """
    service = CircuitService.__new__(CircuitService)
    state = CircuitState.create_empty("DET123")
    for event in events:
        state = service._apply_event(state, event)
    return state


def _state_signature(state: CircuitState) -> dict[str, Any]:
    """Drop the wallclock ``updatedAt`` so equality checks state, not time."""
    dump = state.model_dump(by_alias=True)
    dump.pop("updatedAt", None)
    return dump


# ---------------------------------------------------------------------------
# Hypothesis strategies
# ---------------------------------------------------------------------------


@st.composite
def _event_log(draw) -> list[dict[str, Any]]:
    """Generate a valid event log over a small population of components.

    The strategy maintains an "alive set" of component ids so that
    ``COMPONENT_MOVED`` and ``COMPONENT_DELETED`` only ever reference
    components currently in state. seq is monotonic starting at 1.
    """
    n_events = draw(st.integers(min_value=0, max_value=20))
    events: list[dict[str, Any]] = []
    alive: list[str] = []

    for i in range(n_events):
        seq = i + 1

        # Choose an event type, but only allow MOVE/DELETE if components exist
        if not alive:
            kind = "ADD"
        else:
            kind = draw(st.sampled_from(["ADD", "MOVE", "DELETE"]))

        if kind == "ADD":
            comp_id = f"c-{seq}"
            x = draw(st.integers(min_value=0, max_value=1000))
            y = draw(st.integers(min_value=0, max_value=1000))
            comp = ComponentFactory.create_and_gate(id=comp_id, x=float(x), y=float(y))
            alive.append(comp_id)
            events.append(
                {
                    "type": CircuitEventType.COMPONENT_ADDED,
                    "seq": seq,
                    "sessionId": "DET123",
                    "actorId": "actor",
                    "timestamp": datetime.utcnow(),
                    "payload": {"component": comp.model_dump(by_alias=True)},
                }
            )

        elif kind == "MOVE":
            comp_id = draw(st.sampled_from(alive))
            x = draw(st.integers(min_value=0, max_value=1000))
            y = draw(st.integers(min_value=0, max_value=1000))
            events.append(
                {
                    "type": CircuitEventType.COMPONENT_MOVED,
                    "seq": seq,
                    "sessionId": "DET123",
                    "actorId": "actor",
                    "timestamp": datetime.utcnow(),
                    "payload": {
                        "componentId": comp_id,
                        "position": {"x": float(x), "y": float(y)},
                    },
                }
            )

        else:  # DELETE
            comp_id = draw(st.sampled_from(alive))
            alive.remove(comp_id)
            events.append(
                {
                    "type": CircuitEventType.COMPONENT_DELETED,
                    "seq": seq,
                    "sessionId": "DET123",
                    "actorId": "actor",
                    "timestamp": datetime.utcnow(),
                    "payload": {"componentId": comp_id},
                }
            )

    return events


# ---------------------------------------------------------------------------
# Properties
# ---------------------------------------------------------------------------


@given(events=_event_log())
@settings(
    max_examples=1000,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow, HealthCheck.data_too_large],
)
def test_a7_replay_is_deterministic(events: list[dict[str, Any]]) -> None:
    """A.7: two replays of the same log produce identical state."""
    state_a = _replay(events)
    state_b = _replay(events)
    assert _state_signature(state_a) == _state_signature(state_b)


@given(events=_event_log())
@settings(
    max_examples=1000,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow, HealthCheck.data_too_large],
)
def test_a8_step_by_step_equals_batch(events: list[dict[str, Any]]) -> None:
    """A.8: applying events one-by-one matches applying them as a batch.

    "Batch" here means: run the same fold inside a single function call,
    re-using the same in-memory state object across all events. "Step-by-
    step" means: build state, freeze it (round-trip through ``model_dump``
    + ``model_validate``), then apply the next event. If ``_apply_event``
    depends on any hidden state outside its inputs, these will diverge.
    """
    service = CircuitService.__new__(CircuitService)

    # Step-by-step with a model_dump/model_validate round-trip in between
    step_state = CircuitState.create_empty("DET123")
    for event in events:
        step_state = service._apply_event(step_state, event)
        # Force a serialization round-trip to flush any non-pure mutations
        step_state = CircuitState.model_validate(step_state.model_dump(by_alias=True))

    # Single batch fold
    batch_state = _replay(events)

    assert _state_signature(step_state) == _state_signature(batch_state)
