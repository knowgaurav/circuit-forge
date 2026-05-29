"""Pydantic schemas for the six agent tools.

Source of truth: ``.kiro/specs/system-design-improvement/contracts.md`` →
"Story B — Agent surface". Every tool exposes an ``Args`` and a ``Result``
model. The ``TOOL_SCHEMAS`` registry maps tool name → (args, result) so the
orchestrator can validate calls and parse responses without hand-rolling
dispatch logic.

Field types are strict: required-only, no ``Optional`` shims. Existing types
from ``app.models.circuit`` and ``app.services.simulation_engine`` are reused
rather than redefined.
"""

from pydantic import BaseModel, Field

from app.models.circuit import CircuitComponent, Position, Wire
from app.services.simulation_engine import Signal

# ---------------------------------------------------------------------------
# Shared helper types
# ---------------------------------------------------------------------------


class PinRef(BaseModel):
    """Reference to a specific pin on a component."""

    component_id: str
    pin_id: str


class WireRef(BaseModel):
    """Reference to a specific wire."""

    wire_id: str


class PathStep(BaseModel):
    """One node along a traced signal path."""

    component_id: str
    pin_id: str
    signal: Signal


# ---------------------------------------------------------------------------
# get_circuit_state
# ---------------------------------------------------------------------------


class GetCircuitStateArgs(BaseModel):
    session_id: str


class GetCircuitStateResult(BaseModel):
    components: list[CircuitComponent]
    wires: list[Wire]


# ---------------------------------------------------------------------------
# simulate
# ---------------------------------------------------------------------------


class SimulateArgs(BaseModel):
    session_id: str
    ticks: int = Field(ge=0)


class SimulateResult(BaseModel):
    pin_states: dict[str, dict[str, Signal]]
    wire_states: dict[str, Signal]
    errors: list[str]


# ---------------------------------------------------------------------------
# add_component
# ---------------------------------------------------------------------------


class AddComponentArgs(BaseModel):
    session_id: str
    actor_id: str
    component_type: str
    label: str
    position: Position


class AddComponentResult(BaseModel):
    component_id: str
    seq: int = Field(ge=1)


# ---------------------------------------------------------------------------
# remove_component
# ---------------------------------------------------------------------------


class RemoveComponentArgs(BaseModel):
    session_id: str
    actor_id: str
    component_id: str


class RemoveComponentResult(BaseModel):
    seq: int = Field(ge=1)


# ---------------------------------------------------------------------------
# validate_circuit
# ---------------------------------------------------------------------------


class ValidateCircuitArgs(BaseModel):
    session_id: str


class ValidateCircuitResult(BaseModel):
    floating_inputs: list[PinRef]
    output_conflicts: list[WireRef]
    combinational_cycles: list[list[str]]


# ---------------------------------------------------------------------------
# explain_signal_path
# ---------------------------------------------------------------------------


class ExplainSignalPathArgs(BaseModel):
    session_id: str
    from_id: str
    to_id: str


class ExplainSignalPathResult(BaseModel):
    path: list[PathStep]
    reachable: bool


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------


TOOL_SCHEMAS: dict[str, tuple[type[BaseModel], type[BaseModel]]] = {
    "get_circuit_state": (GetCircuitStateArgs, GetCircuitStateResult),
    "simulate": (SimulateArgs, SimulateResult),
    "add_component": (AddComponentArgs, AddComponentResult),
    "remove_component": (RemoveComponentArgs, RemoveComponentResult),
    "validate_circuit": (ValidateCircuitArgs, ValidateCircuitResult),
    "explain_signal_path": (ExplainSignalPathArgs, ExplainSignalPathResult),
}
