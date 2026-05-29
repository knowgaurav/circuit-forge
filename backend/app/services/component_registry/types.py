"""
Core types for the component registry.

This module defines the small data shapes that every component description in
the registry uses. Think of them as the "vocabulary" of a component:

- ``PinDefinition`` describes one pin on a component (its name, whether it is
  an input or output, and where it sits on the component's body for rendering).
- ``ConnectionRule`` describes which kinds of pins another pin is allowed to
  connect to, and how many connections are allowed.
- ``ComponentDefinition`` is the full description of a component: its type,
  display name, category, size, pins, properties, and connection rules.

The two helper functions ``input_pin`` and ``output_pin`` are sugar for the
common case of declaring a pin without writing the full ``PinDefinition`` call
each time. Every category file uses them, so keeping them next to the types
makes the imports tidy.
"""

from typing import Any

from pydantic import BaseModel


class PinDefinition(BaseModel):
    name: str
    type: str  # "input" or "output"
    position: dict[str, int]


class ConnectionRule(BaseModel):
    can_connect_to: list[str]
    max_connections: int = -1  # -1 for unlimited


class ComponentDefinition(BaseModel):
    type: str
    name: str
    category: str
    description: str
    width: int
    height: int
    pins: list[PinDefinition]
    properties: dict[str, Any] = {}
    connection_rules: dict[str, ConnectionRule] = {}
    example_connections: list[str] = []


# Helper functions for creating pins
def input_pin(name: str, x: int, y: int) -> PinDefinition:
    return PinDefinition(name=name, type="input", position={"x": x, "y": y})


def output_pin(name: str, x: int, y: int) -> PinDefinition:
    return PinDefinition(name=name, type="output", position={"x": x, "y": y})
