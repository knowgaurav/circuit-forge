"""Per-session, per-actor undo/redo stacks.

Why this module exists separately
---------------------------------
Each session keeps an in-memory undo stack and redo stack for every
participant. The bookkeeping (push, pop, clear, cap at 50) is mechanical
and unrelated to either event sourcing or the database, so it lives in a
small helper class. ``CircuitService`` owns one ``UndoRedoStacks`` instance
and delegates to it.

Stack shape::

    self._stacks[session_id][actor_id] = [event, event, ...]

Cap
---
The undo stack is capped at 50 entries per (session, actor). Once it grows
past 50, the oldest event is dropped. The redo stack has no explicit cap
because it is cleared on every new action.
"""

from collections import defaultdict

from app.events.schema import CircuitEvent

# How many undo entries we keep per (session, actor) before we drop the oldest.
UNDO_STACK_LIMIT = 50


class UndoRedoStacks:
    """Holds undo and redo stacks keyed by ``(session_id, actor_id)``."""

    def __init__(self) -> None:
        self._undo: dict[str, dict[str, list[CircuitEvent]]] = defaultdict(
            lambda: defaultdict(list)
        )
        self._redo: dict[str, dict[str, list[CircuitEvent]]] = defaultdict(
            lambda: defaultdict(list)
        )

    def push_undo(self, session_id: str, actor_id: str, event: CircuitEvent) -> None:
        """Record a fresh action so the actor can undo it later.

        If the stack is already at the cap, drop the oldest entry. This keeps
        memory bounded for long-lived sessions.
        """
        stack = self._undo[session_id][actor_id]
        stack.append(event)
        if len(stack) > UNDO_STACK_LIMIT:
            stack.pop(0)

    def pop_undo(self, session_id: str, actor_id: str) -> CircuitEvent | None:
        """Pop the most recent undoable event, or ``None`` if there is none."""
        stack = self._undo[session_id][actor_id]
        if not stack:
            return None
        return stack.pop()

    def push_redo(self, session_id: str, actor_id: str, event: CircuitEvent) -> None:
        """Record an undone event so the actor can redo it."""
        self._redo[session_id][actor_id].append(event)

    def pop_redo(self, session_id: str, actor_id: str) -> CircuitEvent | None:
        """Pop the most recent redoable event, or ``None`` if there is none."""
        stack = self._redo[session_id][actor_id]
        if not stack:
            return None
        return stack.pop()

    def clear_redo(self, session_id: str, actor_id: str) -> None:
        """Wipe the redo stack — called whenever the actor performs a new action.

        Once a fresh action lands, any future the actor had previously
        un-done is no longer reachable, so we drop it.
        """
        self._redo[session_id][actor_id].clear()

    def cleanup_session(self, session_id: str) -> None:
        """Drop all stacks for a session (used when the session ends)."""
        self._undo.pop(session_id, None)
        self._redo.pop(session_id, None)
