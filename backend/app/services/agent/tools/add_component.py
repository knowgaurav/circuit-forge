"""Tool: ``add_component`` — create a component from the registry definition.

Steps:

1. Look up the component type in the ``ComponentRegistry``. An unknown type
   raises :class:`ToolError` with code ``UNKNOWN_COMPONENT_TYPE``.
2. Build the ``Pin`` list using ``_registry_pins`` so pin IDs/types/positions
   match the registry's authoritative description.
3. Generate a fresh component UUID, bundle the registry's default
   ``properties`` plus the caller's ``label`` (stored under
   ``properties["label"]`` so label-addressed tools like ``add_wire`` can
   find it), and place the component at ``args.position`` with rotation 0°.
4. Persist via ``CircuitService.add_component``, which appends an event and
   returns the resulting ``(event, state)`` pair.
5. Return the new ``component_id`` and the event ``seq`` so the LLM can use
   the seq for follow-up reads or optimistic ordering.

Worked example::

    args = AddComponentArgs(
        session_id="ABC123",
        actor_id="agent-1",
        component_type="AND",
        position=Position(x=120, y=200),
    )
    result = await add_component(args, deps=deps)
    # result.component_id == "<new uuid4>"
    # result.seq          == 7   (next event's monotonic sequence number)

If the registry has no entry for ``component_type``, the tool raises::

    ToolError(code="UNKNOWN_COMPONENT_TYPE",
              details="component_type 'XYZ' is not registered")
"""

from __future__ import annotations

from uuid import uuid4

from app.models.circuit import CircuitComponent, ComponentType, Rotation
from app.services.agent.schemas import AddComponentArgs, AddComponentResult

from ._helpers import _registry_pins
from ._types import ToolDeps, ToolError


async def add_component(
    args: AddComponentArgs, *, deps: ToolDeps
) -> AddComponentResult:
    """Create a new component from the registry definition and persist it."""
    definition = deps.component_registry.get_component(args.component_type)
    if definition is None:
        raise ToolError(
            "UNKNOWN_COMPONENT_TYPE",
            f"component_type '{args.component_type}' is not registered",
        )

    pins = _registry_pins(deps.component_registry, args.component_type)
    properties = dict(definition.properties)
    properties["label"] = args.label
    component = CircuitComponent(
        id=str(uuid4()),
        type=ComponentType(args.component_type),
        position=args.position,
        rotation=Rotation.DEG_0,
        properties=properties,
        pins=pins,
    )

    event, _state = await deps.circuit_service.add_component(
        args.session_id, args.actor_id, component
    )
    return AddComponentResult(component_id=component.id, seq=event.seq)
