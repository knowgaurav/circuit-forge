"""Test data factories for creating test objects."""

from datetime import datetime
from uuid import uuid4

from app.models.circuit import (
    CircuitComponent,
    CircuitState,
    ComponentType,
    Pin,
    PinType,
    Position,
    Rotation,
    Wire,
)
from app.models.session import Participant, Role, Session


class ComponentFactory:
    """Factory for creating circuit components."""

    @staticmethod
    def create_switch(
        id: str | None = None,
        x: float = 100,
        y: float = 100,
        state: bool = False,
    ) -> CircuitComponent:
        """Create a toggle switch component."""
        return CircuitComponent(
            id=id or f"switch-{uuid4().hex[:8]}",
            type=ComponentType.SWITCH_TOGGLE,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={"state": state},
            pins=[
                Pin(id="OUT", name="OUT", type=PinType.OUTPUT, position=Position(x=20, y=0))
            ],
        )

    @staticmethod
    def create_const_high(id: str | None = None, x: float = 100, y: float = 100) -> CircuitComponent:
        """Create a constant HIGH component."""
        return CircuitComponent(
            id=id or f"vcc-{uuid4().hex[:8]}",
            type=ComponentType.CONST_HIGH,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="OUT", name="OUT", type=PinType.OUTPUT, position=Position(x=15, y=0))
            ],
        )

    @staticmethod
    def create_const_low(id: str | None = None, x: float = 100, y: float = 100) -> CircuitComponent:
        """Create a constant LOW component."""
        return CircuitComponent(
            id=id or f"gnd-{uuid4().hex[:8]}",
            type=ComponentType.CONST_LOW,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="OUT", name="OUT", type=PinType.OUTPUT, position=Position(x=15, y=0))
            ],
        )

    @staticmethod
    def create_and_gate(id: str | None = None, x: float = 200, y: float = 100) -> CircuitComponent:
        """Create a 2-input AND gate."""
        return CircuitComponent(
            id=id or f"and-{uuid4().hex[:8]}",
            type=ComponentType.AND_2,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-30, y=-10)),
                Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=-30, y=10)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=30, y=0)),
            ],
        )

    @staticmethod
    def create_or_gate(id: str | None = None, x: float = 200, y: float = 100) -> CircuitComponent:
        """Create a 2-input OR gate."""
        return CircuitComponent(
            id=id or f"or-{uuid4().hex[:8]}",
            type=ComponentType.OR_2,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-30, y=-10)),
                Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=-30, y=10)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=30, y=0)),
            ],
        )

    @staticmethod
    def create_not_gate(id: str | None = None, x: float = 200, y: float = 100) -> CircuitComponent:
        """Create a NOT gate (inverter)."""
        return CircuitComponent(
            id=id or f"not-{uuid4().hex[:8]}",
            type=ComponentType.NOT,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-25, y=0)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=25, y=0)),
            ],
        )

    @staticmethod
    def create_nand_gate(id: str | None = None, x: float = 200, y: float = 100) -> CircuitComponent:
        """Create a 2-input NAND gate."""
        return CircuitComponent(
            id=id or f"nand-{uuid4().hex[:8]}",
            type=ComponentType.NAND_2,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-30, y=-10)),
                Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=-30, y=10)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=30, y=0)),
            ],
        )

    @staticmethod
    def create_nor_gate(id: str | None = None, x: float = 200, y: float = 100) -> CircuitComponent:
        """Create a 2-input NOR gate."""
        return CircuitComponent(
            id=id or f"nor-{uuid4().hex[:8]}",
            type=ComponentType.NOR_2,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-30, y=-10)),
                Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=-30, y=10)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=30, y=0)),
            ],
        )

    @staticmethod
    def create_xor_gate(id: str | None = None, x: float = 200, y: float = 100) -> CircuitComponent:
        """Create a 2-input XOR gate."""
        return CircuitComponent(
            id=id or f"xor-{uuid4().hex[:8]}",
            type=ComponentType.XOR_2,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-30, y=-10)),
                Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=-30, y=10)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=30, y=0)),
            ],
        )

    @staticmethod
    def create_xnor_gate(id: str | None = None, x: float = 200, y: float = 100) -> CircuitComponent:
        """Create a 2-input XNOR gate."""
        return CircuitComponent(
            id=id or f"xnor-{uuid4().hex[:8]}",
            type=ComponentType.XNOR_2,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=-30, y=-10)),
                Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=-30, y=10)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=30, y=0)),
            ],
        )

    @staticmethod
    def create_led(id: str | None = None, x: float = 300, y: float = 100) -> CircuitComponent:
        """Create a red LED."""
        return CircuitComponent(
            id=id or f"led-{uuid4().hex[:8]}",
            type=ComponentType.LED_RED,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="IN", name="IN", type=PinType.INPUT, position=Position(x=-15, y=0))
            ],
        )

    @staticmethod
    def create_d_flipflop(id: str | None = None, x: float = 200, y: float = 100) -> CircuitComponent:
        """Create a D flip-flop."""
        return CircuitComponent(
            id=id or f"dff-{uuid4().hex[:8]}",
            type=ComponentType.D_FLIPFLOP,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="D", name="D", type=PinType.INPUT, position=Position(x=-30, y=-15)),
                Pin(id="CLK", name="CLK", type=PinType.INPUT, position=Position(x=-30, y=15)),
                Pin(id="Q", name="Q", type=PinType.OUTPUT, position=Position(x=30, y=-15)),
                Pin(id="Q'", name="Q'", type=PinType.OUTPUT, position=Position(x=30, y=15)),
            ],
        )

    @staticmethod
    def create_clock(id: str | None = None, x: float = 100, y: float = 100) -> CircuitComponent:
        """Create a clock component."""
        return CircuitComponent(
            id=id or f"clk-{uuid4().hex[:8]}",
            type=ComponentType.CLOCK,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={"frequency": 1},
            pins=[
                Pin(id="CLK", name="CLK", type=PinType.OUTPUT, position=Position(x=25, y=0))
            ],
        )

    @staticmethod
    def create_counter_4bit(id: str | None = None, x: float = 200, y: float = 100) -> CircuitComponent:
        """Create a 4-bit counter."""
        return CircuitComponent(
            id=id or f"cnt-{uuid4().hex[:8]}",
            type=ComponentType.COUNTER_4BIT,
            position=Position(x=x, y=y),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="CLK", name="CLK", type=PinType.INPUT, position=Position(x=-40, y=0)),
                Pin(id="Q0", name="Q0", type=PinType.OUTPUT, position=Position(x=40, y=-30)),
                Pin(id="Q1", name="Q1", type=PinType.OUTPUT, position=Position(x=40, y=-10)),
                Pin(id="Q2", name="Q2", type=PinType.OUTPUT, position=Position(x=40, y=10)),
                Pin(id="Q3", name="Q3", type=PinType.OUTPUT, position=Position(x=40, y=30)),
            ],
        )


class WireFactory:
    """Factory for creating wires."""

    @staticmethod
    def create(
        from_component_id: str,
        from_pin_id: str,
        to_component_id: str,
        to_pin_id: str,
        id: str | None = None,
    ) -> Wire:
        """Create a wire between two pins."""
        return Wire(
            id=id or f"wire-{uuid4().hex[:8]}",
            fromComponentId=from_component_id,
            fromPinId=from_pin_id,
            toComponentId=to_component_id,
            toPinId=to_pin_id,
            waypoints=[],
        )


class CircuitFactory:
    """Factory for creating complete circuits."""

    @staticmethod
    def create_empty(session_id: str = "TEST123") -> CircuitState:
        """Create an empty circuit."""
        return CircuitState.create_empty(session_id)

    @staticmethod
    def create_simple_and_circuit() -> CircuitState:
        """Create: VCC -> AND.A, GND -> AND.B, AND.Y -> LED"""
        vcc = ComponentFactory.create_const_high(id="vcc-1", x=100, y=50)
        gnd = ComponentFactory.create_const_low(id="gnd-1", x=100, y=150)
        and_gate = ComponentFactory.create_and_gate(id="and-1", x=200, y=100)
        led = ComponentFactory.create_led(id="led-1", x=300, y=100)

        wires = [
            WireFactory.create("vcc-1", "OUT", "and-1", "A"),
            WireFactory.create("gnd-1", "OUT", "and-1", "B"),
            WireFactory.create("and-1", "Y", "led-1", "IN"),
        ]

        return CircuitState(
            sessionId="TEST123",
            version=1,
            schemaVersion="1.0.0",
            components=[vcc, gnd, and_gate, led],
            wires=wires,
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

    @staticmethod
    def create_simple_or_circuit() -> CircuitState:
        """Create: VCC -> OR.A, GND -> OR.B, OR.Y -> LED"""
        vcc = ComponentFactory.create_const_high(id="vcc-1", x=100, y=50)
        gnd = ComponentFactory.create_const_low(id="gnd-1", x=100, y=150)
        or_gate = ComponentFactory.create_or_gate(id="or-1", x=200, y=100)
        led = ComponentFactory.create_led(id="led-1", x=300, y=100)

        wires = [
            WireFactory.create("vcc-1", "OUT", "or-1", "A"),
            WireFactory.create("gnd-1", "OUT", "or-1", "B"),
            WireFactory.create("or-1", "Y", "led-1", "IN"),
        ]

        return CircuitState(
            sessionId="TEST123",
            version=1,
            schemaVersion="1.0.0",
            components=[vcc, gnd, or_gate, led],
            wires=wires,
            annotations=[],
            updatedAt=datetime.utcnow(),
        )


class SessionFactory:
    """Factory for creating sessions."""

    @staticmethod
    def create(code: str | None = None, creator_id: str | None = None) -> Session:
        """Create a session."""
        return Session(
            code=code or "ABC123",
            creatorParticipantId=creator_id or str(uuid4()),
            createdAt=datetime.utcnow(),
            lastActivityAt=datetime.utcnow(),
        )


class ParticipantFactory:
    """Factory for creating participants."""

    @staticmethod
    def create(
        session_code: str = "ABC123",
        id: str | None = None,
        display_name: str = "Test User",
        role: Role = Role.STUDENT,
        can_edit: bool = False,
    ) -> Participant:
        """Create a participant."""
        return Participant(
            id=id or str(uuid4()),
            sessionCode=session_code,
            displayName=display_name,
            role=role,
            canEdit=can_edit,
            color="#FF5733",
            isActive=True,
            lastSeenAt=datetime.utcnow(),
        )
