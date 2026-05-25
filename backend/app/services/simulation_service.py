"""Circuit simulation service.

Thin adapter over `SimulationEngine` that produces the legacy `SignalState`
representation expected by the validation/result layer.
"""

from dataclasses import dataclass, field
from enum import Enum

from app.models.circuit import CircuitComponent, CircuitState, ComponentType, Wire
from app.services.simulation_engine import Signal, SimulationEngine


class SignalState(str, Enum):
    HIGH = "HIGH"
    LOW = "LOW"
    UNDEFINED = "UNDEFINED"
    ERROR = "ERROR"


_TO_LEGACY = {
    Signal.HIGH: SignalState.HIGH,
    Signal.LOW: SignalState.LOW,
    Signal.X: SignalState.UNDEFINED,
}


@dataclass
class SimulationError:
    error_type: str
    message: str
    component_id: str | None = None
    pin_id: str | None = None


@dataclass
class SimulationResult:
    success: bool
    wire_states: dict[str, SignalState] = field(default_factory=dict)
    pin_states: dict[str, dict[str, SignalState]] = field(default_factory=dict)
    errors: list[SimulationError] = field(default_factory=list)


class LogicGate:
    """Logic gate truth tables in legacy SignalState. Kept for API compatibility."""

    @staticmethod
    def evaluate_and(inputs: list[SignalState]) -> SignalState:
        if SignalState.UNDEFINED in inputs or SignalState.ERROR in inputs:
            return SignalState.UNDEFINED
        return (
            SignalState.HIGH
            if all(s == SignalState.HIGH for s in inputs)
            else SignalState.LOW
        )

    @staticmethod
    def evaluate_or(inputs: list[SignalState]) -> SignalState:
        if SignalState.UNDEFINED in inputs or SignalState.ERROR in inputs:
            return SignalState.UNDEFINED
        return (
            SignalState.HIGH
            if any(s == SignalState.HIGH for s in inputs)
            else SignalState.LOW
        )

    @staticmethod
    def evaluate_not(input_signal: SignalState) -> SignalState:
        if input_signal == SignalState.HIGH:
            return SignalState.LOW
        if input_signal == SignalState.LOW:
            return SignalState.HIGH
        return SignalState.UNDEFINED

    @staticmethod
    def evaluate_nand(inputs: list[SignalState]) -> SignalState:
        return LogicGate.evaluate_not(LogicGate.evaluate_and(inputs))

    @staticmethod
    def evaluate_nor(inputs: list[SignalState]) -> SignalState:
        return LogicGate.evaluate_not(LogicGate.evaluate_or(inputs))

    @staticmethod
    def evaluate_xor(inputs: list[SignalState]) -> SignalState:
        if len(inputs) != 2:
            return SignalState.UNDEFINED
        if SignalState.UNDEFINED in inputs or SignalState.ERROR in inputs:
            return SignalState.UNDEFINED
        return SignalState.HIGH if inputs[0] != inputs[1] else SignalState.LOW

    @staticmethod
    def evaluate_xnor(inputs: list[SignalState]) -> SignalState:
        return LogicGate.evaluate_not(LogicGate.evaluate_xor(inputs))

    @staticmethod
    def evaluate_buffer(input_signal: SignalState) -> SignalState:
        return input_signal


class SimulationService:
    """Validate a circuit, run the engine, return a `SimulationResult`."""

    INPUT_DEVICES = {
        ComponentType.SWITCH_TOGGLE,
        ComponentType.SWITCH_PUSH,
        ComponentType.CONST_HIGH,
        ComponentType.CONST_LOW,
        ComponentType.CLOCK,
        ComponentType.DIP_SWITCH_4,
        ComponentType.NUMERIC_INPUT,
    }

    def simulate(self, circuit: CircuitState) -> SimulationResult:
        errors = self._validate(circuit)
        if errors:
            return SimulationResult(success=False, errors=errors)
        if self._has_cycle(circuit):
            return SimulationResult(
                success=False,
                errors=[
                    SimulationError(
                        error_type="CYCLE_DETECTED",
                        message="Circuit contains a cycle - cannot simulate",
                    )
                ],
            )
        engine = SimulationEngine()
        engine.load_circuit(circuit)
        pin_states: dict[str, dict[str, SignalState]] = {
            c.id: {} for c in circuit.components
        }
        for cid, pins in engine.get_pin_states().items():
            pin_states[cid] = {pid: _TO_LEGACY[Signal(v)] for pid, v in pins.items()}
        for c in circuit.components:
            pin_states.setdefault(c.id, {})
        wire_states = {
            wid: _TO_LEGACY[Signal(v)] for wid, v in engine.get_wire_states().items()
        }
        return SimulationResult(
            success=True, wire_states=wire_states, pin_states=pin_states
        )

    def _validate(self, circuit: CircuitState) -> list[SimulationError]:
        errors: list[SimulationError] = []
        connected: set[tuple[str, str]] = set()
        drivers: dict[tuple[str, str], list[str]] = {}
        for w in circuit.wires:
            key = (w.to_component_id, w.to_pin_id)
            connected.add(key)
            drivers.setdefault(key, []).append(w.from_component_id)
        for c in circuit.components:
            if c.type in self.INPUT_DEVICES:
                continue
            for pin in c.pins:
                if pin.type.value == "input" and (c.id, pin.id) not in connected:
                    errors.append(
                        SimulationError(
                            error_type="FLOATING_INPUT",
                            message=f"Floating Input: Input pin '{pin.name}' has no connection",
                            component_id=c.id,
                            pin_id=pin.id,
                        )
                    )
        for (cid, pid), srcs in drivers.items():
            if len(set(srcs)) > 1:
                comp = next((c for c in circuit.components if c.id == cid), None)
                pin_name = (
                    next((p.name for p in comp.pins if p.id == pid), pid)
                    if comp
                    else pid
                )
                errors.append(
                    SimulationError(
                        error_type="OUTPUT_CONFLICT",
                        message=f"Output Conflict: {cid} pin '{pin_name}' has multiple drivers",
                        component_id=cid,
                        pin_id=pid,
                    )
                )
        return errors

    def _has_cycle(self, circuit: CircuitState) -> bool:
        adj: dict[str, list[str]] = {c.id: [] for c in circuit.components}
        indeg = {c.id: 0 for c in circuit.components}
        seen: set[tuple[str, str]] = set()
        for w in circuit.wires:
            edge = (w.from_component_id, w.to_component_id)
            if edge in seen:
                continue
            seen.add(edge)
            adj[w.from_component_id].append(w.to_component_id)
            indeg[w.to_component_id] += 1
        q = [cid for cid, d in indeg.items() if d == 0]
        visited = 0
        while q:
            cur = q.pop(0)
            visited += 1
            for nxt in adj[cur]:
                indeg[nxt] -= 1
                if indeg[nxt] == 0:
                    q.append(nxt)
        return visited != len(circuit.components)


simulation_service = SimulationService()
