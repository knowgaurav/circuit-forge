"""Circuit operations service with event sourcing.

This package replaces the former single-file ``circuit_service.py``. It is
split across focused sub-modules so each piece is small enough to read in
one sitting, but the public surface stays the same: external code still
writes ``from app.services.circuit_service import CircuitService``.

Sub-modules
-----------
* :mod:`.service`     — the ``CircuitService`` class (orchestration).
* :mod:`.operations`  — public mutation methods, mixed into the service.
* :mod:`.event_apply` — pure projection of one event onto a state.
* :mod:`.validation`  — wire validation rules.
* :mod:`.undo_redo`   — per-session undo and redo stacks.
* :mod:`.snapshots`   — snapshot trigger.
* :mod:`.inverse`     — inverse and re-sequenced events for undo / redo.
"""

from .service import CircuitService

__all__ = ["CircuitService"]
