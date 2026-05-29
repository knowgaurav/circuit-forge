"""WebSocket handler package.

This package replaces the former single-file ``handler.py``. The handler is
assembled from focused mixins so each concern lives in its own small file,
but the public surface is unchanged: callers still write
``from app.websocket.handler import WebSocketHandler, ws_handler``.

Sub-modules
-----------
* :mod:`.base`                — shared services + simulation-engine map.
* :mod:`.connection`          — connect → receive-loop → disconnect lifecycle.
* :mod:`.sync`                — initial ``sync:state`` / ``sync:delta`` logic.
* :mod:`.dispatch`            — routes inbound messages by type.
* :mod:`.circuit_actions`     — ``circuit:*`` handlers.
* :mod:`.presence_actions`    — ``presence:*`` and ``permission:*`` handlers.
* :mod:`.simulation_actions`  — ``simulation:*`` handlers.

The concrete :class:`WebSocketHandler` inherits from every mixin. Method
resolution order is irrelevant here because the mixins define disjoint sets
of methods — there is no overriding between them.
"""

from .base import HandlerBase
from .circuit_actions import CircuitActionsMixin
from .connection import ConnectionMixin
from .dispatch import DispatchMixin
from .presence_actions import PresenceActionsMixin
from .simulation_actions import SimulationActionsMixin
from .sync import SyncMixin


class WebSocketHandler(
    ConnectionMixin,
    SyncMixin,
    DispatchMixin,
    CircuitActionsMixin,
    PresenceActionsMixin,
    SimulationActionsMixin,
    HandlerBase,
):
    """Handles WebSocket connections and message routing.

    The behavior is identical to the original single-class handler; it is
    just composed from mixins. ``HandlerBase`` is listed last so its
    ``__init__`` is the one that runs (the mixins define no ``__init__``).
    """


# Global handler instance
ws_handler = WebSocketHandler()


__all__ = ["WebSocketHandler", "ws_handler"]
