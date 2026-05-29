"""Time-travel surface: reconstruct past state and branch sessions (Story C).

Why this module exists separately
---------------------------------
This is the only genuinely algorithmic part of the session service. It lets
a client ask "what did the circuit look like at seq N?" and "make me a new
session that starts from that point". The trick that keeps it fast is
snapshots: instead of replaying every event from the beginning, we start
from the nearest snapshot at-or-before the target seq and replay only the
short tail after it.

get_state_at dry run
--------------------
A session has 100 events. Snapshots were taken at seq=0, 50, 100. A client
asks for ``get_state_at(seq=75)``:

1. ``get_snapshot_at_or_before_seq(75)`` returns the snapshot at seq=50.
2. We load that snapshot's ``CircuitState`` and set ``start_seq = 50``.
3. We fetch events in range (50, 75] — that's 25 events.
4. We fold each event onto the state via ``_apply_event_to_state``.
5. The result is the exact state after event 75, reached by touching one
   snapshot read + 25 events instead of 75.

Branching reuses ``get_state_at``: it replays to the requested seq, then
saves that state as the seq=0 snapshot of a brand-new session. No events are
copied, so the branch and its source evolve independently.
"""

from typing import Any

from app.models.circuit import CircuitState
from app.models.session import Session


class ReplayMixin:
    """State-at-seq reconstruction and session branching.

    Relies on the host class providing ``self._event_repo``,
    ``self.get_session`` (lifecycle), and ``self.create_session``
    (lifecycle).
    """

    async def get_events_slice(
        self,
        session_id: str,
        from_seq: int,
        to_seq: int | None = None,
    ) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
        """Return events with from_seq < seq <= to_seq plus the snapshot at or
        before ``from_seq``.

        When ``to_seq`` is ``None`` the slice runs to the latest known seq.
        Used by ``GET /api/sessions/{code}/events`` so a replay client can
        reconstruct any state in the requested window without replaying from
        seq 0: load the snapshot, then apply the events in order.
        """
        await self.get_session(session_id)
        upper = (
            to_seq
            if to_seq is not None
            else await self._event_repo.get_latest_seq(session_id)
        )
        snapshot = await self._event_repo.get_snapshot_at_or_before_seq(
            session_id, from_seq
        )
        events = await self._event_repo.get_events_in_range(
            session_id, from_seq, upper
        )
        return events, snapshot

    async def get_state_at(self, session_id: str, seq: int) -> CircuitState:
        """Reconstruct the circuit state as it was at ``seq``.

        O(SNAPSHOT_INTERVAL + delta): pulls the latest snapshot whose seq is
        <= ``seq`` and replays only the events from ``snapshot_seq + 1`` up to
        ``seq``. Replay logic is delegated to
        :meth:`CircuitService._apply_event` so the snapshot rebuild and the
        live ``get_circuit_state`` path stay byte-identical.
        """
        snapshot = await self._event_repo.get_snapshot_at_or_before_seq(
            session_id, seq
        )

        if snapshot:
            state = CircuitState.model_validate(snapshot["state"])
            start_seq = snapshot["seq"]
        else:
            state = CircuitState.create_empty(session_id)
            start_seq = 0

        if seq > start_seq:
            events = await self._event_repo.get_events_in_range(
                session_id, start_seq, seq
            )
            for event_data in events:
                state = self._apply_event_to_state(state, event_data)

        return state

    async def branch_session(
        self, source_session_id: str, from_seq: int
    ) -> tuple[Session, str]:
        """Create a new session pre-seeded with the source state at ``from_seq``.

        The new session starts with a single seq=0 snapshot containing the
        replayed state; no events are copied. New edits in the branch start at
        seq=1, isolated from the source's history.
        """
        state_at_seq = await self.get_state_at(source_session_id, from_seq)

        new_session, creator_id = await self.create_session()

        # Re-anchor the snapshot's session_id to the new code so a future
        # ``get_circuit_state`` on the branch reports the right session.
        state_at_seq.session_id = new_session.code
        state_at_seq.version = 0
        # ``create_session`` writes an empty seq=0 snapshot for every new
        # session. Replace it with the branched state so the new session boots
        # at the source's state-at-seq instead of an empty board.
        await self._event_repo.delete_snapshots_by_session(new_session.code)
        await self._event_repo.save_snapshot(new_session.code, 0, state_at_seq)

        return new_session, creator_id

    @staticmethod
    def _apply_event_to_state(
        state: CircuitState, event_data: dict[str, Any]
    ) -> CircuitState:
        """Apply a single stored event document to ``state``.

        Thin pass-through to :meth:`CircuitService._apply_event` so replay and
        live state reconstruction share one code path. ``CircuitService`` is
        instantiated bare (without a DB) because ``_apply_event`` is pure.
        """
        from app.services.circuit_service import CircuitService

        return CircuitService.__new__(CircuitService)._apply_event(state, event_data)
