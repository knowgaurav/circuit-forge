"""Property tests for time-travel replay (Story C — C.9).

Property: for any valid event log of length 1..200 across 6 sessions and any
``0 < N < M <= len(log)``,

    apply(get_state_at(N), events[N+1..M])  ==  get_state_at(M)

This is the round-trip law for the snapshot-accelerated replay: walking from
seq=N forward by applying the recorded delta must reach the same state the
service reports for seq=M directly. If snapshots ever drifted from the live
event log, this property would catch it.

Each example builds a real ``SessionService`` over an in-memory MongoDB fake
and seeds the session with the strategy-generated event log via
``CircuitService``. Snapshots fire at the natural ``SNAPSHOT_INTERVAL`` (50)
inside the service, exactly as in production.
"""

from __future__ import annotations

import asyncio
from typing import Any

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st
from pymongo.errors import DuplicateKeyError

from app.models.circuit import CircuitState, Position
from app.services.circuit_service import CircuitService
from app.services.session_service import SessionService
from tests.factories import ComponentFactory


# ---------------------------------------------------------------------------
# In-memory MongoDB fake (mirrors the integration-test fake)
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

    async def update_one(self, query: dict[str, Any], update: dict[str, Any]) -> Any:
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
# Strategy: generate a valid event-log plan
# ---------------------------------------------------------------------------


@st.composite
def _event_plan(draw) -> list[dict[str, Any]]:
    """Generate a list of action descriptors for a single session.

    Only ``ADD`` / ``MOVE`` / ``DELETE`` over components are emitted — the
    same scope ``test_determinism.py`` uses, which keeps the strategy free of
    wire-validation back-and-forth.
    """
    n = draw(st.integers(min_value=1, max_value=200))
    plan: list[dict[str, Any]] = []
    alive: list[str] = []

    for i in range(n):
        if not alive:
            kind = "ADD"
        else:
            kind = draw(st.sampled_from(["ADD", "ADD", "MOVE", "DELETE"]))

        if kind == "ADD":
            comp_id = f"c-{i}"
            x = draw(st.integers(min_value=0, max_value=1000))
            y = draw(st.integers(min_value=0, max_value=1000))
            alive.append(comp_id)
            plan.append({"kind": "ADD", "id": comp_id, "x": x, "y": y})
        elif kind == "MOVE":
            comp_id = draw(st.sampled_from(alive))
            x = draw(st.integers(min_value=0, max_value=1000))
            y = draw(st.integers(min_value=0, max_value=1000))
            plan.append({"kind": "MOVE", "id": comp_id, "x": x, "y": y})
        else:
            comp_id = draw(st.sampled_from(alive))
            alive.remove(comp_id)
            plan.append({"kind": "DELETE", "id": comp_id})

    return plan


@st.composite
def _session_plans(draw) -> list[list[dict[str, Any]]]:
    """Six independent event plans, one per session."""
    return [draw(_event_plan()) for _ in range(6)]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _apply_plan(
    circuit_service: CircuitService,
    session_id: str,
    plan: list[dict[str, Any]],
) -> int:
    """Apply a plan via the real service. Returns the latest seq."""
    for action in plan:
        if action["kind"] == "ADD":
            comp = ComponentFactory.create_and_gate(
                id=action["id"], x=float(action["x"]), y=float(action["y"])
            )
            await circuit_service.add_component(session_id, "actor", comp)
        elif action["kind"] == "MOVE":
            await circuit_service.move_component(
                session_id,
                "actor",
                action["id"],
                Position(x=float(action["x"]), y=float(action["y"])),
            )
        else:
            await circuit_service.delete_component(
                session_id, "actor", action["id"]
            )
    return await circuit_service._event_repo.get_latest_seq(session_id)


def _state_signature(state: CircuitState) -> dict[str, Any]:
    """Compare structural state, not wallclock or per-replay version field."""
    dump = state.model_dump(by_alias=True)
    dump.pop("updatedAt", None)
    dump.pop("version", None)
    return dump


# ---------------------------------------------------------------------------
# Property
# ---------------------------------------------------------------------------


@given(plans=_session_plans())
@settings(
    max_examples=200,
    deadline=None,
    suppress_health_check=[HealthCheck.too_slow, HealthCheck.data_too_large],
)
def test_get_state_at_n_then_apply_delta_equals_get_state_at_m(
    plans: list[list[dict[str, Any]]],
) -> None:
    """``get_state_at(N) + events[N+1..M] == get_state_at(M)`` for random logs."""

    async def _run() -> None:
        db = _FakeDatabase()
        session_service = SessionService(db)
        circuit_service = CircuitService(db)

        for i, plan in enumerate(plans):
            session_id = f"S{i:05d}"
            # Pre-seed the empty seq=0 snapshot the way create_session does,
            # so get_state_at always finds a starting point.
            await session_service._event_repo.save_snapshot(
                session_id, 0, CircuitState.create_empty(session_id)
            )

            latest = await _apply_plan(circuit_service, session_id, plan)
            if latest < 2:
                continue

            # Pick N and M deterministically from the log length.
            n = max(1, latest // 3)
            m = latest

            state_at_n = await session_service.get_state_at(session_id, n)
            state_at_m = await session_service.get_state_at(session_id, m)

            # Apply events (N, M] to state_at_n.
            delta = await session_service._event_repo.get_events_in_range(
                session_id, n, m
            )
            for event in delta:
                state_at_n = SessionService._apply_event_to_state(state_at_n, event)

            assert _state_signature(state_at_n) == _state_signature(state_at_m)

    asyncio.run(_run())
