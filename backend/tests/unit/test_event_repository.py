"""Unit tests for EventRepository.

Covers A.3: monotonic seq enforcement at the write path.

These tests use a tiny in-memory fake of the Mongo collections used by
``EventRepository`` so we don't depend on a live MongoDB instance.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import pytest
from pymongo.errors import DuplicateKeyError

from app.events.schema import (
    ComponentAddedEvent,
    ComponentAddedPayload,
)
from app.repositories.event_repository import (
    EventDuplicateError,
    EventOrderError,
    EventRepository,
)
from tests.factories import ComponentFactory


class _FakeCursor:
    def __init__(self, docs: list[dict[str, Any]]) -> None:
        self._docs = list(docs)

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
        except StopIteration as exc:  # pragma: no cover
            raise StopAsyncIteration from exc


class _FakeCollection:
    """In-memory stand-in for an AsyncIOMotorCollection used by tests."""

    def __init__(self, sort_key: str = "seq") -> None:
        self._docs: list[dict[str, Any]] = []
        self._unique_keys: list[tuple[str, ...]] = []
        self._sort_key = sort_key

    async def create_index(
        self, keys, unique: bool = False, name: str | None = None
    ) -> str:
        if unique:
            field_names = tuple(k[0] if isinstance(k, tuple) else k for k in keys)
            self._unique_keys.append(field_names)
        return name or "idx"

    async def insert_one(self, doc: dict[str, Any]) -> None:
        for key_tuple in self._unique_keys:
            value = tuple(doc.get(field) for field in key_tuple)
            for existing in self._docs:
                existing_value = tuple(existing.get(field) for field in key_tuple)
                if existing_value == value:
                    raise DuplicateKeyError(f"duplicate key on {key_tuple}: {value}")
        self._docs.append(doc)

    def find(self, query: dict[str, Any]) -> _FakeCursor:
        def _matches(doc: dict[str, Any]) -> bool:
            for key, expected in query.items():
                actual = doc.get(key)
                if isinstance(expected, dict):
                    for op, op_val in expected.items():
                        if op == "$gt" and not (actual is not None and actual > op_val):
                            return False
                        if op == "$gte" and not (
                            actual is not None and actual >= op_val
                        ):
                            return False
                        if op == "$lt" and not (actual is not None and actual < op_val):
                            return False
                        if op == "$lte" and not (
                            actual is not None and actual <= op_val
                        ):
                            return False
                else:
                    if actual != expected:
                        return False
            return True

        matches = [dict(d) for d in self._docs if _matches(d)]
        return _FakeCursor(matches)

    async def delete_many(self, query: dict[str, Any]) -> Any:
        before = len(self._docs)
        self._docs = [
            d for d in self._docs if any(d.get(k) != v for k, v in query.items())
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
            self._collections[name] = _FakeCollection(sort_key="seq")
        return self._collections[name]


@pytest.fixture
def repo() -> EventRepository:
    return EventRepository(_FakeDatabase())


def _make_event(seq: int, session_id: str = "S1") -> ComponentAddedEvent:
    component = ComponentFactory.create_and_gate(id=f"and-{seq}")
    return ComponentAddedEvent(
        sessionId=session_id,
        seq=seq,
        actorId="actor-1",
        timestamp=datetime.utcnow(),
        payload=ComponentAddedPayload(component=component),
    )


class TestSeqEnforcement:
    """A.3: append rejects out-of-order or duplicate seq."""

    @pytest.mark.asyncio
    async def test_two_events_with_same_seq_raises_duplicate(
        self, repo: EventRepository
    ) -> None:
        await repo.append_event(_make_event(seq=1))

        with pytest.raises(EventDuplicateError):
            await repo.append_event(_make_event(seq=1))

    @pytest.mark.asyncio
    async def test_seq_less_than_latest_raises_order_error(
        self, repo: EventRepository
    ) -> None:
        await repo.append_event(_make_event(seq=1))
        await repo.append_event(_make_event(seq=2))

        with pytest.raises(EventOrderError):
            await repo.append_event(_make_event(seq=1))

    @pytest.mark.asyncio
    async def test_monotonic_seq_accepted(self, repo: EventRepository) -> None:
        for seq in range(1, 6):
            await repo.append_event(_make_event(seq=seq))

        latest = await repo.get_latest_seq("S1")
        assert latest == 5

    @pytest.mark.asyncio
    async def test_seq_isolated_per_session(self, repo: EventRepository) -> None:
        await repo.append_event(_make_event(seq=1, session_id="A"))
        await repo.append_event(_make_event(seq=1, session_id="B"))

        assert await repo.get_latest_seq("A") == 1
        assert await repo.get_latest_seq("B") == 1
