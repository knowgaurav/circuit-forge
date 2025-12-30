"""
Component Registry - Backend mirror of frontend component definitions.
Provides component schemas for LLM tool functions.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel


class PinDefinition(BaseModel):
    name: str
    type: str  # "input" or "output"
    position: Dict[str, int]


class ConnectionRule(BaseModel):
    can_connect_to: List[str]
    max_connections: int = -1  # -1 for unlimited


class ComponentDefinition(BaseModel):
    type: str
    name: str
    category: str
    description: str
    width: int
    height: int
    pins: List[PinDefinition]
    properties: Dict[str, Any] = {}
    connection_rules: Dict[str, ConnectionRule] = {}
    example_connections: List[str] = []


# Helper functions for creating pins
def input_pin(name: str, x: int, y: int) -> PinDefinition:
    return PinDefinition(name=name, type="input", position={"x": x, "y": y})


def output_pin(name: str, x: int, y: int) -> PinDefinition:
    return PinDefinition(name=name, type="output", position={"x": x, "y": y})


# All component definitions mirroring frontend/src/constants/components.ts
COMPONENT_DEFINITIONS: List[ComponentDefinition] = [
    # Logic Gates (Basic)
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

    # Input Devices
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

    # Output Devices
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

    # Flip-Flops
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

    # Combinational
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

    # Sequential
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

    # Motors
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

    # Power
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
            "GND": ConnectionRule(can_connect_to=["output"], max_connections=-1),
        },
        example_connections=["R1:OUT -> GND1:GND"],
    ),

    # Passive Components
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

    # Connectors
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


class ComponentRegistry:
    """Registry for all circuit components."""

    def __init__(self):
        self._components: Dict[str, ComponentDefinition] = {
            comp.type: comp for comp in COMPONENT_DEFINITIONS
        }
        self._categories: Dict[str, List[ComponentDefinition]] = {}
        for comp in COMPONENT_DEFINITIONS:
            if comp.category not in self._categories:
                self._categories[comp.category] = []
            self._categories[comp.category].append(comp)

    def get_all_components(self) -> Dict[str, List[ComponentDefinition]]:
        """Return all components grouped by category."""
        return self._categories

    def get_component(self, comp_type: str) -> Optional[ComponentDefinition]:
        """Get a component by type."""
        return self._components.get(comp_type)

    def get_categories(self) -> List[str]:
        """Get all category names."""
        return list(self._categories.keys())

    def search_components(self, query: str) -> List[ComponentDefinition]:
        """Search components by type or name (fuzzy match)."""
        query_lower = query.lower()
        results = []
        for comp in COMPONENT_DEFINITIONS:
            if (
                query_lower in comp.type.lower()
                or query_lower in comp.name.lower()
                or query_lower in comp.description.lower()
            ):
                results.append(comp)
        return results

    def get_all_types(self) -> List[str]:
        """Get all component types."""
        return list(self._components.keys())

    def get_pin_names(self, comp_type: str) -> List[str]:
        """Get all pin names for a component type."""
        comp = self.get_component(comp_type)
        if not comp:
            return []
        return [pin.name for pin in comp.pins]


# Singleton instance
_registry: Optional[ComponentRegistry] = None


def get_component_registry() -> ComponentRegistry:
    """Get the singleton component registry instance."""
    global _registry
    if _registry is None:
        _registry = ComponentRegistry()
    return _registry
