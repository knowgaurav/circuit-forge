"""Ephemeral course session — the state bridge for the in-course tutor.

The course playground keeps its circuit in a browser-local store with no
server session. To let the agent harness (which mutates through
``CircuitService`` + an event log) operate on that board, each tutor turn:

1. **Seeds** a throwaway, server-generated ``tutor-<uuid>`` session from the
   client's circuit snapshot (``seed_session``). Components and wires are
   replayed verbatim, so their ids and pins match what the client already
   holds — and the client label rides along in ``properties["label"]``.
2. Runs the ReAct loop; tools append events to that session.
3. **Collects** the events emitted this turn and maps the client-applicable
   ones to :class:`CircuitMutation` objects (``collect_mutations``) that the
   browser replays into its local store.
4. **Discards** the session — deletes its events and snapshots and clears the
   in-memory undo/redo stacks (``discard_session``) — so nothing leaks.

The session id is generated here, never supplied by the client, so a request
can never point the agent at another session's event log.
"""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from pydantic import BaseModel

from app.models.circuit import CircuitState
from app.repositories.event_repository import EventRepository
from app.services.agent.tools import TOOLS, ToolDeps, ToolFn
from app.services.circuit_service import CircuitService

TUTOR_ACTOR_ID = "tutor-agent"

# Event types the browser store knows how to apply. Annotation events are
# excluded — the course playground does not render annotations.
CLIENT_APPLICABLE_TYPES: frozenset[str] = frozenset(
    {
        "COMPONENT_ADDED",
        "COMPONENT_MOVED",
        "COMPONENT_DELETED",
        "WIRE_ADDED",
        "WIRE_DELETED",
    }
)


class CircuitMutation(BaseModel):
    """A structural change the client applies to its local circuit store."""

    type: str
    payload: dict[str, Any]


async def seed_session(
    circuit_service: CircuitService, circuit: CircuitState
) -> str:
    """Seed a fresh ephemeral session from ``circuit`` and return its id.

    Components are added before wires so each wire's endpoints already exist
    when ``CircuitService.add_wire`` validates the connection.
    """
    session_id = f"tutor-{uuid4().hex}"
    for component in circuit.components:
        await circuit_service.add_component(session_id, TUTOR_ACTOR_ID, component)
    for wire in circuit.wires:
        await circuit_service.add_wire(session_id, TUTOR_ACTOR_ID, wire)
    return session_id


def collect_mutations(events: list[dict[str, Any]]) -> list[CircuitMutation]:
    """Map raw event documents to the mutations the client can apply.

    ``events`` is the list returned by ``get_events_since_seq`` (already in
    seq order). Non-applicable types (e.g. annotations) are dropped.
    """
    return [
        CircuitMutation(type=event["type"], payload=event["payload"])
        for event in events
        if event["type"] in CLIENT_APPLICABLE_TYPES
    ]


async def discard_session(
    circuit_service: CircuitService,
    event_repo: EventRepository,
    session_id: str,
) -> None:
    """Delete the ephemeral session's events + snapshots and clear its stacks."""
    await event_repo.delete_events_by_session(session_id)
    await event_repo.delete_snapshots_by_session(session_id)
    circuit_service.cleanup_session(session_id)


def build_tool_registry(
    deps: ToolDeps, session_id: str, actor_id: str
) -> dict[str, ToolFn]:
    """Bind ``deps`` into every tool and serialize results to plain dicts.

    The orchestrator's dispatch calls ``fn(validated_args)`` and expects a
    JSON-able dict back, but each tool is ``async def fn(args, *, deps) ->
    BaseModel``. This adapter closes over ``deps`` and dumps the result with
    camelCase aliases so it matches the rest of the agent trace.

    The ephemeral ``session_id`` and ``actor_id`` are **forced** onto the
    validated args, overriding whatever the model produced. The LLM never
    learns the server-generated session id, and it cannot point a tool at
    another session's event log — the args it sees for those fields are
    placeholders the adapter discards.
    """

    def _bind(tool: ToolFn) -> ToolFn:
        async def _runner(args: BaseModel) -> dict[str, Any]:
            if "session_id" in type(args).model_fields:
                args.session_id = session_id
            if "actor_id" in type(args).model_fields:
                args.actor_id = actor_id
            result = await tool(args, deps=deps)
            return result.model_dump(by_alias=True)

        return _runner

    return {name: _bind(tool) for name, tool in TOOLS.items()}
