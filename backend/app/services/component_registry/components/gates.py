"""
Basic logic gates.

A logic gate takes one or two binary inputs (0 or 1) and produces a single
output. They are the building blocks every digital circuit is made of.

Worked examples (with input A, B and output Y):

- ``AND_2``: Y is 1 only when both inputs are 1. A=1, B=0 -> Y=0.
- ``OR_2``: Y is 1 when at least one input is 1. A=1, B=0 -> Y=1.
- ``NOT``: Y is the inverse of A. A=1 -> Y=0.
- ``NAND_2``: NOT-AND. Y=0 only when A=B=1.
- ``NOR_2``: NOT-OR. Y=1 only when A=B=0.
- ``XOR_2``: Y is 1 when inputs differ. A=1, B=0 -> Y=1.
- ``BUFFER``: Y simply mirrors A. Used to strengthen a signal.

Pin layout: inputs sit on the left side of the body, the output on the right.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    input_pin,
    output_pin,
)

GATES: list[ComponentDefinition] = [
    ComponentDefinition(
        type="AND_2",
        name="AND Gate",
        category="Logic Gates",
        description="2-input AND gate",
        width=60,
        height=40,
        pins=[input_pin("A", -30, -10), input_pin("B", -30, 10), output_pin("Y", 30, 0)],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Y": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> AND1:A", "SW2:OUT -> AND1:B", "AND1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="OR_2",
        name="OR Gate",
        category="Logic Gates",
        description="2-input OR gate",
        width=60,
        height=40,
        pins=[input_pin("A", -30, -10), input_pin("B", -30, 10), output_pin("Y", 30, 0)],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Y": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> OR1:A", "SW2:OUT -> OR1:B", "OR1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="NOT",
        name="NOT Gate",
        category="Logic Gates",
        description="Inverter",
        width=50,
        height=30,
        pins=[input_pin("A", -25, 0), output_pin("Y", 25, 0)],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Y": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> NOT1:A", "NOT1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="NAND_2",
        name="NAND Gate",
        category="Logic Gates",
        description="2-input NAND gate",
        width=60,
        height=40,
        pins=[input_pin("A", -30, -10), input_pin("B", -30, 10), output_pin("Y", 30, 0)],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Y": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> NAND1:A", "SW2:OUT -> NAND1:B", "NAND1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="NOR_2",
        name="NOR Gate",
        category="Logic Gates",
        description="2-input NOR gate",
        width=60,
        height=40,
        pins=[input_pin("A", -30, -10), input_pin("B", -30, 10), output_pin("Y", 30, 0)],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Y": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> NOR1:A", "SW2:OUT -> NOR1:B", "NOR1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="XOR_2",
        name="XOR Gate",
        category="Logic Gates",
        description="2-input XOR gate",
        width=60,
        height=40,
        pins=[input_pin("A", -30, -10), input_pin("B", -30, 10), output_pin("Y", 30, 0)],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Y": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> XOR1:A", "SW2:OUT -> XOR1:B", "XOR1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="BUFFER",
        name="Buffer",
        category="Logic Gates",
        description="Buffer gate",
        width=50,
        height=30,
        pins=[input_pin("A", -25, 0), output_pin("Y", 25, 0)],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Y": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> BUF1:A", "BUF1:Y -> LED1:IN"],
    ),
]
