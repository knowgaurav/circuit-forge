"""Unit tests for SimulationEngine."""

from datetime import datetime

import pytest

from app.models.circuit import (
    CircuitComponent,
    CircuitState,
    ComponentType,
    Pin,
    PinType,
    Position,
    Rotation,
)
from app.services.simulation_engine import ComponentState, Signal, SimulationEngine
from tests.factories import CircuitFactory, ComponentFactory, WireFactory


class TestLogicGates:
    """Tests for logic gate truth tables - directly testing _compute_outputs."""

    def _create_gate(self, gate_type: ComponentType) -> CircuitComponent:
        """Create a gate component."""
        if gate_type == ComponentType.NOT:
            pins = [
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=0, y=0)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=0, y=0)),
            ]
        else:
            pins = [
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=0, y=0)),
                Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=0, y=0)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=0, y=0)),
            ]
        return CircuitComponent(
            id="gate-1",
            type=gate_type,
            position=Position(x=0, y=0),
            rotation=Rotation.DEG_0,
            properties={},
            pins=pins,
        )

    def _compute_gate_output(
        self, gate_type: ComponentType, inputs: dict[str, Signal]
    ) -> Signal:
        """Compute gate output using the engine's _compute_outputs method."""
        engine = SimulationEngine()
        gate = self._create_gate(gate_type)
        state = ComponentState()
        outputs = engine._compute_outputs(gate, inputs, state)
        return outputs.get("Y", Signal.X)

    # AND gate truth table
    def test_and_gate_0_0(self):
        """AND gate: 0 AND 0 = 0"""
        result = self._compute_gate_output(
            ComponentType.AND_2, {"A": Signal.LOW, "B": Signal.LOW}
        )
        assert result == Signal.LOW

    def test_and_gate_0_1(self):
        """AND gate: 0 AND 1 = 0"""
        result = self._compute_gate_output(
            ComponentType.AND_2, {"A": Signal.LOW, "B": Signal.HIGH}
        )
        assert result == Signal.LOW

    def test_and_gate_1_0(self):
        """AND gate: 1 AND 0 = 0"""
        result = self._compute_gate_output(
            ComponentType.AND_2, {"A": Signal.HIGH, "B": Signal.LOW}
        )
        assert result == Signal.LOW

    def test_and_gate_1_1(self):
        """AND gate: 1 AND 1 = 1"""
        result = self._compute_gate_output(
            ComponentType.AND_2, {"A": Signal.HIGH, "B": Signal.HIGH}
        )
        assert result == Signal.HIGH

    # OR gate truth table
    def test_or_gate_0_0(self):
        """OR gate: 0 OR 0 = 0"""
        result = self._compute_gate_output(
            ComponentType.OR_2, {"A": Signal.LOW, "B": Signal.LOW}
        )
        assert result == Signal.LOW

    def test_or_gate_0_1(self):
        """OR gate: 0 OR 1 = 1"""
        result = self._compute_gate_output(
            ComponentType.OR_2, {"A": Signal.LOW, "B": Signal.HIGH}
        )
        assert result == Signal.HIGH

    def test_or_gate_1_0(self):
        """OR gate: 1 OR 0 = 1"""
        result = self._compute_gate_output(
            ComponentType.OR_2, {"A": Signal.HIGH, "B": Signal.LOW}
        )
        assert result == Signal.HIGH

    def test_or_gate_1_1(self):
        """OR gate: 1 OR 1 = 1"""
        result = self._compute_gate_output(
            ComponentType.OR_2, {"A": Signal.HIGH, "B": Signal.HIGH}
        )
        assert result == Signal.HIGH


class TestNotGate:
    """Tests for NOT gate (inverter)."""

    def _compute_not_output(self, input_val: Signal) -> Signal:
        """Compute NOT gate output."""
        engine = SimulationEngine()
        gate = CircuitComponent(
            id="not-1",
            type=ComponentType.NOT,
            position=Position(x=0, y=0),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=0, y=0)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=0, y=0)),
            ],
        )
        state = ComponentState()
        outputs = engine._compute_outputs(gate, {"A": input_val}, state)
        return outputs.get("Y", Signal.X)

    def test_not_gate_0(self):
        """NOT gate: NOT 0 = 1"""
        assert self._compute_not_output(Signal.LOW) == Signal.HIGH

    def test_not_gate_1(self):
        """NOT gate: NOT 1 = 0"""
        assert self._compute_not_output(Signal.HIGH) == Signal.LOW


class TestNandNorXorXnorGates:
    """Tests for NAND, NOR, XOR, XNOR gates."""

    def _create_gate(self, gate_type: ComponentType) -> CircuitComponent:
        """Create a 2-input gate component."""
        return CircuitComponent(
            id="gate-1",
            type=gate_type,
            position=Position(x=0, y=0),
            rotation=Rotation.DEG_0,
            properties={},
            pins=[
                Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=0, y=0)),
                Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=0, y=0)),
                Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=0, y=0)),
            ],
        )

    def _compute_gate_output(
        self, gate_type: ComponentType, a: Signal, b: Signal
    ) -> Signal:
        """Compute gate output."""
        engine = SimulationEngine()
        gate = self._create_gate(gate_type)
        state = ComponentState()
        outputs = engine._compute_outputs(gate, {"A": a, "B": b}, state)
        return outputs.get("Y", Signal.X)

    # NAND gate tests
    def test_nand_gate_0_0(self):
        """NAND gate: NOT(0 AND 0) = 1"""
        assert self._compute_gate_output(ComponentType.NAND_2, Signal.LOW, Signal.LOW) == Signal.HIGH

    def test_nand_gate_0_1(self):
        """NAND gate: NOT(0 AND 1) = 1"""
        assert self._compute_gate_output(ComponentType.NAND_2, Signal.LOW, Signal.HIGH) == Signal.HIGH

    def test_nand_gate_1_0(self):
        """NAND gate: NOT(1 AND 0) = 1"""
        assert self._compute_gate_output(ComponentType.NAND_2, Signal.HIGH, Signal.LOW) == Signal.HIGH

    def test_nand_gate_1_1(self):
        """NAND gate: NOT(1 AND 1) = 0"""
        assert self._compute_gate_output(ComponentType.NAND_2, Signal.HIGH, Signal.HIGH) == Signal.LOW

    # NOR gate tests
    def test_nor_gate_0_0(self):
        """NOR gate: NOT(0 OR 0) = 1"""
        assert self._compute_gate_output(ComponentType.NOR_2, Signal.LOW, Signal.LOW) == Signal.HIGH

    def test_nor_gate_0_1(self):
        """NOR gate: NOT(0 OR 1) = 0"""
        assert self._compute_gate_output(ComponentType.NOR_2, Signal.LOW, Signal.HIGH) == Signal.LOW

    def test_nor_gate_1_0(self):
        """NOR gate: NOT(1 OR 0) = 0"""
        assert self._compute_gate_output(ComponentType.NOR_2, Signal.HIGH, Signal.LOW) == Signal.LOW

    def test_nor_gate_1_1(self):
        """NOR gate: NOT(1 OR 1) = 0"""
        assert self._compute_gate_output(ComponentType.NOR_2, Signal.HIGH, Signal.HIGH) == Signal.LOW

    # XOR gate tests
    def test_xor_gate_0_0(self):
        """XOR gate: 0 XOR 0 = 0"""
        assert self._compute_gate_output(ComponentType.XOR_2, Signal.LOW, Signal.LOW) == Signal.LOW

    def test_xor_gate_0_1(self):
        """XOR gate: 0 XOR 1 = 1"""
        assert self._compute_gate_output(ComponentType.XOR_2, Signal.LOW, Signal.HIGH) == Signal.HIGH

    def test_xor_gate_1_0(self):
        """XOR gate: 1 XOR 0 = 1"""
        assert self._compute_gate_output(ComponentType.XOR_2, Signal.HIGH, Signal.LOW) == Signal.HIGH

    def test_xor_gate_1_1(self):
        """XOR gate: 1 XOR 1 = 0"""
        assert self._compute_gate_output(ComponentType.XOR_2, Signal.HIGH, Signal.HIGH) == Signal.LOW

    # XNOR gate tests
    def test_xnor_gate_0_0(self):
        """XNOR gate: NOT(0 XOR 0) = 1"""
        assert self._compute_gate_output(ComponentType.XNOR_2, Signal.LOW, Signal.LOW) == Signal.HIGH

    def test_xnor_gate_0_1(self):
        """XNOR gate: NOT(0 XOR 1) = 0"""
        assert self._compute_gate_output(ComponentType.XNOR_2, Signal.LOW, Signal.HIGH) == Signal.LOW

    def test_xnor_gate_1_0(self):
        """XNOR gate: NOT(1 XOR 0) = 0"""
        assert self._compute_gate_output(ComponentType.XNOR_2, Signal.HIGH, Signal.LOW) == Signal.LOW

    def test_xnor_gate_1_1(self):
        """XNOR gate: NOT(1 XOR 1) = 1"""
        assert self._compute_gate_output(ComponentType.XNOR_2, Signal.HIGH, Signal.HIGH) == Signal.HIGH


class TestDFlipFlop:
    """Tests for D flip-flop rising edge capture."""

    def _create_dff_circuit(self) -> tuple[CircuitState, str, str]:
        """Create a circuit with D flip-flop connected to switches."""
        d_switch = ComponentFactory.create_switch(id="d-switch", state=False)
        clk_switch = ComponentFactory.create_switch(id="clk-switch", state=False)
        dff = ComponentFactory.create_d_flipflop(id="dff-1")
        led_q = ComponentFactory.create_led(id="led-q")

        wires = [
            WireFactory.create("d-switch", "OUT", "dff-1", "D"),
            WireFactory.create("clk-switch", "OUT", "dff-1", "CLK"),
            WireFactory.create("dff-1", "Q", "led-q", "IN"),
        ]

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[d_switch, clk_switch, dff, led_q],
            wires=wires,
            annotations=[],
            updatedAt=datetime.utcnow(),
        )
        return circuit, "d-switch", "clk-switch"

    def test_dff_captures_on_rising_edge(self):
        """D flip-flop captures D input on rising clock edge."""
        circuit, d_switch_id, clk_switch_id = self._create_dff_circuit()

        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()

        # Initial state: Q should be LOW
        assert engine.pin_values.get("dff-1:Q") == Signal.LOW

        # Set D=1, CLK still LOW
        engine.set_input(d_switch_id, True)
        engine.run()
        # Q should still be LOW (no clock edge yet)
        assert engine.pin_values.get("dff-1:Q") == Signal.LOW

        # Rising edge: CLK goes HIGH
        engine.set_input(clk_switch_id, True)
        engine.run()
        # Q should now capture D=1
        assert engine.pin_values.get("dff-1:Q") == Signal.HIGH

    def test_dff_holds_value_without_clock_edge(self):
        """D flip-flop holds value when no rising edge occurs."""
        circuit, d_switch_id, clk_switch_id = self._create_dff_circuit()

        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()

        # Set D=1 and trigger rising edge
        engine.set_input(d_switch_id, True)
        engine.set_input(clk_switch_id, True)
        engine.run()
        assert engine.pin_values.get("dff-1:Q") == Signal.HIGH

        # Change D to 0 while CLK is still HIGH (no rising edge)
        engine.set_input(d_switch_id, False)
        engine.run()
        # Q should still be HIGH (no rising edge)
        assert engine.pin_values.get("dff-1:Q") == Signal.HIGH

    def test_dff_captures_low_on_rising_edge(self):
        """D flip-flop captures D=0 on rising clock edge."""
        circuit, d_switch_id, clk_switch_id = self._create_dff_circuit()

        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()

        # First, set Q=1 by capturing D=1
        engine.set_input(d_switch_id, True)
        engine.set_input(clk_switch_id, True)
        engine.run()
        assert engine.pin_values.get("dff-1:Q") == Signal.HIGH

        # Reset clock
        engine.set_input(clk_switch_id, False)
        engine.run()

        # Set D=0 and trigger rising edge
        engine.set_input(d_switch_id, False)
        engine.set_input(clk_switch_id, True)
        engine.run()
        # Q should now be LOW
        assert engine.pin_values.get("dff-1:Q") == Signal.LOW


class TestSignalPropagation:
    """Tests for signal propagation through wires."""

    def test_signal_propagates_via_wire_states(self):
        """Signal propagates from output to wire."""
        vcc = ComponentFactory.create_const_high(id="vcc-1")
        led = ComponentFactory.create_led(id="led-1")

        wire = WireFactory.create("vcc-1", "OUT", "led-1", "IN")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[vcc, led],
            wires=[wire],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()

        # Check wire state - the wire carries the signal from VCC
        wire_states = engine.get_wire_states()
        assert wire_states.get(wire.id) == "1"

    def test_switch_toggle_propagates(self):
        """Toggling a switch propagates the new signal."""
        switch = ComponentFactory.create_switch(id="sw-1", state=False)
        led = ComponentFactory.create_led(id="led-1")

        wire = WireFactory.create("sw-1", "OUT", "led-1", "IN")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[switch, led],
            wires=[wire],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()

        # Initial: switch OFF -> wire carries LOW
        wire_states = engine.get_wire_states()
        assert wire_states.get(wire.id) == "0"

        # Toggle switch ON
        engine.toggle_switch("sw-1")
        engine.run()
        wire_states = engine.get_wire_states()
        assert wire_states.get(wire.id) == "1"

        # Toggle switch OFF again
        engine.toggle_switch("sw-1")
        engine.run()
        wire_states = engine.get_wire_states()
        assert wire_states.get(wire.id) == "0"

    def test_const_low_propagates(self):
        """Constant LOW propagates through wire."""
        gnd = ComponentFactory.create_const_low(id="gnd-1")
        led = ComponentFactory.create_led(id="led-1")

        wire = WireFactory.create("gnd-1", "OUT", "led-1", "IN")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[gnd, led],
            wires=[wire],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()

        wire_states = engine.get_wire_states()
        assert wire_states.get(wire.id) == "0"


class TestCounter4Bit:
    """Tests for 4-bit counter increment."""

    def _create_counter_circuit(self) -> CircuitState:
        """Create a circuit with clock -> counter."""
        clock = ComponentFactory.create_clock(id="clk-1")
        counter = ComponentFactory.create_counter_4bit(id="cnt-1")

        wire = WireFactory.create("clk-1", "CLK", "cnt-1", "CLK")

        return CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[clock, counter],
            wires=[wire],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

    def test_counter_initial_state(self):
        """Counter starts at 0."""
        circuit = self._create_counter_circuit()

        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()

        # Initial count = 0 (binary 0000)
        assert engine.pin_values.get("cnt-1:Q0") == Signal.LOW
        assert engine.pin_values.get("cnt-1:Q1") == Signal.LOW
        assert engine.pin_values.get("cnt-1:Q2") == Signal.LOW
        assert engine.pin_values.get("cnt-1:Q3") == Signal.LOW

    def test_counter_increments_on_clock(self):
        """Counter increments on each rising clock edge."""
        circuit = self._create_counter_circuit()

        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()

        # Tick clock: LOW -> HIGH (rising edge) -> count = 1
        engine.tick_clock("clk-1")
        engine.run()
        assert engine.pin_values.get("cnt-1:Q0") == Signal.HIGH  # bit 0 = 1
        assert engine.pin_values.get("cnt-1:Q1") == Signal.LOW   # bit 1 = 0
        assert engine.pin_values.get("cnt-1:Q2") == Signal.LOW   # bit 2 = 0
        assert engine.pin_values.get("cnt-1:Q3") == Signal.LOW   # bit 3 = 0

        # Tick again: HIGH -> LOW (falling edge, no change)
        engine.tick_clock("clk-1")
        engine.run()
        # Still count = 1
        assert engine.pin_values.get("cnt-1:Q0") == Signal.HIGH

        # Tick again: LOW -> HIGH (rising edge) -> count = 2
        engine.tick_clock("clk-1")
        engine.run()
        assert engine.pin_values.get("cnt-1:Q0") == Signal.LOW   # bit 0 = 0
        assert engine.pin_values.get("cnt-1:Q1") == Signal.HIGH  # bit 1 = 1
        assert engine.pin_values.get("cnt-1:Q2") == Signal.LOW   # bit 2 = 0
        assert engine.pin_values.get("cnt-1:Q3") == Signal.LOW   # bit 3 = 0

    def test_counter_wraps_at_16(self):
        """Counter wraps from 15 back to 0."""
        circuit = self._create_counter_circuit()

        engine = SimulationEngine()
        engine.load_circuit(circuit)
        engine.run()

        # Manually set counter internal state to 15
        engine.states["cnt-1"].internal["count"] = 15
        engine.states["cnt-1"].internal["prev_clk"] = Signal.LOW

        # Tick clock to trigger increment
        engine.tick_clock("clk-1")
        engine.run()

        # Should wrap to 0
        assert engine.pin_values.get("cnt-1:Q0") == Signal.LOW
        assert engine.pin_values.get("cnt-1:Q1") == Signal.LOW
        assert engine.pin_values.get("cnt-1:Q2") == Signal.LOW
        assert engine.pin_values.get("cnt-1:Q3") == Signal.LOW
