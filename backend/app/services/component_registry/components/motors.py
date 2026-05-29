"""
Motor outputs.

There is just one motor for now, but it lives in its own module so the
overall ordering of the registry stays exactly as it was before the split.
The motor's category is still ``"Output Devices"``; the file name reflects
where it sits in the source list, not its category.

- ``MOTOR_DC``: two control pins. Drive ``FWD`` HIGH to spin one way,
  ``REV`` HIGH to spin the other. Both LOW means stopped.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    input_pin,
)

MOTORS: list[ComponentDefinition] = [
    ComponentDefinition(
        type="MOTOR_DC",
        name="DC Motor",
        category="Output Devices",
        description="DC motor with direction control",
        width=50,
        height=50,
        pins=[
            input_pin("FWD", -25, -10),
            input_pin("REV", -25, 10),
        ],
        connection_rules={
            "FWD": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "REV": ConnectionRule(can_connect_to=["output"], max_connections=1),
        },
        example_connections=["SW1:OUT -> MOT1:FWD", "SW2:OUT -> MOT1:REV"],
    ),
]
