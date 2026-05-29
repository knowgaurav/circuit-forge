"""Unit tests for agent tool Pydantic schemas.

Validates that each tool's args/result models accept well-formed input and
reject obvious violations, plus the integrity of the ``TOOL_SCHEMAS``
registry.
"""

import pytest
from pydantic import BaseModel, ValidationError

from app.models.circuit import (
    CircuitComponent,
    ComponentType,
    Pin,
    PinType,
    Position,
    Rotation,
    Wire,
)
from app.services.agent.schemas import (
    TOOL_SCHEMAS,
    AddComponentArgs,
    AddComponentResult,
    ExplainSignalPathArgs,
    ExplainSignalPathResult,
    GetCircuitStateArgs,
    GetCircuitStateResult,
    PathStep,
    PinRef,
    RemoveComponentArgs,
    RemoveComponentResult,
    SimulateArgs,
    SimulateResult,
    ValidateCircuitArgs,
    ValidateCircuitResult,
    WireRef,
)
from app.services.simulation_engine import Signal


def _component() -> CircuitComponent:
    return CircuitComponent(
        id="comp-1",
        type=ComponentType.AND_2,
        position=Position(x=0, y=0),
        rotation=Rotation.DEG_0,
        properties={},
        pins=[
            Pin(id="A", name="A", type=PinType.INPUT, position=Position(x=0, y=0)),
            Pin(id="B", name="B", type=PinType.INPUT, position=Position(x=0, y=0)),
            Pin(id="Y", name="Y", type=PinType.OUTPUT, position=Position(x=0, y=0)),
        ],
    )


def _wire() -> Wire:
    return Wire(
        id="wire-1",
        fromComponentId="comp-1",
        fromPinId="Y",
        toComponentId="comp-2",
        toPinId="A",
    )


# ---------------------------------------------------------------------------
# get_circuit_state
# ---------------------------------------------------------------------------


class TestGetCircuitState:
    def test_args_and_result_parse(self) -> None:
        args = GetCircuitStateArgs(session_id="ABC123")
        assert args.session_id == "ABC123"

        result = GetCircuitStateResult(components=[_component()], wires=[_wire()])
        assert len(result.components) == 1
        assert len(result.wires) == 1

    def test_args_rejects_missing_session_id(self) -> None:
        with pytest.raises(ValidationError):
            GetCircuitStateArgs()  # type: ignore[call-arg]


# ---------------------------------------------------------------------------
# simulate
# ---------------------------------------------------------------------------


class TestSimulate:
    def test_args_and_result_parse(self) -> None:
        args = SimulateArgs(session_id="ABC123", ticks=0)
        assert args.ticks == 0

        result = SimulateResult(
            pin_states={"comp-1": {"Y": Signal.HIGH}},
            wire_states={"wire-1": Signal.LOW},
            errors=[],
        )
        assert result.pin_states["comp-1"]["Y"] == Signal.HIGH
        assert result.wire_states["wire-1"] == Signal.LOW

    def test_args_rejects_negative_ticks(self) -> None:
        with pytest.raises(ValidationError):
            SimulateArgs(session_id="ABC123", ticks=-1)


# ---------------------------------------------------------------------------
# add_component
# ---------------------------------------------------------------------------


class TestAddComponent:
    def test_args_and_result_parse(self) -> None:
        args = AddComponentArgs(
            session_id="ABC123",
            actor_id="participant-1",
            component_type="AND_2",
            label="U1",
            position=Position(x=10, y=20),
        )
        assert args.position.x == 10

        result = AddComponentResult(component_id="comp-1", seq=1)
        assert result.seq == 1

    def test_args_rejects_missing_position(self) -> None:
        with pytest.raises(ValidationError):
            AddComponentArgs(  # type: ignore[call-arg]
                session_id="ABC123",
                actor_id="participant-1",
                component_type="AND_2",
                label="U1",
            )


# ---------------------------------------------------------------------------
# remove_component
# ---------------------------------------------------------------------------


class TestRemoveComponent:
    def test_args_and_result_parse(self) -> None:
        args = RemoveComponentArgs(
            session_id="ABC123",
            actor_id="participant-1",
            component_id="comp-1",
        )
        assert args.component_id == "comp-1"

        result = RemoveComponentResult(seq=2)
        assert result.seq == 2

    def test_result_rejects_seq_below_one(self) -> None:
        with pytest.raises(ValidationError):
            RemoveComponentResult(seq=0)


# ---------------------------------------------------------------------------
# validate_circuit
# ---------------------------------------------------------------------------


class TestValidateCircuit:
    def test_args_and_result_parse(self) -> None:
        args = ValidateCircuitArgs(session_id="ABC123")
        assert args.session_id == "ABC123"

        result = ValidateCircuitResult(
            floating_inputs=[PinRef(component_id="comp-1", pin_id="A")],
            output_conflicts=[WireRef(wire_id="wire-1")],
            combinational_cycles=[["comp-1", "comp-2", "comp-1"]],
        )
        assert result.floating_inputs[0].pin_id == "A"
        assert result.output_conflicts[0].wire_id == "wire-1"
        assert result.combinational_cycles[0][0] == "comp-1"

    def test_result_rejects_pinref_missing_pin_id(self) -> None:
        with pytest.raises(ValidationError):
            ValidateCircuitResult(
                floating_inputs=[{"component_id": "comp-1"}],  # type: ignore[list-item]
                output_conflicts=[],
                combinational_cycles=[],
            )


# ---------------------------------------------------------------------------
# explain_signal_path
# ---------------------------------------------------------------------------


class TestExplainSignalPath:
    def test_args_and_result_parse(self) -> None:
        args = ExplainSignalPathArgs(
            session_id="ABC123", from_id="comp-1", to_id="comp-2"
        )
        assert args.from_id == "comp-1"

        result = ExplainSignalPathResult(
            path=[PathStep(component_id="comp-1", pin_id="Y", signal=Signal.HIGH)],
            reachable=True,
        )
        assert result.reachable is True
        assert result.path[0].signal == Signal.HIGH

    def test_args_rejects_missing_to_id(self) -> None:
        with pytest.raises(ValidationError):
            ExplainSignalPathArgs(  # type: ignore[call-arg]
                session_id="ABC123", from_id="comp-1"
            )


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


def test_tool_schemas_registry_has_exact_six_entries() -> None:
    expected = {
        "get_circuit_state",
        "simulate",
        "add_component",
        "remove_component",
        "validate_circuit",
        "explain_signal_path",
    }
    assert set(TOOL_SCHEMAS.keys()) == expected
    assert len(TOOL_SCHEMAS) == 6
    for name, (args_cls, result_cls) in TOOL_SCHEMAS.items():
        assert issubclass(args_cls, BaseModel), name
        assert issubclass(result_cls, BaseModel), name
