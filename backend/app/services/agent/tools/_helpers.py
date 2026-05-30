"""Private helpers shared by tool implementations.

Four pure-Python utilities live here. They do not depend on any tool module,
so importing them from a tool file never risks a circular import.

``_resolve_pin``
    Maps a component *label* + *pin name* + expected direction onto the
    ``(component_id, pin_id)`` pair the persistence layer needs. Lets the
    agent address pins the way it sees them on the board rather than by
    internal UUIDs. Raises :class:`ToolError` (``COMPONENT_NOT_FOUND`` /
    ``INVALID_PIN``) on a miss.

``_registry_pins``
    Maps a registered component definition's pin descriptors onto the
    ``Pin`` model used by the persistence layer. Raises :class:`ToolError`
    with code ``UNKNOWN_COMPONENT_TYPE`` when the registry has no entry.

``_is_combinational``
    Returns ``True`` when a component type contributes to combinational
    cycle analysis. Sources (constants, switches, clocks) and stateful
    elements (flip-flops, latches) break cycles and are excluded.

``_tarjan_sccs``
    Classic Tarjan's algorithm for strongly connected components.

Worked example for ``_tarjan_sccs``::

    nodes = ["A", "B", "C", "D"]
    adj = {
        "A": ["B"],
        "B": ["C"],
        "C": ["A"],   # A → B → C → A forms a cycle
        "D": [],      # D is isolated
    }
    _tarjan_sccs(nodes, adj)
    # → [["C", "B", "A"], ["D"]]
    #   The 3-cycle becomes one SCC; D is its own trivial SCC.

The order inside an SCC reflects pop order from the algorithm stack, not the
edge direction. Callers that care about cycles only check ``len(scc) > 1`` (or
the self-loop case) and treat the set as unordered.
"""

from __future__ import annotations

from app.models.circuit import CircuitComponent, Pin, PinType, Position
from app.services.component_registry import ComponentRegistry
from app.services.simulation_engine import (
    _SOURCE as _SIM_SOURCE,
    _STATEFUL as _SIM_STATEFUL,
)

from ._types import ToolError


def _resolve_pin(
    components: list[CircuitComponent],
    label: str,
    pin_name: str,
    expected: PinType,
) -> tuple[str, str]:
    """Resolve a (component label, pin name) pair to (component_id, pin_id).

    The agent addresses pins the way a human reads the board — by the
    component's label (stored in ``properties["label"]``) and the pin's
    name — never by internal UUIDs. We match against the component's own
    pins, so the returned ``pin_id`` is guaranteed to exist on the
    component and to carry the expected direction.

    Raises:
        ToolError("COMPONENT_NOT_FOUND") — no component carries ``label``.
        ToolError("INVALID_PIN") — the component has no pin named
            ``pin_name`` of type ``expected``.
    """
    component = next(
        (c for c in components if c.properties.get("label") == label), None
    )
    if component is None:
        raise ToolError("COMPONENT_NOT_FOUND", f"no component labelled '{label}'")

    pin = next(
        (p for p in component.pins if p.name == pin_name and p.type == expected),
        None,
    )
    if pin is None:
        raise ToolError(
            "INVALID_PIN",
            f"component '{label}' has no {expected.value} pin named '{pin_name}'",
        )

    return component.id, pin.id


def _registry_pins(registry: ComponentRegistry, component_type: str) -> list[Pin]:
    """Map a registry component definition's pins to ``Pin`` instances."""
    definition = registry.get_component(component_type)
    if definition is None:
        raise ToolError(
            "UNKNOWN_COMPONENT_TYPE",
            f"component_type '{component_type}' is not registered",
        )

    pins: list[Pin] = []
    for pin_def in definition.pins:
        pins.append(
            Pin(
                id=pin_def.name,
                name=pin_def.name,
                type=PinType.INPUT if pin_def.type == "input" else PinType.OUTPUT,
                position=Position(x=pin_def.position["x"], y=pin_def.position["y"]),
            )
        )
    return pins


def _is_combinational(component_type: str) -> bool:
    """A component participates in combinational cycle analysis when it is
    neither a source (constants/switches/clock) nor a stateful element."""
    return component_type not in _SIM_SOURCE and component_type not in _SIM_STATEFUL


def _tarjan_sccs(
    nodes: list[str], adj: dict[str, list[str]]
) -> list[list[str]]:
    """Tarjan's strongly connected components."""
    index = 0
    stack: list[str] = []
    indices: dict[str, int] = {}
    lowlink: dict[str, int] = {}
    on_stack: set[str] = set()
    sccs: list[list[str]] = []

    def strongconnect(v: str) -> None:
        nonlocal index
        indices[v] = index
        lowlink[v] = index
        index += 1
        stack.append(v)
        on_stack.add(v)
        for w in adj.get(v, []):
            if w not in indices:
                strongconnect(w)
                lowlink[v] = min(lowlink[v], lowlink[w])
            elif w in on_stack:
                lowlink[v] = min(lowlink[v], indices[w])
        if lowlink[v] == indices[v]:
            component: list[str] = []
            while True:
                w = stack.pop()
                on_stack.remove(w)
                component.append(w)
                if w == v:
                    break
            sccs.append(component)

    for v in nodes:
        if v not in indices:
            strongconnect(v)
    return sccs
