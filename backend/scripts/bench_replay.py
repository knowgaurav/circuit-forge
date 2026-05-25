"""Quick benchmark for the consistency ADR.

Measures how long ``CircuitService.get_circuit_state()`` takes to
reconstruct state from the event log under three conditions:

1. **Replay from zero**: 100 events, no snapshot — worst case. This is the
   baseline we improve over.
2. **Snapshot + 49-event delta**: snapshot at seq=50, replay 49 more events.
   The expected steady-state cost.
3. **Snapshot only**: snapshot at seq=100, no events to replay. Best case
   (right after a snapshot is taken).

The in-memory fake from the integration tests is used so the benchmark
times the replay logic, not Mongo round-trips. Run with:

    uv run python scripts/bench_replay.py
"""

from __future__ import annotations

import asyncio
import statistics
import time
from typing import Awaitable, Callable

from app.services.circuit_service import CircuitService
from tests.factories import ComponentFactory
from tests.integration.test_reconnect import _FakeDatabase


SESSION_ID = "BENCH1"


async def _seed_events(service: CircuitService, n: int) -> None:
    for i in range(1, n + 1):
        comp = ComponentFactory.create_and_gate(id=f"and-{i}", x=float(i), y=0)
        await service.add_component(SESSION_ID, "actor", comp)


async def _measure(
    label: str, action: Callable[[], Awaitable[None]], runs: int = 30
) -> None:
    timings: list[float] = []
    for _ in range(runs):
        t0 = time.perf_counter_ns()
        await action()
        t1 = time.perf_counter_ns()
        timings.append((t1 - t0) / 1_000_000)  # ms
    median = statistics.median(timings)
    p95 = sorted(timings)[max(0, int(len(timings) * 0.95) - 1)]
    print(f"{label}: median={median:.3f} ms  p95={p95:.3f} ms  (n={runs})")


async def main() -> None:
    # 1. Replay from zero (100 events, no snapshot)
    db = _FakeDatabase()
    service = CircuitService(db)
    await _seed_events(service, 100)
    # Wipe the snapshots collection to force replay-from-zero
    await db["snapshots"].delete_many({"sessionId": SESSION_ID})

    await _measure(
        "1. 100 events, no snapshot (full replay from zero)",
        lambda: service.get_circuit_state(SESSION_ID),
    )

    # 2. Snapshot at seq=50, 49 more events (steady state)
    db = _FakeDatabase()
    service = CircuitService(db)
    await _seed_events(service, 99)
    # After 99 events, the latest snapshot is the one created at seq=50,
    # so get_circuit_state replays 49 events.

    await _measure(
        "2. snapshot at seq=50, 49 events to replay (steady state)",
        lambda: service.get_circuit_state(SESSION_ID),
    )

    # 3. Snapshot at seq=100, 0 events (best case)
    db = _FakeDatabase()
    service = CircuitService(db)
    await _seed_events(service, 100)
    # After 100 events, snapshot is at seq=100, replay 0 events

    await _measure(
        "3. snapshot at seq=100, 0 events to replay (best case)",
        lambda: service.get_circuit_state(SESSION_ID),
    )


if __name__ == "__main__":
    asyncio.run(main())
