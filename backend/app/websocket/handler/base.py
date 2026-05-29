"""Shared state and service wiring for the WebSocket handler.

Why this module exists separately
---------------------------------
The handler is split across several mixins (connection, sync, dispatch, and
the per-feature action groups). Every mixin needs the same three services
and the same in-memory simulation map, so that shared setup lives here in
one small base class. The concrete :class:`WebSocketHandler` inherits from
this base plus every mixin.

The services are created lazily (``_get_services``) the first time a
connection is handled, not at import time, because the database connection
isn't available yet when the module is imported at app startup.
"""

from app.core.database import db_manager
from app.services.circuit_service import CircuitService
from app.services.permission_service import PermissionService
from app.services.session_service import SessionService
from app.services.simulation_engine import SimulationEngine


class HandlerBase:
    """Holds the services and per-session simulation engines.

    Attributes
    ----------
    _simulations:
        Maps a session code to its live :class:`SimulationEngine`. An entry
        exists only while a simulation is running for that session; it is
        created on ``simulation:start`` and dropped on ``simulation:stop``.
    """

    def __init__(self) -> None:
        self._session_service: SessionService | None = None
        self._permission_service: PermissionService | None = None
        self._circuit_service: CircuitService | None = None
        self._simulations: dict[str, SimulationEngine] = {}  # session_code -> engine

    def _get_services(self) -> None:
        """Initialize services with the database connection (once).

        Called at the top of every connection. After the first call the
        services are cached, so repeated calls are cheap no-ops.
        """
        if self._session_service is None:
            db = db_manager.get_database()
            self._session_service = SessionService(db)
            self._permission_service = PermissionService(db)
            self._circuit_service = CircuitService(db)
