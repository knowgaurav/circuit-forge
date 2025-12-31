"""Circuit state Pydantic models."""

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field

SCHEMA_VERSION = "1.0.0"


class Position(BaseModel):
    """2D position on the circuit board."""

    x: float
    y: float


class PinType(str, Enum):
    """Pin type enumeration."""

    INPUT = "input"
    OUTPUT = "output"


class Rotation(int, Enum):
    """Component rotation angles."""

    DEG_0 = 0
    DEG_90 = 90
    DEG_180 = 180
    DEG_270 = 270


class StrokeWidth(int, Enum):
    """Annotation stroke widths."""

    THIN = 2
    MEDIUM = 4
    THICK = 8


class ComponentType(str, Enum):
    """All available component types."""

    # Logic Gates (Basic)
    AND_2 = "AND_2"
    AND_3 = "AND_3"
    AND_4 = "AND_4"
    OR_2 = "OR_2"
    OR_3 = "OR_3"
    OR_4 = "OR_4"
    NOT = "NOT"
    NAND_2 = "NAND_2"
    NAND_3 = "NAND_3"
    NOR_2 = "NOR_2"
    NOR_3 = "NOR_3"
    XOR_2 = "XOR_2"
    XNOR_2 = "XNOR_2"
    BUFFER = "BUFFER"

    # Flip-Flops
    SR_LATCH = "SR_LATCH"
    D_FLIPFLOP = "D_FLIPFLOP"
    JK_FLIPFLOP = "JK_FLIPFLOP"
    T_FLIPFLOP = "T_FLIPFLOP"

    # Combinational
    MUX_2TO1 = "MUX_2TO1"
    MUX_4TO1 = "MUX_4TO1"
    DEMUX_1TO2 = "DEMUX_1TO2"
    DECODER_2TO4 = "DECODER_2TO4"
    ADDER_4BIT = "ADDER_4BIT"
    COMPARATOR_4BIT = "COMPARATOR_4BIT"

    # Sequential
    COUNTER_4BIT = "COUNTER_4BIT"
    SHIFT_REGISTER_8BIT = "SHIFT_REGISTER_8BIT"

    # Input Devices
    SWITCH_TOGGLE = "SWITCH_TOGGLE"
    SWITCH_PUSH = "SWITCH_PUSH"
    DIP_SWITCH_4 = "DIP_SWITCH_4"
    CLOCK = "CLOCK"
    CONST_HIGH = "CONST_HIGH"
    CONST_LOW = "CONST_LOW"
    NUMERIC_INPUT = "NUMERIC_INPUT"

    # Output Devices
    LED_RED = "LED_RED"
    LED_GREEN = "LED_GREEN"
    LED_YELLOW = "LED_YELLOW"
    LED_BLUE = "LED_BLUE"
    LED_RGB = "LED_RGB"
    DISPLAY_7SEG = "DISPLAY_7SEG"
    DISPLAY_LCD = "DISPLAY_LCD"
    BUZZER = "BUZZER"
    MOTOR_DC = "MOTOR_DC"
    MOTOR_SERVO = "MOTOR_SERVO"
    MOTOR_STEPPER = "MOTOR_STEPPER"

    # Passive Components
    RESISTOR = "RESISTOR"
    CAPACITOR = "CAPACITOR"
    INDUCTOR = "INDUCTOR"
    DIODE = "DIODE"
    ZENER = "ZENER"
    TRANSISTOR_NPN = "TRANSISTOR_NPN"
    TRANSISTOR_PNP = "TRANSISTOR_PNP"

    # Sensors
    SENSOR_LIGHT = "SENSOR_LIGHT"
    SENSOR_TEMP = "SENSOR_TEMP"
    SENSOR_PROXIMITY = "SENSOR_PROXIMITY"
    SENSOR_ULTRASONIC = "SENSOR_ULTRASONIC"
    POTENTIOMETER = "POTENTIOMETER"

    # Power
    VCC_5V = "VCC_5V"
    VCC_3V3 = "VCC_3V3"
    GROUND = "GROUND"
    BATTERY = "BATTERY"

    # Connectors
    JUNCTION = "JUNCTION"
    BUS_4BIT = "BUS_4BIT"
    BUS_8BIT = "BUS_8BIT"
    PIN_INPUT = "PIN_INPUT"
    PIN_OUTPUT = "PIN_OUTPUT"
    PROBE = "PROBE"


class Pin(BaseModel):
    """Component pin definition."""

    id: str
    name: str
    type: PinType
    position: Position


class CircuitComponent(BaseModel):
    """A component placed on the circuit board."""

    id: str
    type: ComponentType
    position: Position
    rotation: Rotation = Rotation.DEG_0
    properties: dict[str, Any] = Field(default_factory=dict)
    pins: list[Pin] = Field(default_factory=list)


class Wire(BaseModel):
    """A wire connecting two component pins."""

    id: str
    from_component_id: str = Field(alias="fromComponentId")
    from_pin_id: str = Field(alias="fromPinId")
    to_component_id: str = Field(alias="toComponentId")
    to_pin_id: str = Field(alias="toPinId")
    waypoints: list[Position] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class StrokeData(BaseModel):
    """Freehand stroke annotation data."""

    points: list[Position]
    color: str
    width: StrokeWidth


class TextData(BaseModel):
    """Text annotation data."""

    content: str
    position: Position
    font_size: float = Field(alias="fontSize")

    model_config = {"populate_by_name": True}


class Annotation(BaseModel):
    """An annotation on the circuit board."""

    id: str
    type: Literal["stroke", "text"]
    user_id: str = Field(alias="userId")
    data: StrokeData | TextData

    model_config = {"populate_by_name": True}


class CircuitState(BaseModel):
    """Complete state of a circuit board."""

    session_id: str = Field(alias="sessionId")
    version: int = 0
    schema_version: str = Field(default=SCHEMA_VERSION, alias="schemaVersion")
    components: list[CircuitComponent] = Field(default_factory=list)
    wires: list[Wire] = Field(default_factory=list)
    annotations: list[Annotation] = Field(default_factory=list)
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    model_config = {"populate_by_name": True}

    @classmethod
    def create_empty(cls, session_id: str) -> "CircuitState":
        """Create an empty circuit state for a new session."""
        return cls(
            sessionId=session_id,
            version=0,
            schemaVersion=SCHEMA_VERSION,
            components=[],
            wires=[],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )
