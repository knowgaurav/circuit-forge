"""
Combinational components: outputs depend only on the current inputs.

Unlike flip-flops, these have no memory. Give them the same inputs and you
always get the same outputs. They are useful when you want to multiplex,
decode, add, or compare a few signals at once.

- ``MUX_2TO1``: pick A or B based on the selector ``S``. S=0 picks A, S=1
  picks B; the chosen one shows up on ``Y``.
- ``DECODER_2TO4``: turn a 2-bit input (A0, A1) into one-hot outputs. The
  output ``Y<i>`` matching the binary value of the inputs goes HIGH; the
  others stay LOW.
- ``ADDER_4BIT``: add two 4-bit numbers (A and B). Outputs are the 4-bit sum
  S0..S3 plus a carry-out ``Cout`` for when the sum overflows 4 bits.
- ``COMPARATOR_4BIT``: compare two 4-bit numbers and assert exactly one of
  ``A>B``, ``A=B``, ``A<B``.
- ``BCD_TO_7SEG``: take a 4-bit BCD digit (0..9) on D0..D3 and light the
  matching seven-segment outputs ``A..G``. Pairs naturally with
  ``DISPLAY_7SEG`` from the output devices.
"""

from app.services.component_registry.types import (
    ComponentDefinition,
    ConnectionRule,
    input_pin,
    output_pin,
)

COMBINATIONAL: list[ComponentDefinition] = [
    ComponentDefinition(
        type="MUX_2TO1",
        name="2:1 Multiplexer",
        category="Combinational",
        description="2-to-1 multiplexer",
        width=60,
        height=50,
        pins=[
            input_pin("A", -30, -15),
            input_pin("B", -30, 0),
            input_pin("S", -30, 15),
            output_pin("Y", 30, 0),
        ],
        connection_rules={
            "A": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "S": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Y": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> MUX1:A", "SW2:OUT -> MUX1:B", "SW3:OUT -> MUX1:S", "MUX1:Y -> LED1:IN"],
    ),
    ComponentDefinition(
        type="DECODER_2TO4",
        name="2-to-4 Decoder",
        category="Combinational",
        description="2-to-4 line decoder",
        width=80,
        height=70,
        pins=[
            input_pin("A0", -40, -15),
            input_pin("A1", -40, 15),
            output_pin("Y0", 40, -30),
            output_pin("Y1", 40, -10),
            output_pin("Y2", 40, 10),
            output_pin("Y3", 40, 30),
        ],
        connection_rules={
            "A0": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "A1": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "Y0": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Y1": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Y2": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Y3": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["SW1:OUT -> DEC1:A0", "SW2:OUT -> DEC1:A1", "DEC1:Y0 -> LED1:IN"],
    ),
    ComponentDefinition(
        type="ADDER_4BIT",
        name="4-bit Adder",
        category="Combinational",
        description="4-bit ripple carry adder",
        width=100,
        height=120,
        pins=[
            input_pin("A0", -50, -45),
            input_pin("A1", -50, -30),
            input_pin("A2", -50, -15),
            input_pin("A3", -50, 0),
            input_pin("B0", -50, 15),
            input_pin("B1", -50, 30),
            input_pin("B2", -50, 45),
            input_pin("B3", -50, 60),
            output_pin("S0", 50, -30),
            output_pin("S1", 50, -15),
            output_pin("S2", 50, 0),
            output_pin("S3", 50, 15),
            output_pin("Cout", 50, 30),
        ],
        connection_rules={
            "A0": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "A1": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "A2": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "A3": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B0": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B1": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B2": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B3": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "S0": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "S1": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "S2": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "S3": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "Cout": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["DIP1:Q0 -> ADDER1:A0", "DIP2:Q0 -> ADDER1:B0", "ADDER1:S0 -> LED1:IN"],
    ),
    ComponentDefinition(
        type="COMPARATOR_4BIT",
        name="4-bit Comparator",
        category="Combinational",
        description="4-bit magnitude comparator",
        width=100,
        height=120,
        pins=[
            input_pin("A0", -50, -45),
            input_pin("A1", -50, -30),
            input_pin("A2", -50, -15),
            input_pin("A3", -50, 0),
            input_pin("B0", -50, 15),
            input_pin("B1", -50, 30),
            input_pin("B2", -50, 45),
            input_pin("B3", -50, 60),
            output_pin("A>B", 50, -15),
            output_pin("A=B", 50, 0),
            output_pin("A<B", 50, 15),
        ],
        connection_rules={
            "A0": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "A1": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "A2": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "A3": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B0": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B1": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B2": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "B3": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "A>B": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "A=B": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "A<B": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["DIP1:Q0 -> COMP1:A0", "DIP2:Q0 -> COMP1:B0", "COMP1:A>B -> LED1:IN"],
    ),
    ComponentDefinition(
        type="BCD_TO_7SEG",
        name="BCD to 7-Segment",
        category="Combinational",
        description="BCD to 7-segment decoder (displays 0-9)",
        width=80,
        height=100,
        pins=[
            input_pin("D0", -40, -30),
            input_pin("D1", -40, -10),
            input_pin("D2", -40, 10),
            input_pin("D3", -40, 30),
            output_pin("A", 40, -40),
            output_pin("B", 40, -27),
            output_pin("C", 40, -13),
            output_pin("D", 40, 0),
            output_pin("E", 40, 13),
            output_pin("F", 40, 27),
            output_pin("G", 40, 40),
        ],
        connection_rules={
            "D0": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "D1": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "D2": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "D3": ConnectionRule(can_connect_to=["output"], max_connections=1),
            "A": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "B": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "C": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "D": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "E": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "F": ConnectionRule(can_connect_to=["input"], max_connections=-1),
            "G": ConnectionRule(can_connect_to=["input"], max_connections=-1),
        },
        example_connections=["CNT1:Q0 -> DEC1:D0", "DEC1:A -> DISP1:A"],
    ),
]
