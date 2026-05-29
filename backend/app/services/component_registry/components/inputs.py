"""
Input devices: ways to feed signals into the rest of the circuit.

These components have only output pins. Whatever the user does (flip a switch,
press a button, set a number), the output pin carries that signal forward to
gates, flip-flops, and so on.

Quick tour:

- ``SWITCH_TOGGLE``: stays in the position you put it (on or off).
- ``SWITCH_PUSH``: momentary; high while pressed, low otherwise.
- ``CLOCK``: a square wave that flips between 0 and 1 at a fixed rate. Used to
  drive flip-flops and counters.
- ``CONST_HIGH`` / ``CONST_LOW``: hard-wired 1 or 0 (think VCC and GND for
  logic). They never change.
- ``DIP_SWITCH_4``: four independent toggle switches packaged together,
  exposing four output bits ``Q0..Q3``.
- ``NUMERIC_INPUT``: type a number 0..15 and the four output bits show its
  binary form.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    output_pin,
)

INPUTS: list[ComponentDefinition] = [
    ComponentDefinition(
        type="SWITCH_TOGGLE",
        name="Toggle Switch",
        category="Input Devices",
        description="On/Off toggle switch",
        width=40,
        height=40,
        pins=[output_pin("OUT", 20, 0)],
        connection_rules={
            "OUT": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> AND1:A"],
    ),
    ComponentDefinition(
        type="SWITCH_PUSH",
        name="Push Button",
        category="Input Devices",
        description="Momentary push button",
        width=40,
        height=40,
        pins=[output_pin("OUT", 20, 0)],
        connection_rules={
            "OUT": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["BTN1:OUT -> LED1:IN"],
    ),
    ComponentDefinition(
        type="CLOCK",
        name="Clock",
        category="Input Devices",
        description="Clock signal generator",
        width=50,
        height=40,
        pins=[output_pin("CLK", 25, 0)],
        connection_rules={
            "CLK": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["CLK1:CLK -> DFF1:CLK"],
    ),
    ComponentDefinition(
        type="CONST_HIGH",
        name="VCC (High)",
        category="Input Devices",
        description="Constant HIGH signal",
        width=30,
        height=30,
        pins=[output_pin("OUT", 15, 0)],
        connection_rules={
            "OUT": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["VCC1:OUT -> AND1:A"],
    ),
    ComponentDefinition(
        type="CONST_LOW",
        name="GND (Low)",
        category="Input Devices",
        description="Constant LOW signal",
        width=30,
        height=30,
        pins=[output_pin("OUT", 15, 0)],
        connection_rules={
            "OUT": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["GND1:OUT -> AND1:B"],
    ),
    ComponentDefinition(
        type="DIP_SWITCH_4",
        name="4-bit DIP Switch",
        category="Input Devices",
        description="4-bit DIP switch array",
        width=60,
        height=60,
        pins=[
            output_pin("Q0", 30, -20),
            output_pin("Q1", 30, -7),
            output_pin("Q2", 30, 7),
            output_pin("Q3", 30, 20),
        ],
        connection_rules={
            "Q0": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q1": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q2": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q3": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["DIP1:Q0 -> ADDER1:A0", "DIP1:Q1 -> ADDER1:A1"],
    ),
    ComponentDefinition(
        type="NUMERIC_INPUT",
        name="Numeric Input",
        category="Input Devices",
        description="Numeric value input (0-15)",
        width=50,
        height=60,
        pins=[
            output_pin("Q0", 25, -20),
            output_pin("Q1", 25, -7),
            output_pin("Q2", 25, 7),
            output_pin("Q3", 25, 20),
        ],
        connection_rules={
            "Q0": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q1": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q2": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q3": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["NUM1:Q0 -> 7SEG1:A", "NUM1:Q1 -> 7SEG1:B"],
    ),
]
