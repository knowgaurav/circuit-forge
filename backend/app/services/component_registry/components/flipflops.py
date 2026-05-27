"""
Flip-flops and latches: tiny one-bit memories.

While a logic gate's output depends only on its current inputs, a flip-flop
remembers a single bit across time. Most are clocked: their stored value only
updates on a clock edge (the ``CLK`` pin), so connecting a clock signal is
how you control "when" the bit can change.

- ``D_FLIPFLOP``: on each clock edge, copy ``D`` into ``Q``. ``Q'`` is the
  inverted output.
- ``SR_LATCH``: not clocked. ``S`` (set) drives ``Q`` to 1; ``R`` (reset)
  drives ``Q`` to 0. With both 0, the previous value is held.
- ``JK_FLIPFLOP``: on each clock edge, J=1/K=0 sets ``Q`` to 1, J=0/K=1
  resets it to 0, J=K=1 toggles it, J=K=0 holds it.

Inline reminder: ``CLK`` pins are edge-sensitive. The internal simulation
engine watches for transitions on these pins, not their static value.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    input_pin,
    output_pin,
)

FLIPFLOPS: list[ComponentDefinition] = [
    ComponentDefinition(
        type="D_FLIPFLOP",
        name="D Flip-Flop",
        category="Flip-Flops",
        description="D-type flip-flop",
        width=60,
        height=50,
        pins=[
            input_pin("D", -30, -15),
            input_pin("CLK", -30, 15),
            output_pin("Q", 30, -15),
            output_pin("Q'", 30, 15),
        ],
        connection_rules={
            "D": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "CLK": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Q": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q'": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> DFF1:D", "CLK1:CLK -> DFF1:CLK", "DFF1:Q -> LED1:IN"],
    ),
    ComponentDefinition(
        type="SR_LATCH",
        name="SR Latch",
        category="Flip-Flops",
        description="Set-Reset latch",
        width=60,
        height=50,
        pins=[
            input_pin("S", -30, -15),
            input_pin("R", -30, 15),
            output_pin("Q", 30, -15),
            output_pin("Q'", 30, 15),
        ],
        connection_rules={
            "S": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "R": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Q": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q'": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["BTN1:OUT -> SR1:S", "BTN2:OUT -> SR1:R", "SR1:Q -> LED1:IN"],
    ),
    ComponentDefinition(
        type="JK_FLIPFLOP",
        name="JK Flip-Flop",
        category="Flip-Flops",
        description="JK-type flip-flop",
        width=60,
        height=60,
        pins=[
            input_pin("J", -30, -20),
            input_pin("CLK", -30, 0),
            input_pin("K", -30, 20),
            output_pin("Q", 30, -15),
            output_pin("Q'", 30, 15),
        ],
        connection_rules={
            "J": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "CLK": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "K": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Q": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Q'": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> JKFF1:J", "CLK1:CLK -> JKFF1:CLK", "SW2:OUT -> JKFF1:K"],
    ),
]
