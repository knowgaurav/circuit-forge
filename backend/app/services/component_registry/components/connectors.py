"""
Connectors: small helpers that just shape the wiring graph.

- ``JUNCTION``: a one-input, two-output split point. Useful when you want to
  fan a signal out into two destinations without drawing crossed wires.
- ``PROBE``: a measurement endpoint with a single input. Treat it as a label
  in the schematic where you would like to inspect a value.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    input_pin,
    output_pin,
)

CONNECTORS: list[ComponentDefinition] = [
    ComponentDefinition(
        type="JUNCTION",
        name="Wire Junction",
        category="Connectors",
        description="Wire junction point",
        width=20,
        height=20,
        pins=[
            input_pin("IN", -10, 0),
            output_pin("OUT1", 10, -5),
            output_pin("OUT2", 10, 5),
        ],
        connection_rules={
            "IN": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "OUT1": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "OUT2": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> J1:IN", "J1:OUT1 -> LED1:IN", "J1:OUT2 -> LED2:IN"],
    ),
    ComponentDefinition(
        type="PROBE",
        name="Probe",
        category="Connectors",
        description="Signal probe for debugging",
        width=30,
        height=30,
        pins=[input_pin("IN", -15, 0)],
        connection_rules={
            "IN": ConnectionRule(can_connect_to=["output"], max_connections=1),
        },
        example_connections=["AND1:Y -> PRB1:IN"],
    ),
]
