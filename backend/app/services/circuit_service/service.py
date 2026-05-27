"""The ``CircuitService`` class — public entry point for circuit edits.

Why this module exists separately
---------------------------------
This file contains the orchestration layer: ``get_circuit_state``,
``undo`` / ``redo`` / ``cleanup_session``, and the small set of internal
helpers shared across mutation methods. The mutation methods themselves
(``add_component``, ``move_component``, ``add_wire``, ...) live in
:mod:`.operations` and are mixed in via :class:`OperationsMixin` to keep
this file readable.

Sub-modules wired together here
-------------------------------
* :mod:`.event_apply` — pure event-to-state projection.
* :mod:`.operations`  — public mutation methods (mixin).
* :mod:`.undo_redo`   — per-actor undo/redo stacks.
* :mod:`.snapshots`   — snapshot trigger.
* :mod:`.inverse`     — building inverse / re-sequenced events.
"""

from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.events.schema import CircuitEvent
from app.models.circuit import CircuitState
from app.repositories.event_repository import EventRepository

from .event_apply import apply_event
from .inverse import create_inverse_event, recreate_event_with_seq
from .operations import OperationsMixin
from .snapshots import maybe_create_snapshot
from .undo_redo import UndoRedoStacks


class CircuitService(OperationsMixin):
    """Service for circuit operations with event sourcing.

    Method parameters use ``session_id`` (the 6-char session code) and
    ``actor_id`` (the participant id of the caller) to match the event
    schema in :mod:`app.events.schema`.

    Public mutation methods (``add_component``, ``move_component``,
    ``add_wire``, ``delete_wire``, ``add_annotation``,
    ``delete_annotation``, ``delete_component``) are inherited from
    :class:`OperationsMixin`.
    """

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._event_repo = EventRepository(database)
        self._stacks = UndoRedoStacks()

    # ------------------------------------------------------------------
    # State reconstruction
    # ------------------------------------------------------------------

    async def get_circuit_state(self, session_id: str) -> CircuitState:
        """Reconstruct circuit state from events.

        Uses the latest snapshot when one is available, then replays events
        whose seq is greater than the snapshot's seq.
        """
        snapshot = await self._event_repo.get_latest_snapshot(session_id)

        if snapshot:
            state = CircuitState.model_validate(snapshot["state"])
            start_seq = snapshot["seq"]
        else:
            state = CircuitState.create_empty(session_id)
            start_seq = 0

        events = await self._event_repo.get_events_since_seq(session_id, start_seq)

        for event_data in events:
            state = self._apply_event(state, event_data)

        return state

    # ------------------------------------------------------------------
    # Undo / redo
    # ------------------------------------------------------------------

    async def undo(
        self,
        session_id: str,
        actor_id: str,
    ) -> tuple[CircuitEvent, CircuitState] | None:
        """Undo the last action by this actor."""
        last_event = self._stacks.pop_undo(session_id, actor_id)
        if last_event is None:
            return None

        seq = await self._get_next_seq(session_id)
        inverse_event = await create_inverse_event(
            self._event_repo, session_id, actor_id, last_event, seq
        )
        if inverse_event is None:
            return None

        await self._event_repo.append_event(inverse_event)
        # The undone action goes onto the redo stack so a later redo() can
        # re-emit it. We do *not* push the inverse onto the undo stack —
        # undoing-an-undo is a redo.
        self._stacks.push_redo(session_id, actor_id, last_event)
        state = await self.get_circuit_state(session_id)
        return inverse_event, state

    async def redo(
        self,
        session_id: str,
        actor_id: str,
    ) -> tuple[CircuitEvent, CircuitState] | None:
        """Redo the last undone action by this actor."""
        event_to_redo = self._stacks.pop_redo(session_id, actor_id)
        if event_to_redo is None:
            return None

        seq = await self._get_next_seq(session_id)
        new_event = recreate_event_with_seq(event_to_redo, seq)

        await self._event_repo.append_event(new_event)
        self._stacks.push_undo(session_id, actor_id, new_event)

        state = await self.get_circuit_state(session_id)
        return new_event, state

    def cleanup_session(self, session_id: str) -> None:
        """Clean up in-memory undo/redo stacks for a session."""
        self._stacks.cleanup_session(session_id)

    # ------------------------------------------------------------------
    # Internal helpers (kept as methods so external code that pokes at
    # ``CircuitService._apply_event`` keeps working unchanged)
    # ------------------------------------------------------------------

    @staticmethod
    def _apply_event(
        state: CircuitState, event_data: dict[str, Any]
    ) -> CircuitState:
        """Apply a single event to the circuit state.

        Thin pass-through to :func:`event_apply.apply_event`. Kept on the
        class so existing callers — ``SessionService._apply_event_to_state``
        and the property tests — can reach it as
        ``CircuitService._apply_event``.
        """
        return apply_event(state, event_data)

    async def _get_next_seq(self, session_id: str) -> int:
        """Get the next event seq number for a session."""
        current = await self._event_repo.get_latest_seq(session_id)
        return current + 1

    async def _maybe_create_snapshot(self, session_id: str, seq: int) -> None:
        """Save a snapshot if ``seq`` is a snapshot boundary."""
        await maybe_create_snapshot(
            self._event_repo, session_id, seq, self.get_circuit_state
        )

    async def _record_action(
        self,
        session_id: str,
        actor_id: str,
        event: CircuitEvent,
    ) -> CircuitState:
        """Common bookkeeping for a single mutation event.

        Appends the event, pushes it onto the undo stack, clears the redo
        stack (a fresh action invalidates any future the actor had un-done),
        maybe takes a snapshot, then returns the freshly-rebuilt state.
        """
        await self._event_repo.append_event(event)
        self._stacks.push_undo(session_id, actor_id, event)
        self._stacks.clear_redo(session_id, actor_id)
        await self._maybe_create_snapshot(session_id, event.seq)
        return await self.get_circuit_state(session_id)
