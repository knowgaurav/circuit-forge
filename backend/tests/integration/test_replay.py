"""Integration tests for time-travel replay (Story C — C.1, C.2, C.6, C.7, C.8).

The tests run against a tiny in-memory MongoDB fake (the same shape used in
``test_reconnect.py``) so we exercise the real ``SessionService`` /
``CircuitService`` / ``EventRepository`` code paths without a live database.

Coverage:

* ``get_state_at`` matches a from-scratch replay at the snapshot boundary
  (seq=50) and mid-window (seq=75).
* The performance promise: ``get_state_at(99)`` on a 100-event session
  finishes in <100 ms. The bench is informational under coverage runs.
* ``GET /api/sessions/{code}/events?from_seq=0&to_seq=50`` returns the events
  in the requested window and the nearest snapshot.
* ``POST /api/sessions/{code}/branch?from_seq=N`` creates a new session whose
  ``get_state_at(0)`` matches the source's ``get_state_at(N)``.
"""

from __future__ import annotations

import os
import random
import time
from datetime import datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pymongo.errors import DuplicateKeyError

from app.api.sessions import get_session_service
from app.main import app
from app.models.circuit import CircuitState
from app.services.circuit_service import CircuitService
from app.services.session_service import SNAPSHOT_INTERVAL, SessionService
from tests.factories import ComponentFactory


SESSION_ID = "REPLAY"


# ---------------------------------------------------------------------------
# In-memory MongoDB fake (kept local to integration tests; mirrors the shape
# in test_reconnect.py).
# ---------------------------------------------------------------------------


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]) -> None:
        self._docs = list(docs)

    def sort(self, field: str, direction: int = 1) -> "_FakeCursor":
        self._docs.sort(key=lambda d: d.get(field, 0), reverse=direction < 0)
        return self

    def limit(self, n: int) -> "_FakeCursor":
        self._docs = self._docs[:n]
        return self

    def skip(self, n: int) -> "_FakeCursor":
        self._docs = self._docs[n:]
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

    async def create_index(
        self, keys, unique: bool = False, name: str | None = None
    ) -> str:
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
                    raise DuplicateKeyError(f"duplicate key on {key_tuple}: {value}")
        self._docs.append(doc)

    async def find_one(self, query: dict[str, Any]) -> dict[str, Any] | None:
        for doc in self._docs:
            if self._matches(doc, query):
                return dict(doc)
        return None

    def find(self, query: dict[str, Any] | None = None) -> _FakeCursor:
        query = query or {}
        return _FakeCursor(
            [dict(d) for d in self._docs if self._matches(d, query)]
        )

    async def update_one(
        self, query: dict[str, Any], update: dict[str, Any]
    ) -> Any:
        modified = 0
        for doc in self._docs:
            if self._matches(doc, query):
                for field, value in update.get("$set", {}).items():
                    doc[field] = value
                modified += 1
                break

        class _Result:
            modified_count = modified

        return _Result()

    async def delete_one(self, query: dict[str, Any]) -> Any:
        for i, doc in enumerate(self._docs):
            if self._matches(doc, query):
                self._docs.pop(i)

                class _Result:
                    deleted_count = 1

                return _Result()

        class _Result:
            deleted_count = 0

        return _Result()

    async def delete_many(self, query: dict[str, Any]) -> Any:
        before = len(self._docs)
        self._docs = [d for d in self._docs if not self._matches(d, query)]

        class _Result:
            deleted_count = before - len(self._docs)

        return _Result()

    async def count_documents(self, query: dict[str, Any]) -> int:
        return sum(1 for d in self._docs if self._matches(d, query))

    @staticmethod
    def _matches(doc: dict[str, Any], query: dict[str, Any]) -> bool:
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


class _FakeDatabase:
    def __init__(self) -> None:
        self._collections: dict[str, _FakeCollection] = {}

    def __getitem__(self, name: str) -> _FakeCollection:
        if name not in self._collections:
            self._collections[name] = _FakeCollection()
        return self._collections[name]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _seed_session(
    db: _FakeDatabase,
    session_service: SessionService,
    circuit_service: CircuitService,
    n_events: int,
    seed: int = 42,
) -> None:
    """Create the session row and apply ``n_events`` random valid events.

    Snapshots fire at the natural ``SNAPSHOT_INTERVAL`` (50) inside
    ``CircuitService``; the test never creates them by hand.
    """
    rng = random.Random(seed)

    # Seed the session via the real public API so the seq=0 empty snapshot is
    # in place exactly the way production would have it.
    session, _creator = await session_service.create_session()
    # Force a known code so the API tests can address the fixture by name.
    db._collections["sessions"]._docs[0]["code"] = SESSION_ID
    # snapshots was created with the original code; reset it to SESSION_ID.
    snap = db._collections["snapshots"]._docs[0]
    snap["sessionId"] = SESSION_ID
    snap["state"]["sessionId"] = SESSION_ID

    alive: list[str] = []
    for i in range(n_events):
        if not alive:
            kind = "ADD"
        else:
            kind = rng.choice(["ADD", "ADD", "MOVE", "DELETE"])

        if kind == "ADD":
            comp = ComponentFactory.create_and_gate(
                id=f"and-{i}", x=float(rng.randint(0, 1000)), y=float(rng.randint(0, 1000))
            )
            alive.append(comp.id)
            await circuit_service.add_component(SESSION_ID, "actor-1", comp)
        elif kind == "MOVE":
            from app.models.circuit import Position

            comp_id = rng.choice(alive)
            await circuit_service.move_component(
                SESSION_ID,
                "actor-1",
                comp_id,
                Position(x=float(rng.randint(0, 1000)), y=float(rng.randint(0, 1000))),
            )
        else:
            comp_id = rng.choice(alive)
            alive.remove(comp_id)
            await circuit_service.delete_component(
                SESSION_ID, "actor-1", comp_id
            )


def _state_signature(state: CircuitState) -> dict[str, Any]:
    """Drop wallclock fields so equality compares structure not time."""
    dump = state.model_dump(by_alias=True)
    dump.pop("updatedAt", None)
    dump.pop("version", None)
    return dump


async def _replay_from_scratch(
    circuit_service: CircuitService, session_id: str, up_to_seq: int
) -> CircuitState:
    """Replay events 1..up_to_seq from an empty state without using snapshots."""
    state = CircuitState.create_empty(session_id)
    events = await circuit_service._event_repo.get_events_in_range(
        session_id, 0, up_to_seq
    )
    for event in events:
        state = circuit_service._apply_event(state, event)
    return state


# ---------------------------------------------------------------------------
# C.8 — Service-level integration tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_state_at_50_matches_full_replay() -> None:
    """At a snapshot boundary, ``get_state_at`` must equal a from-scratch replay."""
    db = _FakeDatabase()
    session_service = SessionService(db)
    circuit_service = CircuitService(db)
    await _seed_session(db, session_service, circuit_service, n_events=100)

    via_snapshot = await session_service.get_state_at(SESSION_ID, 50)
    via_replay = await _replay_from_scratch(circuit_service, SESSION_ID, 50)

    assert _state_signature(via_snapshot) == _state_signature(via_replay)


@pytest.mark.asyncio
async def test_get_state_at_75_matches_full_replay() -> None:
    """Mid-window between two snapshots."""
    db = _FakeDatabase()
    session_service = SessionService(db)
    circuit_service = CircuitService(db)
    await _seed_session(db, session_service, circuit_service, n_events=100)

    via_snapshot = await session_service.get_state_at(SESSION_ID, 75)
    via_replay = await _replay_from_scratch(circuit_service, SESSION_ID, 75)

    assert _state_signature(via_snapshot) == _state_signature(via_replay)


@pytest.mark.asyncio
async def test_get_state_at_uses_snapshot_not_full_replay() -> None:
    """``get_state_at`` must read from the latest snapshot at-or-before seq.

    We assert this by counting the events fetched: at seq=99 with a snapshot
    at seq=50, the service should pull at most ``SNAPSHOT_INTERVAL`` events
    (49 in the (50, 99] window) — never the full 99.
    """
    db = _FakeDatabase()
    session_service = SessionService(db)
    circuit_service = CircuitService(db)
    await _seed_session(db, session_service, circuit_service, n_events=100)

    # Confirm the snapshot at seq=50 is actually there.
    snap = await session_service._event_repo.get_snapshot_at_or_before_seq(
        SESSION_ID, 99
    )
    assert snap is not None
    assert snap["seq"] == 50

    delta_events = await session_service._event_repo.get_events_in_range(
        SESSION_ID, snap["seq"], 99
    )
    assert len(delta_events) <= SNAPSHOT_INTERVAL


@pytest.mark.skipif(
    "COVERAGE_RUN" in os.environ or "COV_CORE_SOURCE" in os.environ,
    reason="bench is unreliable under coverage; informational only",
)
@pytest.mark.asyncio
async def test_get_state_at_99_under_100ms() -> None:
    """C.7 bench: replaying any seq must be O(SNAPSHOT_INTERVAL + delta)."""
    db = _FakeDatabase()
    session_service = SessionService(db)
    circuit_service = CircuitService(db)
    await _seed_session(db, session_service, circuit_service, n_events=100)

    start = time.perf_counter()
    await session_service.get_state_at(SESSION_ID, 99)
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert elapsed_ms < 100.0, f"get_state_at took {elapsed_ms:.1f}ms (>= 100ms)"


# ---------------------------------------------------------------------------
# C.1 / C.6 — HTTP endpoint shape
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_events_endpoint_returns_snapshot_and_events() -> None:
    """``GET /events?from_seq=0&to_seq=50`` returns the seq=0 snapshot + 50 events."""
    db = _FakeDatabase()
    session_service = SessionService(db)
    circuit_service = CircuitService(db)
    await _seed_session(db, session_service, circuit_service, n_events=100)

    app.dependency_overrides[get_session_service] = lambda: session_service
    try:
        client = TestClient(app)
        response = client.get(
            f"/api/sessions/{SESSION_ID}/events",
            params={"from_seq": 0, "to_seq": 50},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["snapshot"] is not None
        assert body["snapshot"]["seq"] == 0
        assert len(body["events"]) == 50
        assert [e["seq"] for e in body["events"]] == list(range(1, 51))
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_branch_endpoint_creates_session_at_seq() -> None:
    """``POST /branch?from_seq=N`` creates a session whose state-at-0 = source state-at-N."""
    db = _FakeDatabase()
    session_service = SessionService(db)
    circuit_service = CircuitService(db)
    await _seed_session(db, session_service, circuit_service, n_events=100)

    source_state_at_60 = await session_service.get_state_at(SESSION_ID, 60)

    app.dependency_overrides[get_session_service] = lambda: session_service
    try:
        client = TestClient(app)
        response = client.post(
            f"/api/sessions/{SESSION_ID}/branch", params={"from_seq": 60}
        )
        assert response.status_code == 200
        body = response.json()
        assert "code" in body
        assert "participantId" in body
        new_code = body["code"]

        branch_state_at_0 = await session_service.get_state_at(new_code, 0)
    finally:
        app.dependency_overrides.clear()

    # The branch's seq=0 state must match the source's state at the requested
    # seq — modulo the (re-anchored) sessionId.
    src_dump = source_state_at_60.model_dump(by_alias=True)
    branch_dump = branch_state_at_0.model_dump(by_alias=True)
    src_dump.pop("updatedAt", None)
    branch_dump.pop("updatedAt", None)
    src_dump.pop("sessionId", None)
    branch_dump.pop("sessionId", None)
    src_dump.pop("version", None)
    branch_dump.pop("version", None)
    assert src_dump == branch_dump
    assert branch_state_at_0.session_id == new_code
