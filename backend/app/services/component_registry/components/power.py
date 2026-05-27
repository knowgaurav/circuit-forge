"""
Power components: where current comes from and where it returns.

Logic in this app is largely abstract, but circuits still need a way to
represent supply and ground for diagrams that mix logic with passive parts
like resistors. These three components fill that role.

- ``VCC_5V`` / ``VCC_3V3``: a constant power supply at the named voltage. The
  ``VCC`` pin is an output that other inputs can connect to.
- ``GROUND``: the return path. Its ``GND`` pin is an input that accepts an
  unlimited number of connections, like a real ground rail.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    input_pin,
    output_pin,
)

POWER: list[ComponentDefinition] = [
    ComponentDefinition(
        type="VCC_5V",
        name="VCC +5V",
        category="Power",
        description="+5V power supply",
        width=30,
        height=30,
        pins=[output_pin("VCC", 0, 15)],
        connection_rules={
            "VCC": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["VCC1:VCC -> R1:IN"],
    ),
    ComponentDefinition(
        type="VCC_3V3",
        name="VCC +3.3V",
        category="Power",
        description="+3.3V power supply",
        width=30,
        height=30,
        pins=[output_pin("VCC", 0, 15)],
        connection_rules={
            "VCC": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["VCC1:VCC -> R1:IN"],
    ),
    ComponentDefinition(
        type="GROUND",
        name="Ground",
        category="Power",
        description="Ground connection",
        width=30,
        height=30,
        pins=[input_pin("GND", 0, -15)],
        connection_rules={
            # GND is an input pin but accepts many output connections, so it
            # behaves like a shared rail rather than a single sink.
            "GND": ConnectionRule(can_connect_to=["output"], max_connections=-1),
        },
        example_connections=["R1:OUT -> GND1:GND"],
    ),
]
