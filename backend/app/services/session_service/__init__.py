"""Session management service package.

Replaces the former single-file ``session_service.py``. The public surface
is unchanged: callers still write
``from app.services.session_service import SessionService, SNAPSHOT_INTERVAL,
CURSOR_COLORS``.

Sub-modules
-----------
* :mod:`.constants`     — ``SNAPSHOT_INTERVAL`` and ``CURSOR_COLORS``.
* :mod:`.lifecycle`     — create / fetch / expire sessions.
* :mod:`.participants`  — join, presence, roles, color assignment.
* :mod:`.replay`        — state-at-seq reconstruction and branching.
* :mod:`.service`       — the ``SessionService`` class that ties them together.
"""

from .constants import CURSOR_COLORS, SNAPSHOT_INTERVAL
from .service import SessionService

__all__ = ["SessionService", "SNAPSHOT_INTERVAL", "CURSOR_COLORS"]
