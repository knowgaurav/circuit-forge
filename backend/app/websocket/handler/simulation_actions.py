"""Live-simulation message handlers.

Why this module exists separately
---------------------------------
When someone starts a simulation we keep a live :class:`SimulationEngine`
for that session in ``self._simulations`` (keyed by session code). These
handlers drive that engine — start, stop, toggle a switch, tick a clock,
single-step — and broadcast the resulting pin/wire signal maps so every
client lights up the same way.

Every handler here requires edit permission. We check ``participant.can_edit``
up front and raise :class:`AuthorizationException` if the caller may not
drive the simulation.

Toggle example
--------------
1. A user with edit rights flips a switch: ``simulation:toggle`` with the
   switch's component id.
2. ``_handle_simulation_toggle`` looks up the live engine for the session
   (no-op if none is running), calls ``engine.toggle_switch(id)`` then
   ``engine.run()`` to re-propagate signals.
3. We broadcast ``simulation:state:updated`` with the fresh ``wireStates``
   and ``pinStates`` so all canvases re-colour their wires and LEDs.
"""

from typing import Any

from app.exceptions.base import AuthorizationException
from app.services.simulation_engine import SimulationEngine
from app.websocket.broadcaster import room_manager


class SimulationActionsMixin:
    """Handlers for ``simulation:*`` messages.

    Relies on the host class providing ``self._session_service``,
    ``self._circuit_service``, and the ``self._simulations`` engine map.
    """

    async def _handle_simulation_start(
        self, session_code: str, participant_id: str
    ) -> None:
        """Start simulation with current circuit state."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "start simulation",
                "Edit permission required to start simulation.",
            )

        # Load circuit and create simulation engine
        circuit = await self._circuit_service.get_circuit_state(session_code)
        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()  # Run initial simulation
        self._simulations[session_code] = engine

        # Broadcast simulation started with initial state
        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:started",
                "payload": {
                    "startedBy": participant_id,
                    "wireStates": engine.get_wire_states(),
                    "pinStates": engine.get_pin_states(),
                },
            },
        )

    async def _handle_simulation_stop(
        self, session_code: str, participant_id: str
    ) -> None:
        """Stop simulation and cleanup."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "stop simulation",
                "Edit permission required to stop simulation.",
            )

        # Remove simulation engine
        self._simulations.pop(session_code, None)

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:stopped",
                "payload": {"stoppedBy": participant_id},
            },
        )

    async def _handle_simulation_toggle(
        self, session_code: str, participant_id: str, payload: dict[str, Any]
    ) -> None:
        """Toggle a switch component in simulation."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "toggle switch",
                "Edit permission required to toggle switch.",
            )

        engine = self._simulations.get(session_code)
        if not engine:
            return

        component_id = payload["componentId"]
        engine.toggle_switch(component_id)
        engine.run()

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:state:updated",
                "payload": {
                    "wireStates": engine.get_wire_states(),
                    "pinStates": engine.get_pin_states(),
                },
            },
        )

    async def _handle_simulation_clock_tick(
        self, session_code: str, participant_id: str, payload: dict[str, Any]
    ) -> None:
        """Tick a clock component in simulation."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "tick clock",
                "Edit permission required to tick clock.",
            )

        engine = self._simulations.get(session_code)
        if not engine:
            return

        component_id = payload["componentId"]
        engine.tick_clock(component_id)
        engine.run()

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:state:updated",
                "payload": {
                    "wireStates": engine.get_wire_states(),
                    "pinStates": engine.get_pin_states(),
                },
            },
        )

    async def _handle_simulation_step(
        self, session_code: str, participant_id: str
    ) -> None:
        """Run one simulation step."""
        participant = await self._session_service.get_participant(
            session_code, participant_id
        )
        if participant is None or not participant.can_edit:
            raise AuthorizationException(
                "step simulation",
                "Edit permission required to step simulation.",
            )

        engine = self._simulations.get(session_code)
        if not engine:
            return

        engine.run()

        await room_manager.broadcast_to_room(
            session_code,
            {
                "type": "simulation:state:updated",
                "payload": {
                    "wireStates": engine.get_wire_states(),
                    "pinStates": engine.get_pin_states(),
                },
            },
        )
