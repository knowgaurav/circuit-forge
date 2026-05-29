"""
Output devices: ways to observe the result of a circuit.

These components are mostly inputs (their pins consume signals from the rest
of the circuit). They render those signals as something a person can see.

- ``LED_RED`` / ``LED_GREEN`` / ``LED_BLUE`` / ``LED_YELLOW``: a light that
  turns on when its single ``IN`` pin is HIGH. Just a colour change.
- ``DISPLAY_7SEG``: seven inputs ``A..G``, one for each segment of a classic
  digital-clock-style number display. Drive each input HIGH to light that
  segment. Pair with ``BCD_TO_7SEG`` (in combinational.py) to display digits
  0..9 from a 4-bit number.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    input_pin,
)

OUTPUTS: list[ComponentDefinition] = [
    ComponentDefinition(
        type="LED_RED",
        name="Red LED",
        category="Output Devices",
        description="Red light-emitting diode",
        width=30,
        height=30,
        pins=[input_pin("IN", -15, 0)],
        connection_rules={
            "IN": ConnectionRule(can_connect_to=["output"], max_connections=1),
        },
        example_connections=["AND1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="LED_GREEN",
        name="Green LED",
        category="Output Devices",
        description="Green light-emitting diode",
        width=30,
        height=30,
        pins=[input_pin("IN", -15, 0)],
        connection_rules={
            "IN": ConnectionRule(can_connect_to=["output"], max_connections=1),
        },
        example_connections=["OR1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="LED_BLUE",
        name="Blue LED",
        category="Output Devices",
        description="Blue light-emitting diode",
        width=30,
        height=30,
        pins=[input_pin("IN", -15, 0)],
        connection_rules={
            "IN": ConnectionRule(can_connect_to=["output"], max_connections=1),
        },
        example_connections=["XOR1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="LED_YELLOW",
        name="Yellow LED",
        category="Output Devices",
        description="Yellow light-emitting diode",
        width=30,
        height=30,
        pins=[input_pin("IN", -15, 0)],
        connection_rules={
            "IN": ConnectionRule(can_connect_to=["output"], max_connections=1),
        },
        example_connections=["NOT1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="DISPLAY_7SEG",
        name="7-Segment Display",
        category="Output Devices",
        description="7-segment numeric display",
        width=50,
        height=70,
        pins=[
            input_pin("A", -25, -25),
            input_pin("B", -25, -15),
            input_pin("C", -25, -5),
            input_pin("D", -25, 5),
            input_pin("E", -25, 15),
            input_pin("F", -25, 25),
            input_pin("G", -25, 35),
        ],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "C": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "D": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "E": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "F": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "G": ConnectionRule(can_connect_to=["output"], max_connections=1),
        },
        example_connections=["DEC1:Y0 -> 7SEG1:A", "DEC1:Y1 -> 7SEG1:B"],
    ),
]
