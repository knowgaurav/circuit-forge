"""Circuit simulation service with logic gate evaluation."""

from dataclasses import dataclass, field
from enum import Enum

from app.models.circuit import CircuitComponent, CircuitState, ComponentType, Wire


class SignalState(str, Enum):
    """Signal state on a wire."""
    HIGH = "HIGH"
    LOW = "LOW"
    UNDEFINED = "UNDEFINED"
    ERROR = "ERROR"


@dataclass
class SimulationError:
    """Represents a simulation error."""
    error_type: str
    message: str
    component_id: str | None = None
    pin_id: str | None = None


@dataclass
class SimulationResult:
    """Result of circuit simulation."""
    success: bool
    wire_states: dict[str, SignalState] = field(default_factory=dict)
    pin_states: dict[str, dict[str, SignalState]] = field(default_factory=dict)
    errors: list[SimulationError] = field(default_factory=list)


class LogicGate:
    """Base class for logic gate evaluation."""

    @staticmethod
    def evaluate_and(inputs: list[SignalState]) -> SignalState:
        """AND gate: Output HIGH only when all inputs are HIGH."""
        if SignalState.UNDEFINED in inputs or SignalState.ERROR in inputs:
            return SignalState.UNDEFINED
        return SignalState.HIGH if all(s == SignalState.HIGH for s in inputs) else SignalState.LOW

    @staticmethod
    def evaluate_or(inputs: list[SignalState]) -> SignalState:
        """OR gate: Output HIGH when any input is HIGH."""
        if SignalState.UNDEFINED in inputs or SignalState.ERROR in inputs:
            return SignalState.UNDEFINED
        return SignalState.HIGH if any(s == SignalState.HIGH for s in inputs) else SignalState.LOW

    @staticmethod
    def evaluate_not(input_signal: SignalState) -> SignalState:
        """NOT gate: Output is inverse of input."""
        if input_signal == SignalState.HIGH:
            return SignalState.LOW
        elif input_signal == SignalState.LOW:
            return SignalState.HIGH
        return SignalState.UNDEFINED

    @staticmethod
    def evaluate_nand(inputs: list[SignalState]) -> SignalState:
        """NAND gate: Output LOW only when all inputs are HIGH."""
        and_result = LogicGate.evaluate_and(inputs)
        return LogicGate.evaluate_not(and_result)

    @staticmethod
    def evaluate_nor(inputs: list[SignalState]) -> SignalState:
        """NOR gate: Output LOW when any input is HIGH."""
        or_result = LogicGate.evaluate_or(inputs)
        return LogicGate.evaluate_not(or_result)

    @staticmethod
    def evaluate_xor(inputs: list[SignalState]) -> SignalState:
        """XOR gate: Output HIGH when inputs differ (for 2-input)."""
        if len(inputs) != 2:
            return SignalState.UNDEFINED
        if SignalState.UNDEFINED in inputs or SignalState.ERROR in inputs:
            return SignalState.UNDEFINED
        return SignalState.HIGH if inputs[0] != inputs[1] else SignalState.LOW

    @staticmethod
    def evaluate_xnor(inputs: list[SignalState]) -> SignalState:
        """XNOR gate: Output HIGH when inputs are same (for 2-input)."""
        xor_result = LogicGate.evaluate_xor(inputs)
        return LogicGate.evaluate_not(xor_result)

    @staticmethod
    def evaluate_buffer(input_signal: SignalState) -> SignalState:
        """Buffer: Output equals input."""
        return input_signal


class SimulationService:
    """Service for simulating circuit logic."""

    # Component types that are logic gates
    LOGIC_GATES = {
        ComponentType.AND_2, ComponentType.AND_3, ComponentType.AND_4,
        ComponentType.OR_2, ComponentType.OR_3, ComponentType.OR_4,
        ComponentType.NOT, ComponentType.BUFFER,
        ComponentType.NAND_2, ComponentType.NAND_3,
        ComponentType.NOR_2, ComponentType.NOR_3,
        ComponentType.XOR_2, ComponentType.XNOR_2,
    }

    # Input devices that produce signals
    INPUT_DEVICES = {
        ComponentType.SWITCH_TOGGLE, ComponentType.SWITCH_PUSH,
        ComponentType.CONST_HIGH, ComponentType.CONST_LOW,
        ComponentType.CLOCK, ComponentType.DIP_SWITCH_4,
        ComponentType.NUMERIC_INPUT,
    }

    # Output devices that consume signals
    OUTPUT_DEVICES = {
        ComponentType.LED_RED, ComponentType.LED_GREEN,
        ComponentType.LED_YELLOW, ComponentType.LED_BLUE,
        ComponentType.LED_RGB, ComponentType.DISPLAY_7SEG,
        ComponentType.BUZZER, ComponentType.MOTOR_DC,
    }

    def __init__(self):
        self._component_map: dict[str, CircuitComponent] = {}
        self._wire_map: dict[str, Wire] = {}
        self._adjacency: dict[str, list[str]] = {}  # component_id -> connected component_ids
        self._pin_connections: dict[tuple[str, str], list[tuple[str, str]]] = {}  # (comp_id, pin_id) -> [(comp_id, pin_id)]

    def simulate(self, circuit: CircuitState) -> SimulationResult:
        """
        Simulate the circuit and compute signal states.
        
        Args:
            circuit: The circuit state to simulate
            
        Returns:
            SimulationResult with wire states and any errors
        """
        self._build_graph(circuit)

        errors: list[SimulationError] = []
        pin_states: dict[str, dict[str, SignalState]] = {}
        wire_states: dict[str, SignalState] = {}

        # Check for floating inputs and output conflicts
        validation_errors = self._validate_circuit(circuit)
        if validation_errors:
            return SimulationResult(
                success=False,
                errors=validation_errors
            )

        # Get topological order for evaluation
        try:
            eval_order = self._topological_sort(circuit)
        except ValueError as e:
            errors.append(SimulationError(
                error_type="CYCLE_DETECTED",
                message=str(e)
            ))
            return SimulationResult(success=False, errors=errors)

        # Initialize input device states
        for comp in circuit.components:
            pin_states[comp.id] = {}
            if comp.type in self.INPUT_DEVICES:
                self._initialize_input_device(comp, pin_states)

        # Evaluate components in topological order
        for comp_id in eval_order:
            comp = self._component_map.get(comp_id)
            if not comp:
                continue

            if comp.type in self.LOGIC_GATES:
                self._evaluate_gate(comp, pin_states)
            elif comp.type in self.OUTPUT_DEVICES:
                self._evaluate_output_device(comp, pin_states)

        # Compute wire states from pin states
        for wire in circuit.wires:
            from_state = pin_states.get(wire.from_component_id, {}).get(wire.from_pin_id, SignalState.UNDEFINED)
            wire_states[wire.id] = from_state

        return SimulationResult(
            success=True,
            wire_states=wire_states,
            pin_states=pin_states,
            errors=errors
        )

    def _build_graph(self, circuit: CircuitState) -> None:
        """Build internal graph representation of the circuit."""
        self._component_map = {c.id: c for c in circuit.components}
        self._wire_map = {w.id: w for w in circuit.wires}
        self._adjacency = {c.id: [] for c in circuit.components}
        self._pin_connections = {}

        for wire in circuit.wires:
            # Add adjacency (from -> to) - avoid duplicates
            if wire.from_component_id in self._adjacency:
                if wire.to_component_id not in self._adjacency[wire.from_component_id]:
                    self._adjacency[wire.from_component_id].append(wire.to_component_id)

            # Track pin connections
            from_key = (wire.from_component_id, wire.from_pin_id)
            to_key = (wire.to_component_id, wire.to_pin_id)

            if from_key not in self._pin_connections:
                self._pin_connections[from_key] = []
            self._pin_connections[from_key].append(to_key)

    def _validate_circuit(self, circuit: CircuitState) -> list[SimulationError]:
        """Validate circuit for common errors."""
        errors: list[SimulationError] = []

        # Check for floating inputs (input pins with no connection)
        connected_inputs: set[tuple[str, str]] = set()
        output_drivers: dict[tuple[str, str], list[str]] = {}  # input pin -> list of driving outputs

        for wire in circuit.wires:
            to_key = (wire.to_component_id, wire.to_pin_id)
            connected_inputs.add(to_key)

            # Track multiple outputs driving same input
            if to_key not in output_drivers:
                output_drivers[to_key] = []
            output_drivers[to_key].append(wire.from_component_id)

        # Check each component's input pins
        for comp in circuit.components:
            if comp.type in self.INPUT_DEVICES:
                continue  # Input devices don't need input connections

            for pin in comp.pins:
                if pin.type.value == "input":
                    pin_key = (comp.id, pin.id)
                    if pin_key not in connected_inputs:
                        errors.append(SimulationError(
                            error_type="FLOATING_INPUT",
                            message=f"Floating Input: Input pin '{pin.name}' has no connection",
                            component_id=comp.id,
                            pin_id=pin.id
                        ))

        # Check for output conflicts (multiple outputs driving same input pin)
        for pin_key, drivers in output_drivers.items():
            # Filter out duplicate entries from the same driver (same wire counted multiple times)
            unique_drivers = list(set(drivers))
            if len(unique_drivers) > 1:
                comp_id, pin_id = pin_key
                comp = self._component_map.get(comp_id)
                comp_label = comp.label if comp and comp.label else comp_id
                pin_name = pin_id
                if comp:
                    for pin in comp.pins:
                        if pin.id == pin_id:
                            pin_name = pin.name
                            break
                errors.append(SimulationError(
                    error_type="OUTPUT_CONFLICT",
                    message=f"Output Conflict: {comp_label} pin '{pin_name}' has multiple drivers",
                    component_id=comp_id,
                    pin_id=pin_id
                ))

        return errors

    def _topological_sort(self, circuit: CircuitState) -> list[str]:
        """
        Perform topological sort on circuit components.
        
        Returns components in order they should be evaluated.
        Raises ValueError if cycle detected.
        """
        in_degree: dict[str, int] = {c.id: 0 for c in circuit.components}

        # Calculate in-degrees based on adjacency list (which has no duplicates)
        # This ensures in_degree matches the number of times we'll decrement it
        for from_comp_id, neighbors in self._adjacency.items():
            for to_comp_id in neighbors:
                if to_comp_id in in_degree:
                    in_degree[to_comp_id] += 1

        # Start with components that have no inputs (in_degree = 0)
        queue = [cid for cid, deg in in_degree.items() if deg == 0]
        result: list[str] = []

        while queue:
            current = queue.pop(0)
            result.append(current)

            for neighbor in self._adjacency.get(current, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) != len(circuit.components):
            raise ValueError("Circuit contains a cycle - cannot simulate")

        return result

    def _initialize_input_device(
        self,
        comp: CircuitComponent,
        pin_states: dict[str, dict[str, SignalState]]
    ) -> None:
        """Initialize output states for input devices."""
        if comp.type == ComponentType.CONST_HIGH:
            for pin in comp.pins:
                if pin.type.value == "output":
                    pin_states[comp.id][pin.id] = SignalState.HIGH

        elif comp.type == ComponentType.CONST_LOW:
            for pin in comp.pins:
                if pin.type.value == "output":
                    pin_states[comp.id][pin.id] = SignalState.LOW

        elif comp.type == ComponentType.SWITCH_TOGGLE:
            # Get state from properties, default to LOW
            is_on = comp.properties.get("state", False)
            for pin in comp.pins:
                if pin.type.value == "output":
                    pin_states[comp.id][pin.id] = SignalState.HIGH if is_on else SignalState.LOW

        elif comp.type == ComponentType.SWITCH_PUSH:
            # Push buttons are normally LOW
            is_pressed = comp.properties.get("pressed", False)
            for pin in comp.pins:
                if pin.type.value == "output":
                    pin_states[comp.id][pin.id] = SignalState.HIGH if is_pressed else SignalState.LOW

        elif comp.type == ComponentType.CLOCK:
            # Clock state alternates, use current phase from properties
            phase = comp.properties.get("phase", 0)
            for pin in comp.pins:
                if pin.type.value == "output":
                    pin_states[comp.id][pin.id] = SignalState.HIGH if phase % 2 == 0 else SignalState.LOW

        else:
            # Default: all outputs LOW
            for pin in comp.pins:
                if pin.type.value == "output":
                    pin_states[comp.id][pin.id] = SignalState.LOW

    def _get_input_signals(
        self,
        comp: CircuitComponent,
        pin_states: dict[str, dict[str, SignalState]]
    ) -> list[SignalState]:
        """Get input signal states for a component."""
        inputs: list[SignalState] = []

        for pin in comp.pins:
            if pin.type.value == "input":
                # Find the wire connected to this input
                signal = SignalState.UNDEFINED
                for (from_comp, from_pin), connections in self._pin_connections.items():
                    for to_comp, to_pin in connections:
                        if to_comp == comp.id and to_pin == pin.id:
                            signal = pin_states.get(from_comp, {}).get(from_pin, SignalState.UNDEFINED)
                            break
                inputs.append(signal)

        return inputs

    def _evaluate_gate(
        self,
        comp: CircuitComponent,
        pin_states: dict[str, dict[str, SignalState]]
    ) -> None:
        """Evaluate a logic gate and set its output state."""
        inputs = self._get_input_signals(comp, pin_states)
        output = SignalState.UNDEFINED

        if comp.type in {ComponentType.AND_2, ComponentType.AND_3, ComponentType.AND_4}:
            output = LogicGate.evaluate_and(inputs)

        elif comp.type in {ComponentType.OR_2, ComponentType.OR_3, ComponentType.OR_4}:
            output = LogicGate.evaluate_or(inputs)

        elif comp.type == ComponentType.NOT:
            output = LogicGate.evaluate_not(inputs[0] if inputs else SignalState.UNDEFINED)

        elif comp.type == ComponentType.BUFFER:
            output = LogicGate.evaluate_buffer(inputs[0] if inputs else SignalState.UNDEFINED)

        elif comp.type in {ComponentType.NAND_2, ComponentType.NAND_3}:
            output = LogicGate.evaluate_nand(inputs)

        elif comp.type in {ComponentType.NOR_2, ComponentType.NOR_3}:
            output = LogicGate.evaluate_nor(inputs)

        elif comp.type == ComponentType.XOR_2:
            output = LogicGate.evaluate_xor(inputs)

        elif comp.type == ComponentType.XNOR_2:
            output = LogicGate.evaluate_xnor(inputs)

        # Set output pin states
        for pin in comp.pins:
            if pin.type.value == "output":
                pin_states[comp.id][pin.id] = output

    def _evaluate_output_device(
        self,
        comp: CircuitComponent,
        pin_states: dict[str, dict[str, SignalState]]
    ) -> None:
        """Evaluate an output device (LED, etc.) - just propagate input to state."""
        inputs = self._get_input_signals(comp, pin_states)

        # Store the input state for visualization
        for i, pin in enumerate(comp.pins):
            if pin.type.value == "input" and i < len(inputs):
                pin_states[comp.id][pin.id] = inputs[i]


# Singleton instance
simulation_service = SimulationService()
