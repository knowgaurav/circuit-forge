"""Unit tests for SimulationService.

Tests circuit validation, topological sorting, and logic gate evaluation.
"""

import pytest

from app.services.simulation_service import (
    LogicGate,
    SignalState,
    SimulationService,
    simulation_service,
)
from tests.factories import CircuitFactory, ComponentFactory, WireFactory
from app.models.circuit import CircuitState
from datetime import datetime


class TestLogicGate:
    """Tests for LogicGate static methods."""

    def test_and_gate_00(self):
        """AND: 0 AND 0 = 0"""
        result = LogicGate.evaluate_and([SignalState.LOW, SignalState.LOW])
        assert result == SignalState.LOW

    def test_and_gate_01(self):
        """AND: 0 AND 1 = 0"""
        result = LogicGate.evaluate_and([SignalState.LOW, SignalState.HIGH])
        assert result == SignalState.LOW

    def test_and_gate_10(self):
        """AND: 1 AND 0 = 0"""
        result = LogicGate.evaluate_and([SignalState.HIGH, SignalState.LOW])
        assert result == SignalState.LOW

    def test_and_gate_11(self):
        """AND: 1 AND 1 = 1"""
        result = LogicGate.evaluate_and([SignalState.HIGH, SignalState.HIGH])
        assert result == SignalState.HIGH

    def test_or_gate_00(self):
        """OR: 0 OR 0 = 0"""
        result = LogicGate.evaluate_or([SignalState.LOW, SignalState.LOW])
        assert result == SignalState.LOW

    def test_or_gate_01(self):
        """OR: 0 OR 1 = 1"""
        result = LogicGate.evaluate_or([SignalState.LOW, SignalState.HIGH])
        assert result == SignalState.HIGH

    def test_or_gate_10(self):
        """OR: 1 OR 0 = 1"""
        result = LogicGate.evaluate_or([SignalState.HIGH, SignalState.LOW])
        assert result == SignalState.HIGH

    def test_or_gate_11(self):
        """OR: 1 OR 1 = 1"""
        result = LogicGate.evaluate_or([SignalState.HIGH, SignalState.HIGH])
        assert result == SignalState.HIGH

    def test_not_gate_0(self):
        """NOT: NOT 0 = 1"""
        result = LogicGate.evaluate_not(SignalState.LOW)
        assert result == SignalState.HIGH

    def test_not_gate_1(self):
        """NOT: NOT 1 = 0"""
        result = LogicGate.evaluate_not(SignalState.HIGH)
        assert result == SignalState.LOW

    def test_nand_gate_00(self):
        """NAND: NOT(0 AND 0) = 1"""
        result = LogicGate.evaluate_nand([SignalState.LOW, SignalState.LOW])
        assert result == SignalState.HIGH

    def test_nand_gate_11(self):
        """NAND: NOT(1 AND 1) = 0"""
        result = LogicGate.evaluate_nand([SignalState.HIGH, SignalState.HIGH])
        assert result == SignalState.LOW

    def test_nor_gate_00(self):
        """NOR: NOT(0 OR 0) = 1"""
        result = LogicGate.evaluate_nor([SignalState.LOW, SignalState.LOW])
        assert result == SignalState.HIGH

    def test_nor_gate_11(self):
        """NOR: NOT(1 OR 1) = 0"""
        result = LogicGate.evaluate_nor([SignalState.HIGH, SignalState.HIGH])
        assert result == SignalState.LOW

    def test_xor_gate_00(self):
        """XOR: 0 XOR 0 = 0"""
        result = LogicGate.evaluate_xor([SignalState.LOW, SignalState.LOW])
        assert result == SignalState.LOW

    def test_xor_gate_01(self):
        """XOR: 0 XOR 1 = 1"""
        result = LogicGate.evaluate_xor([SignalState.LOW, SignalState.HIGH])
        assert result == SignalState.HIGH

    def test_xor_gate_10(self):
        """XOR: 1 XOR 0 = 1"""
        result = LogicGate.evaluate_xor([SignalState.HIGH, SignalState.LOW])
        assert result == SignalState.HIGH

    def test_xor_gate_11(self):
        """XOR: 1 XOR 1 = 0"""
        result = LogicGate.evaluate_xor([SignalState.HIGH, SignalState.HIGH])
        assert result == SignalState.LOW

    def test_xnor_gate_00(self):
        """XNOR: NOT(0 XOR 0) = 1"""
        result = LogicGate.evaluate_xnor([SignalState.LOW, SignalState.LOW])
        assert result == SignalState.HIGH

    def test_xnor_gate_11(self):
        """XNOR: NOT(1 XOR 1) = 1"""
        result = LogicGate.evaluate_xnor([SignalState.HIGH, SignalState.HIGH])
        assert result == SignalState.HIGH

    def test_buffer(self):
        """Buffer passes signal through."""
        assert LogicGate.evaluate_buffer(SignalState.HIGH) == SignalState.HIGH
        assert LogicGate.evaluate_buffer(SignalState.LOW) == SignalState.LOW

    def test_undefined_input_propagates(self):
        """Undefined input propagates to output."""
        result = LogicGate.evaluate_and([SignalState.HIGH, SignalState.UNDEFINED])
        assert result == SignalState.UNDEFINED


class TestSimulationServiceValidation:
    """Tests for circuit validation."""

    def test_detects_floating_input(self):
        """Detects input pins with no connection."""
        service = SimulationService()

        # AND gate with no inputs connected
        and_gate = ComponentFactory.create_and_gate(id="and1")
        led = ComponentFactory.create_led(id="led1")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[and_gate, led],
            wires=[
                WireFactory.create("and1", "Y", "led1", "IN"),
            ],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        result = service.simulate(circuit)

        assert result.success is False
        assert any(e.error_type == "FLOATING_INPUT" for e in result.errors)

    def test_valid_circuit_simulates_successfully(self):
        """Valid circuit simulates without errors."""
        service = SimulationService()
        circuit = CircuitFactory.create_simple_and_circuit()

        result = service.simulate(circuit)

        assert result.success is True
        assert len(result.errors) == 0

    def test_and_gate_with_vcc_and_gnd(self):
        """AND gate with VCC and GND outputs LOW."""
        service = SimulationService()
        circuit = CircuitFactory.create_simple_and_circuit()

        result = service.simulate(circuit)

        assert result.success is True
        # VCC (HIGH) AND GND (LOW) = LOW
        assert result.pin_states["and-1"]["Y"] == SignalState.LOW

    def test_or_gate_with_vcc_and_gnd(self):
        """OR gate with VCC and GND outputs HIGH."""
        service = SimulationService()
        circuit = CircuitFactory.create_simple_or_circuit()

        result = service.simulate(circuit)

        assert result.success is True
        # VCC (HIGH) OR GND (LOW) = HIGH
        assert result.pin_states["or-1"]["Y"] == SignalState.HIGH

    def test_detects_output_conflict(self):
        """Detects multiple outputs driving the same input pin."""
        service = SimulationService()

        # Two VCC sources both driving the same LED input
        vcc1 = ComponentFactory.create_const_high(id="vcc1")
        vcc2 = ComponentFactory.create_const_high(id="vcc2")
        led = ComponentFactory.create_led(id="led1")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[vcc1, vcc2, led],
            wires=[
                WireFactory.create("vcc1", "OUT", "led1", "IN"),
                WireFactory.create("vcc2", "OUT", "led1", "IN"),
            ],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        result = service.simulate(circuit)

        assert result.success is False
        assert any(e.error_type == "OUTPUT_CONFLICT" for e in result.errors)


class TestSimulationServiceTopologicalSort:
    """Tests for topological sorting."""

    def test_evaluates_in_correct_order(self):
        """Components are evaluated in topological order."""
        service = SimulationService()

        # Create: VCC -> NOT -> LED
        vcc = ComponentFactory.create_const_high(id="vcc1")
        not_gate = ComponentFactory.create_not_gate(id="not1")
        led = ComponentFactory.create_led(id="led1")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[vcc, not_gate, led],
            wires=[
                WireFactory.create("vcc1", "OUT", "not1", "A"),
                WireFactory.create("not1", "Y", "led1", "IN"),
            ],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        result = service.simulate(circuit)

        assert result.success is True
        # VCC=HIGH -> NOT=LOW
        assert result.pin_states["not1"]["Y"] == SignalState.LOW

    def test_cycle_detection_raises_error(self):
        """Cycle in circuit raises error."""
        service = SimulationService()

        # Create a cycle: NOT1 -> NOT2 -> NOT1 (feedback loop)
        not1 = ComponentFactory.create_not_gate(id="not1")
        not2 = ComponentFactory.create_not_gate(id="not2")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[not1, not2],
            wires=[
                WireFactory.create("not1", "Y", "not2", "A"),
                WireFactory.create("not2", "Y", "not1", "A"),
            ],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        result = service.simulate(circuit)

        assert result.success is False
        assert any(e.error_type == "CYCLE_DETECTED" for e in result.errors)


class TestSimulationServiceInputDevices:
    """Tests for input device initialization."""

    def test_const_high_outputs_high(self):
        """CONST_HIGH outputs HIGH signal."""
        service = SimulationService()

        vcc = ComponentFactory.create_const_high(id="vcc1")
        led = ComponentFactory.create_led(id="led1")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[vcc, led],
            wires=[
                WireFactory.create("vcc1", "OUT", "led1", "IN"),
            ],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        result = service.simulate(circuit)

        assert result.success is True
        assert result.pin_states["vcc1"]["OUT"] == SignalState.HIGH

    def test_const_low_outputs_low(self):
        """CONST_LOW outputs LOW signal."""
        service = SimulationService()

        gnd = ComponentFactory.create_const_low(id="gnd1")
        led = ComponentFactory.create_led(id="led1")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[gnd, led],
            wires=[
                WireFactory.create("gnd1", "OUT", "led1", "IN"),
            ],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        result = service.simulate(circuit)

        assert result.success is True
        assert result.pin_states["gnd1"]["OUT"] == SignalState.LOW

    def test_switch_off_outputs_low(self):
        """Switch in OFF state outputs LOW."""
        service = SimulationService()

        switch = ComponentFactory.create_switch(id="sw1", state=False)
        led = ComponentFactory.create_led(id="led1")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[switch, led],
            wires=[
                WireFactory.create("sw1", "OUT", "led1", "IN"),
            ],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        result = service.simulate(circuit)

        assert result.success is True
        assert result.pin_states["sw1"]["OUT"] == SignalState.LOW

    def test_switch_on_outputs_high(self):
        """Switch in ON state outputs HIGH."""
        service = SimulationService()

        switch = ComponentFactory.create_switch(id="sw1", state=True)
        led = ComponentFactory.create_led(id="led1")

        circuit = CircuitState(
            sessionId="TEST",
            version=1,
            schemaVersion="1.0.0",
            components=[switch, led],
            wires=[
                WireFactory.create("sw1", "OUT", "led1", "IN"),
            ],
            annotations=[],
            updatedAt=datetime.utcnow(),
        )

        result = service.simulate(circuit)

        assert result.success is True
        assert result.pin_states["sw1"]["OUT"] == SignalState.HIGH
