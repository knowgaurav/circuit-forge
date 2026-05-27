"""
Aggregates every category list into one flat ``COMPONENT_DEFINITIONS`` list.

The ``ComponentRegistry`` class iterates this list once at construction time
to build its lookup tables. The order here matters for two reasons:

1. ``get_all_types()`` returns keys in insertion order.
2. ``get_categories()`` returns categories in the order they are first seen.

Both are observed by callers (e.g. the API layer) and by tests, so the order
below mirrors the original single-file registry exactly:

Logic Gates -> Input Devices -> Output Devices -> Flip-Flops ->
Combinational -> Sequential -> Motors (still "Output Devices") ->
Power -> Passive Components -> Connectors.
"""

from app.services.component_registry.components.combinational import COMBINATIONAL
from app.services.component_registry.components.connectors import CONNECTORS
from app.services.component_registry.components.flipflops import FLIPFLOPS
from app.services.component_registry.components.gates import GATES
from app.services.component_registry.components.inputs import INPUTS
from app.services.component_registry.components.motors import MOTORS
from app.services.component_registry.components.outputs import OUTPUTS
from app.services.component_registry.components.passive import PASSIVE
from app.services.component_registry.components.power import POWER
from app.services.component_registry.components.sequential import SEQUENTIAL
from app.services.component_registry.types import ComponentDefinition

# All component definitions mirroring frontend/src/constants/components.ts
COMPONENT_DEFINITIONS: list[ComponentDefinition] = [
    *GATES,
    *INPUTS,
    *OUTPUTS,
    *FLIPFLOPS,
    *COMBINATIONAL,
    *SEQUENTIAL,
    *MOTORS,
    *POWER,
    *PASSIVE,
    *CONNECTORS,
]

__all__ = ["COMPONENT_DEFINITIONS"]
