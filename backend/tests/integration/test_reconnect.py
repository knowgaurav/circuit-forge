"""Integration test for reconnect protocol (Story A — A.9).

We can't run the full ASGI WebSocket route because the server reaches into
``db_manager.get_database()`` which expects a live MongoDB. Instead this
test exercises the same code path the WebSocket entrypoint exercises:

1. Create a session and apply 30 events through ``CircuitService``.
2. Construct a ``WebSocketHandler`` against a fake MongoDB.
3. Simulate a "drop" by simply tearing down the connection state in the test.
4. Reconnect with ``last_seen_seq=20`` and assert the server picks the
   delta branch with exactly 10 events (seq 21..30).
5. Apply the delta to a fresh full replay and confirm the resulting state
   matches the snapshot-based ``get_circuit_state``.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import pytest
from pymongo.errors import DuplicateKeyError

from app.models.circuit import CircuitState
from app.services.circuit_service import CircuitService
from app.websocket.handler import WebSocketHandler
from tests.factories import ComponentFactory


SESSION_ID = "RC0001"


# ---------------------------------------------------------------------------
# Tiny in-memory Mongo fake (re-implementation kept local to integration tests)
# ---------------------------------------------------------------------------


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]], sort_field: str | None = None,
                 reverse: bool = False) -> None:
        self._docs = list(docs)
        if sort_field is not None:
            self._docs.sort(key=lambda d: d.get(sort_field, 0), reverse=reverse)

    def sort(self, field: str, direction: int = 1) -> "_FakeCursor":
        self._docs.sort(key=lambda d: d.get(field, 0), reverse=direction < 0)
        return self

    def limit(self, n: int) -> "_FakeCursor":
        self._docs = self._docs[:n]
        return self

    def __aiter__(self) -> "_FakeCursor":
        self._iter = iter(self._docs)
        return self

    async def __anext__(self) -> dict[str, Any]:
        try:
            return next(self._iter)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class _FakeCollection:
    def __init__(self) -> None:
        self._docs: list[dict[str, Any]] = []
        self._unique: list[tuple[str, ...]] = []

    async def create_index(self, keys, unique: bool = False, name: str | None = None) -> str:
        if unique:
            field_names = tuple(k[0] if isinstance(k, tuple) else k for k in keys)
            self._unique.append(field_names)
        return name or "idx"

    async def insert_one(self, doc: dict[str, Any]) -> None:
        for key_tuple in self._unique:
            value = tuple(doc.get(field) for field in key_tuple)
            for existing in self._docs:
                existing_value = tuple(existing.get(field) for field in key_tuple)
                if existing_value == value:
                    raise DuplicateKeyError(
                        f"duplicate key on {key_tuple}: {value}"
                    )
        self._docs.append(doc)

    def find(self, query: dict[str, Any]) -> _FakeCursor:
        def matches(doc: dict[str, Any]) -> bool:
            for key, expected in query.items():
                actual = doc.get(key)
                if isinstance(expected, dict):
                    for op, op_val in expected.items():
                        if op == "$gt" and not (actual is not None and actual > op_val):
                            return False
                        if op == "$gte" and not (actual is not None and actual >= op_val):
                            return False
                        if op == "$lt" and not (actual is not None and actual < op_val):
                            return False
                        if op == "$lte" and not (actual is not None and actual <= op_val):
                            return False
                else:
                    if actual != expected:
                        return False
            return True

        return _FakeCursor([dict(d) for d in self._docs if matches(d)])

    async def delete_many(self, query: dict[str, Any]) -> Any:
        before = len(self._docs)
        self._docs = [
            d for d in self._docs
            if not all(d.get(k) == v for k, v in query.items() if not isinstance(v, dict))
        ]

        class _Result:
            deleted_count = before - len(self._docs)

        return _Result()

    async def count_documents(self, query: dict[str, Any]) -> int:
        return sum(
            1 for d in self._docs if all(d.get(k) == v for k, v in query.items())
        )


class _FakeDatabase:
    def __init__(self) -> None:
        self._collections: dict[str, _FakeCollection] = {}

    def __getitem__(self, name: str) -> _FakeCollection:
        if name not in self._collections:
            self._collections[name] = _FakeCollection()
        return self._collections[name]


# ---------------------------------------------------------------------------
# Captured WebSocket: records the JSON sent by the handler
# ---------------------------------------------------------------------------


class _CapturedWebSocket:
    def __init__(self) -> None:
        self.sent: list[dict[str, Any]] = []

    async def send_json(self, payload: dict[str, Any]) -> None:
        # Mimic the WebSocket implementation's JSON round-trip so the test
        # sees exactly what the wire would carry.
        self.sent.append(json.loads(json.dumps(payload, default=str)))


# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_reconnect_with_last_seen_seq_returns_delta() -> None:
    db = _FakeDatabase()
    circuit_service = CircuitService(db)

    # 1. Apply 30 component_added events
    for i in range(1, 31):
        component = ComponentFactory.create_and_gate(id=f"and-{i}", x=float(i), y=0)
        await circuit_service.add_component(SESSION_ID, "actor-1", component)

    # 2. Build a handler over the same fake DB and pre-bind its services
    handler = WebSocketHandler()
    handler._circuit_service = circuit_service

    # 3. Reconnect with last_seen_seq=20 — server should send a delta of 10
    ws = _CapturedWebSocket()
    await handler._send_initial_sync(ws, SESSION_ID, last_seen_seq=20)

    assert len(ws.sent) == 1
    msg = ws.sent[0]
    assert msg["type"] == "sync:delta"
    assert msg["payload"]["fromSeq"] == 20
    events = msg["payload"]["events"]
    assert len(events) == 10
    seqs = [e["seq"] for e in events]
    assert seqs == list(range(21, 31))

    # 4. Apply the delta to a fresh empty state and compare to the
    #    snapshot-based full state.
    state_from_delta = CircuitState.create_empty(SESSION_ID)
    # First, apply the full set of events 1..20 to seed the "client" state
    for i in range(1, 21):
        comp_doc = ComponentFactory.create_and_gate(
            id=f"and-{i}", x=float(i), y=0
        ).model_dump(by_alias=True)
        circuit_service._apply_event(
            state_from_delta,
            {
                "type": "COMPONENT_ADDED",
                "seq": i,
                "sessionId": SESSION_ID,
                "actorId": "actor-1",
                "timestamp": datetime.utcnow(),
                "payload": {"component": comp_doc},
            },
        )
    # Now apply the server-sent delta
    for event in events:
        circuit_service._apply_event(state_from_delta, event)

    full_state = await circuit_service.get_circuit_state(SESSION_ID)

    full_dump = full_state.model_dump(by_alias=True)
    delta_dump = state_from_delta.model_dump(by_alias=True)
    full_dump.pop("updatedAt", None)
    delta_dump.pop("updatedAt", None)
    assert full_dump == delta_dump
    assert state_from_delta.version == 30


@pytest.mark.asyncio
async def test_first_connection_without_last_seen_seq_sends_snapshot() -> None:
    """When the client does not provide last_seen_seq, server sends sync:state."""
    db = _FakeDatabase()
    circuit_service = CircuitService(db)
    for i in range(1, 6):
        component = ComponentFactory.create_and_gate(id=f"and-{i}", x=float(i), y=0)
        await circuit_service.add_component(SESSION_ID, "actor-1", component)

    handler = WebSocketHandler()
    handler._circuit_service = circuit_service

    # _send_sync_state needs a session_service to fetch participants. Stub it
    # with a minimal async object that returns no participants.
    class _Stub:
        async def get_session_participants(self, _code: str) -> list[Any]:
            return []

    handler._session_service = _Stub()

    ws = _CapturedWebSocket()
    await handler._send_initial_sync(ws, SESSION_ID, last_seen_seq=None)

    assert len(ws.sent) == 1
    assert ws.sent[0]["type"] == "sync:state"
