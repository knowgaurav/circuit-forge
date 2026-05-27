"""
Component Registry - Backend mirror of frontend component definitions.

This package replaces the original single-file ``component_registry.py``. It
groups the component data into category modules so each file is small enough
to scan in one screen, and adds tutorial-style docstrings to help newcomers
build a mental model of the pieces.

Module layout:

- ``types``      - ``PinDefinition``, ``ConnectionRule``, ``ComponentDefinition``
                   and the ``input_pin`` / ``output_pin`` helpers.
- ``registry``   - the ``ComponentRegistry`` class and ``get_component_registry``
                   singleton accessor.
- ``components`` - one file per category of components, plus an ``__init__``
                   that concatenates them into ``COMPONENT_DEFINITIONS``.

Public API (re-exported for backwards compatibility with callers that still
import everything from ``app.services.component_registry``):

    PinDefinition, ConnectionRule, ComponentDefinition,
    input_pin, output_pin,
    ComponentRegistry, get_component_registry.
"""

from app.services.component_registry.registry import (
    ComponentRegistry,
    get_component_registry,
)
from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    PinDefinition,
    input_pin,
    output_pin,
)

__all__ = [
    "ComponentDefinition",
    "ComponentRegistry",
    "ConnectionRule",
    "PinDefinition",
    "get_component_registry",
    "input_pin",
    "output_pin",
]
