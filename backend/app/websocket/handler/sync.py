"""Initial-sync logic: choosing between a full snapshot and a delta.

Why this module exists separately
---------------------------------
When a client connects we must bring it up to date. There are two ways:

* **sync:state** — send the entire current circuit plus the participant
  list. Simple, always correct, but heavier on the wire.
* **sync:delta** — send only the events the client is missing. Cheaper, but
  only safe when we can rebuild the client's view purely from events newer
  than what it already has.

This module owns that decision and the two senders. The protocol is
specified in ``docs/adr/0001-collaboration-consistency.md``.

Reconnect dry run
-----------------
Say a client disconnects having processed up to ``seq=12`` and the latest
snapshot was taken at ``seq=0`` (no snapshot since):

1. Client reconnects with ``last_seen_seq=12``.
2. ``snapshot_seq = 0`` which is ``<= 12``, so a delta is safe.
3. We fetch events with ``seq > 12`` (say 13, 14, 15) and send them as a
   ``sync:delta`` with ``fromSeq=12``.
4. The client applies 13→14→15 on top of its existing state.

If instead a snapshot had been taken at ``seq=14`` (newer than 12), we could
not rebuild from events alone without risking a gap, so we fall back to a
full ``sync:state``.
"""

from typing import Any

from fastapi import WebSocket


class SyncMixin:
    """Initial state / delta sync for a freshly connected client.

    Relies on the host class providing ``self._circuit_service`` and
    ``self._session_service`` (see :class:`HandlerBase`).
    """

    async def _send_initial_sync(
        self,
        websocket: WebSocket,
        session_code: str,
        last_seen_seq: int | None,
    ) -> None:
        """Pick between sync:delta and sync:state for a new connection.

        - If the client provided ``last_seen_seq`` and the latest snapshot's
          seq is ``<= last_seen_seq`` (so we can build the delta from events
          alone, without dropping anything), we send the delta of events
          with seq > ``last_seen_seq``.
        - Otherwise we send the full ``sync:state`` snapshot.
        """
        if last_seen_seq is not None:
            snapshot = await self._circuit_service._event_repo.get_latest_snapshot(
                session_code
            )
            snapshot_seq = snapshot["seq"] if snapshot else 0
            if snapshot_seq <= last_seen_seq:
                events = await self._circuit_service._event_repo.get_events_since_seq(
                    session_code, last_seen_seq
                )
                await self._send_sync_delta(websocket, last_seen_seq, events)
                return

        await self._send_sync_state(websocket, session_code)

    async def _send_sync_delta(
        self,
        websocket: WebSocket,
        from_seq: int,
        events: list[dict[str, Any]],
    ) -> None:
        """Send only events newer than ``from_seq`` to a reconnecting client."""
        await websocket.send_json(
            {
                "type": "sync:delta",
                "payload": {
                    "fromSeq": from_seq,
                    "events": [self._jsonify_event(e) for e in events],
                },
            }
        )

    @staticmethod
    def _jsonify_event(event: dict[str, Any]) -> dict[str, Any]:
        """Convert a raw event document to JSON-serializable form.

        Mongo hands back ``datetime`` objects for the timestamp; JSON can't
        serialize those directly, so we convert to an ISO-8601 string.
        """
        out = dict(event)
        ts = out.get("timestamp")
        if hasattr(ts, "isoformat"):
            out["timestamp"] = ts.isoformat()
        return out

    async def _send_sync_state(self, websocket: WebSocket, session_code: str) -> None:
        """Send current circuit state and participants."""
        circuit = await self._circuit_service.get_circuit_state(session_code)
        participants = await self._session_service.get_session_participants(
            session_code
        )

        await websocket.send_json(
            {
                "type": "sync:state",
                "payload": {
                    "circuit": circuit.model_dump(by_alias=True, mode="json"),
                    "participants": [
                        p.model_dump(by_alias=True, mode="json") for p in participants
                    ],
                },
            }
        )

    async def _send_error(self, websocket: WebSocket, code: str, message: str) -> None:
        """Send an error message to the client, swallowing send failures.

        If the socket is already gone we can't do anything useful with a
        secondary error, so the send is wrapped in a best-effort try.
        """
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "payload": {"code": code, "message": message},
                }
            )
        except Exception:
            pass
