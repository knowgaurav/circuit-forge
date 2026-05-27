"""Snapshot trigger.

Why this module exists separately
---------------------------------
After every event is appended we ask: "should we save a snapshot of the
current state to speed up future replays?" The policy is simple — write a
snapshot every ``SNAPSHOT_INTERVAL`` events — but the helper still wants a
home of its own so the rule is easy to find and easy to change.

Dry run
-------
``SNAPSHOT_INTERVAL`` is currently 50.

* event lands at ``seq=1``  -> 1 % 50 != 0  -> no snapshot.
* event lands at ``seq=49`` -> 49 % 50 != 0 -> no snapshot.
* event lands at ``seq=50`` -> 50 % 50 == 0 -> rebuild state, save snapshot.

The constant lives in :mod:`app.services.session_service` because snapshot
*storage* policy is owned by the session/snapshot layer; this file only
implements the trigger.
"""

from typing import Awaitable, Callable

from app.models.circuit import CircuitState
from app.repositories.event_repository import EventRepository
from app.services.session_service import SNAPSHOT_INTERVAL

# A callable that returns the latest state for a session. Passed in by the
# caller so this module stays free of any import cycle with the service.
RebuildState = Callable[[str], Awaitable[CircuitState]]

__all__ = ["SNAPSHOT_INTERVAL", "RebuildState", "maybe_create_snapshot"]


async def maybe_create_snapshot(
    event_repo: EventRepository,
    session_id: str,
    seq: int,
    rebuild_state: RebuildState,
) -> None:
    """Save a snapshot iff ``seq`` is a multiple of ``SNAPSHOT_INTERVAL``."""
    if seq % SNAPSHOT_INTERVAL != 0:
        return

    state = await rebuild_state(session_id)
    await event_repo.save_snapshot(session_id, seq, state)
