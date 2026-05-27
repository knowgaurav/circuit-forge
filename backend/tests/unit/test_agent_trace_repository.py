"""Unit tests for AgentTraceRepository (Story B — B.12).

Uses an in-memory Mongo fake mirroring the one in
``tests/integration/test_replay.py``.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import pytest

from app.repositories.agent_trace_repository import AgentTraceRepository


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]) -> None:
        self._docs = list(docs)

    def sort(self, field: str, direction: int = 1) -> "_FakeCursor":
        self._docs.sort(key=lambda d: d.get(field, 0), reverse=direction < 0)
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
        self.indexes: list[tuple[Any, str | None]] = []

    async def create_index(
        self, keys: Any, unique: bool = False, name: str | None = None
    ) -> str:
        self.indexes.append((keys, name))
        return name or "idx"

    async def insert_one(self, doc: dict[str, Any]) -> None:
        self._docs.append(dict(doc))

    def find(self, query: dict[str, Any]) -> _FakeCursor:
        matches = [
            dict(d)
            for d in self._docs
            if all(d.get(k) == v for k, v in query.items())
        ]
        return _FakeCursor(matches)


class _FakeDatabase:
    def __init__(self) -> None:
        self._collections: dict[str, _FakeCollection] = {}

    def __getitem__(self, name: str) -> _FakeCollection:
        if name not in self._collections:
            self._collections[name] = _FakeCollection()
        return self._collections[name]


@pytest.fixture
def repo() -> AgentTraceRepository:
    return AgentTraceRepository(_FakeDatabase())


@pytest.mark.asyncio
async def test_round_trip_append_and_read(repo: AgentTraceRepository) -> None:
    trace = [
        {"kind": "thought", "text": "let me check the circuit"},
        {"kind": "tool_call", "tool": "get_circuit_state", "args": {"session_id": "S1"}},
        {
            "kind": "tool_result",
            "tool": "get_circuit_state",
            "result": {"components": [], "wires": []},
            "is_error": False,
        },
        {"kind": "thought", "text": "the circuit is empty"},
    ]

    await repo.append_trace(
        session_id="S1",
        actor_id="A1",
        trace=trace,
        final_message="The circuit is empty.",
        aborted=False,
        abort_reason=None,
    )

    traces = await repo.get_traces("S1")
    assert len(traces) == 1
    doc = traces[0]
    assert doc["sessionId"] == "S1"
    assert doc["actorId"] == "A1"
    assert doc["finalMessage"] == "The circuit is empty."
    assert doc["aborted"] is False
    assert doc["abortReason"] is None
    assert doc["trace"] == trace
    assert isinstance(doc["turn_started_at"], datetime)


@pytest.mark.asyncio
async def test_aborted_trace_persists_abort_reason(
    repo: AgentTraceRepository,
) -> None:
    await repo.append_trace(
        session_id="S2",
        actor_id="A1",
        trace=[{"kind": "thought", "text": "looping"}],
        final_message="<aborted>",
        aborted=True,
        abort_reason="max_iterations",
    )

    traces = await repo.get_traces("S2")
    assert traces[0]["aborted"] is True
    assert traces[0]["abortReason"] == "max_iterations"
    assert traces[0]["finalMessage"] == "<aborted>"


@pytest.mark.asyncio
async def test_traces_ordered_by_turn_started_at(
    repo: AgentTraceRepository,
) -> None:
    base = datetime.utcnow()
    # Manually seed timestamps to ensure deterministic ordering.
    repo._traces._docs.append(  # type: ignore[attr-defined]
        {
            "sessionId": "S3",
            "actorId": "A1",
            "turn_started_at": base + timedelta(seconds=2),
            "trace": [{"kind": "thought", "text": "second"}],
            "finalMessage": "second",
            "aborted": False,
            "abortReason": None,
        }
    )
    repo._traces._docs.append(  # type: ignore[attr-defined]
        {
            "sessionId": "S3",
            "actorId": "A1",
            "turn_started_at": base,
            "trace": [{"kind": "thought", "text": "first"}],
            "finalMessage": "first",
            "aborted": False,
            "abortReason": None,
        }
    )

    traces = await repo.get_traces("S3")
    assert [t["finalMessage"] for t in traces] == ["first", "second"]


@pytest.mark.asyncio
async def test_traces_isolated_per_session(repo: AgentTraceRepository) -> None:
    await repo.append_trace(
        session_id="A",
        actor_id="x",
        trace=[],
        final_message="hi from A",
        aborted=False,
        abort_reason=None,
    )
    await repo.append_trace(
        session_id="B",
        actor_id="x",
        trace=[],
        final_message="hi from B",
        aborted=False,
        abort_reason=None,
    )
    a_traces = await repo.get_traces("A")
    b_traces = await repo.get_traces("B")
    assert len(a_traces) == 1
    assert len(b_traces) == 1
    assert a_traces[0]["finalMessage"] == "hi from A"
    assert b_traces[0]["finalMessage"] == "hi from B"


@pytest.mark.asyncio
async def test_index_created_on_first_use(repo: AgentTraceRepository) -> None:
    await repo.append_trace(
        session_id="S",
        actor_id="x",
        trace=[],
        final_message="",
        aborted=False,
        abort_reason=None,
    )
    coll = repo._traces  # type: ignore[attr-defined]
    assert any(
        name == "agent_traces_sessionId_turn_started_at"
        for _keys, name in coll.indexes
    )
