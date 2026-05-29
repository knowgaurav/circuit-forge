"""
Passive components: parts with no internal logic.

These appear in schematics for completeness but they do not transform signals
in this simulator. They are still useful in pin-routing rules so that wires
flowing through them connect to the right things.

- ``RESISTOR``: a current limiter. ``IN`` accepts a single output, ``OUT``
  forwards to any number of inputs.
- ``CAPACITOR``: a filter. Same pin shape as the resistor, just oriented
  vertically.
- ``DIODE``: one-way flow. ``A`` (anode) accepts the source signal, ``K``
  (cathode) feeds downstream inputs.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    input_pin,
    output_pin,
)

PASSIVE: list[ComponentDefinition] = [
    ComponentDefinition(
        type="RESISTOR",
        name="Resistor",
        category="Passive Components",
        description="Resistor for current limiting",
        width=60,
        height=20,
        pins=[input_pin("IN", -30, 0), output_pin("OUT", 30, 0)],
        connection_rules={
            "IN": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "OUT": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["VCC1:VCC -> R1:IN", "R1:OUT -> LED1:IN"],
    ),
    ComponentDefinition(
        type="CAPACITOR",
        name="Capacitor",
        category="Passive Components",
        description="Capacitor for filtering",
        width=30,
        height=40,
        pins=[input_pin("IN", 0, -20), output_pin("OUT", 0, 20)],
        connection_rules={
            "IN": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "OUT": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["VCC1:VCC -> C1:IN", "C1:OUT -> GND1:GND"],
    ),
    ComponentDefinition(
        type="DIODE",
        name="Diode",
        category="Passive Components",
        description="Diode for one-way current flow",
        width=50,
        height=20,
        pins=[input_pin("A", -25, 0), output_pin("K", 25, 0)],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "K": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["VCC1:VCC -> D1:A", "D1:K -> LED1:IN"],
    ),
]
