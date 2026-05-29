"""
Sequential blocks built from many flip-flops.

These components combine several flip-flops with a little extra logic so they
can do something more useful than store one bit. Each one needs a clock to
advance.

- ``COUNTER_4BIT``: every clock edge bumps the stored value up by one. The
  outputs Q0..Q3 are the 4 bits of the count (it wraps around 15 -> 0).
- ``SHIFT_REGISTER_8BIT``: on each clock edge the bit on ``SI`` (serial in)
  shifts into Q0, the previous Q0 moves to Q1, and so on. Useful for turning
  a serial bit stream into 8 parallel outputs.

Inline reminder: like flip-flops, the ``CLK`` pin is edge-triggered.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    input_pin,
    output_pin,
)

SEQUENTIAL: list[ComponentDefinition] = [
    ComponentDefinition(
        type="COUNTER_4BIT",
        name="4-bit Counter",
        category="Sequential",
        description="4-bit binary counter",
        width=80,
        height=80,
        pins=[
            input_pin("CLK", -40, 0),
            output_pin("Q0", 40, -30),
            output_pin("Q1", 40, -10),
            output_pin("Q2", 40, 10),
            output_pin("Q3", 40, 30),
        ],
        connection_rules={
            "CLK": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Q0": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q1": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q2": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q3": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["CLK1:CLK -> CNT1:CLK", "CNT1:Q0 -> LED1:IN"],
    ),
    ComponentDefinition(
        type="SHIFT_REGISTER_8BIT",
        name="8-bit Shift Register",
        category="Sequential",
        description="8-bit serial-in parallel-out shift register",
        width=120,
        height=100,
        pins=[
            input_pin("SI", -60, -20),
            input_pin("CLK", -60, 20),
            output_pin("Q0", 60, -35),
            output_pin("Q1", 60, -20),
            output_pin("Q2", 60, -5),
            output_pin("Q3", 60, 10),
            output_pin("Q4", 60, 25),
            output_pin("Q5", 60, 40),
            output_pin("Q6", 60, 55),
            output_pin("Q7", 60, 70),
        ],
        connection_rules={
            "SI": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "CLK": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Q0": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q1": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q2": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q3": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q4": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q5": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q6": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q7": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> SR1:SI", "CLK1:CLK -> SR1:CLK", "SR1:Q0 -> LED1:IN"],
    ),
]
