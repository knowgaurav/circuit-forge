"""Per-session ReAct agent trace persistence (Story B — B.12).

Persisted document shape::

    {
      "sessionId":      str,
      "actorId":        str,
      "turn_started_at": datetime,
      "trace":          list[TraceEntry],
      "finalMessage":   str,
      "aborted":        bool,
      "abortReason":    str | None,
    }

A ``TraceEntry`` is one of the discriminated entries the orchestrator emits::

    {"kind": "thought",     "text": str}
    {"kind": "tool_call",   "tool": str, "args": dict}
    {"kind": "tool_result", "tool": str, "result": dict, "is_error": bool}

We index ``(sessionId, turn_started_at)`` so replay/debug reads are sorted by
turn order without a full scan.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


class AgentTraceRepository:
    """Mongo-backed agent trace store."""

    COLLECTION = "agent_traces"

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._database = database
        self._traces = database[self.COLLECTION]
        self._index_ready = False

    async def _ensure_indexes(self) -> None:
        if self._index_ready:
            return
        await self._traces.create_index(
            [("sessionId", 1), ("turn_started_at", 1)],
            name="agent_traces_sessionId_turn_started_at",
        )
        self._index_ready = True

    async def append_trace(
        self,
        *,
        session_id: str,
        actor_id: str,
        trace: list[dict[str, Any]],
        final_message: str,
        aborted: bool,
        abort_reason: str | None,
    ) -> None:
        """Persist one completed turn to the trace store."""
        await self._ensure_indexes()
        doc = {
            "sessionId": session_id,
            "actorId": actor_id,
            "turn_started_at": datetime.utcnow(),
            "trace": list(trace),
            "finalMessage": final_message,
            "aborted": aborted,
            "abortReason": abort_reason,
        }
        await self._traces.insert_one(doc)

    async def get_traces(self, session_id: str) -> list[dict[str, Any]]:
        """Return all traces for a session, ordered by ``turn_started_at`` ascending."""
        cursor = self._traces.find({"sessionId": session_id}).sort(
            "turn_started_at", 1
        )
        out: list[dict[str, Any]] = []
        async for doc in cursor:
            doc.pop("_id", None)
            out.append(doc)
        return out
