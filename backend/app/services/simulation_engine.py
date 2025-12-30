"""Event-driven circuit simulation engine."""

import heapq
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum

from app.models.circuit import CircuitComponent, CircuitState, Wire


class Signal(str, Enum):
    """Signal values for circuit simulation."""
    HIGH = "1"
    LOW = "0"
    Z = "Z"  # High impedance
    X = "X"  # Unknown/conflict


@dataclass(order=True)
class Event:
    """Simulation event at a specific time."""
    time: int
    seq: int = field(default=0, compare=True)
    component_id: str = field(default="", compare=False)
    pin_id: str = field(default="", compare=False)
    value: Signal = field(default=Signal.X, compare=False)


@dataclass
class ComponentState:
    """Runtime state for a component."""
    outputs: dict[str, Signal] = field(default_factory=dict)
    internal: dict[str, any] = field(default_factory=dict)


class SimulationEngine:
    """Event-driven circuit simulation engine."""

    def __init__(self):
        self.time = 0
        self.events: list[Event] = []
        self.seq = 0
        self.components: dict[str, CircuitComponent] = {}
        self.wires: list[Wire] = []
        self.states: dict[str, ComponentState] = {}
        self.pin_values: dict[str, Signal] = {}  # "comp:pin" -> value
        self.connections: dict[str, list[str]] = {}  # "from_comp:from_pin" -> ["to_comp:to_pin", ...]
        self.listeners: dict[str, Callable] = {}  # Callbacks for state changes

    def load_circuit(self, circuit: CircuitState) -> None:
        """Load a circuit for simulation."""
        self.components = {c.id: c for c in circuit.components}
        self.wires = circuit.wires
        self.states = {c.id: ComponentState() for c in circuit.components}
        self.pin_values = {}
        self.connections = {}
        self.events = []
        self.time = 0
        self.seq = 0

        # Build connection map
        for wire in self.wires:
            from_key = f"{wire.from_component_id}:{wire.from_pin_id}"
            to_key = f"{wire.to_component_id}:{wire.to_pin_id}"
            if from_key not in self.connections:
                self.connections[from_key] = []
            self.connections[from_key].append(to_key)

        # Initialize all components
        for comp in circuit.components:
            self._init_component(comp)

    def _init_component(self, comp: CircuitComponent) -> None:
        """Initialize a component's outputs."""
        props = comp.properties
        state = self.states[comp.id]

        if comp.type.value in ("CONST_HIGH", "VCC_5V", "VCC_3V3"):
            state.outputs["OUT"] = Signal.HIGH
        elif comp.type.value in ("CONST_LOW", "GROUND"):
            state.outputs["OUT"] = Signal.LOW
        elif comp.type.value == "SWITCH_TOGGLE":
            state.outputs["OUT"] = Signal.HIGH if props.get("state") else Signal.LOW
        elif comp.type.value == "SWITCH_PUSH":
            state.outputs["OUT"] = Signal.HIGH if props.get("pressed") or props.get("state") else Signal.LOW
        elif comp.type.value == "CLOCK":
            state.outputs["CLK"] = Signal.LOW
            state.internal["phase"] = 0
        else:
            # Default outputs to LOW for gates
            for pin in comp.pins:
                if pin.type.value == "output":
                    state.outputs[pin.id] = Signal.LOW

        # Set initial pin values
        for pin_id, value in state.outputs.items():
            self.pin_values[f"{comp.id}:{pin_id}"] = value

    def schedule(self, delay: int, component_id: str, pin_id: str, value: Signal) -> None:
        """Schedule a signal change event."""
        event = Event(
            time=self.time + delay,
            seq=self.seq,
            component_id=component_id,
            pin_id=pin_id,
            value=value,
        )
        self.seq += 1
        heapq.heappush(self.events, event)

    def step(self) -> bool:
        """Process the next event. Returns False if no events."""
        if not self.events:
            return False

        event = heapq.heappop(self.events)
        self.time = event.time

        # Update pin value
        pin_key = f"{event.component_id}:{event.pin_id}"
        old_value = self.pin_values.get(pin_key, Signal.X)
        if old_value == event.value:
            return True  # No change

        self.pin_values[pin_key] = event.value
        self.states[event.component_id].outputs[event.pin_id] = event.value

        # Propagate to connected inputs
        for to_key in self.connections.get(pin_key, []):
            to_comp_id, to_pin_id = to_key.split(":")
            self.pin_values[to_key] = event.value
            self._evaluate_component(to_comp_id)

        return True

    def run(self, max_steps: int = 10000) -> None:
        """Run simulation until no more events or max steps reached."""
        steps = 0
        while self.step() and steps < max_steps:
            steps += 1

    def run_until(self, end_time: int) -> None:
        """Run simulation until a specific time."""
        while self.events and self.events[0].time <= end_time:
            self.step()
        self.time = end_time

    def set_input(self, component_id: str, value: bool) -> None:
        """Set an input device state (switch, button)."""
        comp = self.components.get(component_id)
        if not comp:
            return

        signal = Signal.HIGH if value else Signal.LOW

        if comp.type.value in ("SWITCH_TOGGLE", "SWITCH_PUSH"):
            self.schedule(0, component_id, "OUT", signal)

    def toggle_switch(self, component_id: str) -> None:
        """Toggle a switch component."""
        comp = self.components.get(component_id)
        if not comp or comp.type.value != "SWITCH_TOGGLE":
            return

        current = self.pin_values.get(f"{component_id}:OUT", Signal.LOW)
        new_value = Signal.LOW if current == Signal.HIGH else Signal.HIGH
        self.schedule(0, component_id, "OUT", new_value)

    def tick_clock(self, component_id: str) -> None:
        """Advance a clock by one tick."""
        comp = self.components.get(component_id)
        if not comp or comp.type.value != "CLOCK":
            return

        state = self.states[component_id]
        current = self.pin_values.get(f"{component_id}:CLK", Signal.LOW)
        new_value = Signal.LOW if current == Signal.HIGH else Signal.HIGH
        state.internal["phase"] = (state.internal.get("phase", 0) + 1) % 2
        self.schedule(0, component_id, "CLK", new_value)

    def _get_input(self, component_id: str, pin_id: str) -> Signal:
        """Get the signal value at an input pin."""
        pin_key = f"{component_id}:{pin_id}"

        # Find wire driving this input
        for from_key, to_keys in self.connections.items():
            if pin_key in to_keys:
                return self.pin_values.get(from_key, Signal.X)

        return Signal.X  # Floating input

    def _get_inputs(self, component_id: str) -> dict[str, Signal]:
        """Get all input signals for a component."""
        comp = self.components[component_id]
        inputs = {}
        for pin in comp.pins:
            if pin.type.value == "input":
                inputs[pin.id] = self._get_input(component_id, pin.id)
        return inputs

    def _evaluate_component(self, component_id: str) -> None:
        """Evaluate a component and schedule output changes."""
        comp = self.components.get(component_id)
        if not comp:
            return

        inputs = self._get_inputs(component_id)
        state = self.states[component_id]
        outputs = self._compute_outputs(comp, inputs, state)

        for pin_id, value in outputs.items():
            current = state.outputs.get(pin_id, Signal.X)
            if value != current:
                self.schedule(1, component_id, pin_id, value)  # 1 tick delay

    def _compute_outputs(
        self, comp: CircuitComponent, inputs: dict[str, Signal], state: ComponentState
    ) -> dict[str, Signal]:
        """Compute output values for a component."""
        t = comp.type.value

        # Logic gates
        if t in ("AND_2", "AND_3", "AND_4"):
            return {"Y": self._and(list(inputs.values()))}
        if t in ("OR_2", "OR_3", "OR_4"):
            return {"Y": self._or(list(inputs.values()))}
        if t == "NOT":
            return {"Y": self._not(inputs.get("A", Signal.X))}
        if t == "BUFFER":
            return {"Y": inputs.get("A", Signal.X)}
        if t in ("NAND_2", "NAND_3"):
            return {"Y": self._not(self._and(list(inputs.values())))}
        if t in ("NOR_2", "NOR_3"):
            return {"Y": self._not(self._or(list(inputs.values())))}
        if t == "XOR_2":
            vals = list(inputs.values())
            return {"Y": self._xor(vals[0], vals[1]) if len(vals) == 2 else Signal.X}
        if t == "XNOR_2":
            vals = list(inputs.values())
            return {"Y": self._not(self._xor(vals[0], vals[1])) if len(vals) == 2 else Signal.X}

        # Combinational
        if t == "MUX_2TO1":
            sel = inputs.get("S", Signal.LOW)
            if sel == Signal.HIGH:
                return {"Y": inputs.get("B", Signal.X)}
            return {"Y": inputs.get("A", Signal.X)}

        if t == "DECODER_2TO4":
            a0 = 1 if inputs.get("A0", Signal.LOW) == Signal.HIGH else 0
            a1 = 1 if inputs.get("A1", Signal.LOW) == Signal.HIGH else 0
            sel = a0 + (a1 * 2)
            return {
                "Y0": Signal.HIGH if sel == 0 else Signal.LOW,
                "Y1": Signal.HIGH if sel == 1 else Signal.LOW,
                "Y2": Signal.HIGH if sel == 2 else Signal.LOW,
                "Y3": Signal.HIGH if sel == 3 else Signal.LOW,
            }

        # Sequential
        if t == "SR_LATCH":
            s = inputs.get("S", Signal.LOW)
            r = inputs.get("R", Signal.LOW)
            q = state.internal.get("Q", Signal.LOW)
            if s == Signal.HIGH and r == Signal.HIGH:
                q = Signal.X
            elif s == Signal.HIGH:
                q = Signal.HIGH
            elif r == Signal.HIGH:
                q = Signal.LOW
            state.internal["Q"] = q
            return {"Q": q, "Q'": self._not(q)}

        if t == "D_FLIPFLOP":
            d = inputs.get("D", Signal.LOW)
            clk = inputs.get("CLK", Signal.LOW)
            prev_clk = state.internal.get("prev_clk", Signal.LOW)
            q = state.internal.get("Q", Signal.LOW)

            if prev_clk == Signal.LOW and clk == Signal.HIGH:  # Rising edge
                q = d
                state.internal["Q"] = q
            state.internal["prev_clk"] = clk
            return {"Q": q, "Q'": self._not(q)}

        if t == "JK_FLIPFLOP":
            j = inputs.get("J", Signal.LOW)
            k = inputs.get("K", Signal.LOW)
            clk = inputs.get("CLK", Signal.LOW)
            prev_clk = state.internal.get("prev_clk", Signal.LOW)
            q = state.internal.get("Q", Signal.LOW)

            if prev_clk == Signal.LOW and clk == Signal.HIGH:  # Rising edge
                if j == Signal.HIGH and k == Signal.HIGH:
                    q = self._not(q)
                elif j == Signal.HIGH:
                    q = Signal.HIGH
                elif k == Signal.HIGH:
                    q = Signal.LOW
                state.internal["Q"] = q
            state.internal["prev_clk"] = clk
            return {"Q": q, "Q'": self._not(q)}

        if t == "COUNTER_4BIT":
            clk = inputs.get("CLK", Signal.LOW)
            prev_clk = state.internal.get("prev_clk", Signal.LOW)
            count = state.internal.get("count", 0)

            if prev_clk == Signal.LOW and clk == Signal.HIGH:
                count = (count + 1) % 16
                state.internal["count"] = count
            state.internal["prev_clk"] = clk
            return {
                "Q0": Signal.HIGH if (count & 1) else Signal.LOW,
                "Q1": Signal.HIGH if (count & 2) else Signal.LOW,
                "Q2": Signal.HIGH if (count & 4) else Signal.LOW,
                "Q3": Signal.HIGH if (count & 8) else Signal.LOW,
            }

        if t == "SHIFT_REGISTER_8BIT":
            si = inputs.get("SI", Signal.LOW)
            clk = inputs.get("CLK", Signal.LOW)
            prev_clk = state.internal.get("prev_clk", Signal.LOW)
            reg = state.internal.get("reg", 0)

            if prev_clk == Signal.LOW and clk == Signal.HIGH:
                bit = 1 if si == Signal.HIGH else 0
                reg = ((reg << 1) | bit) & 0xFF
                state.internal["reg"] = reg
            state.internal["prev_clk"] = clk
            return {f"Q{i}": Signal.HIGH if (reg & (1 << i)) else Signal.LOW for i in range(8)}

        # Junction
        if t == "JUNCTION":
            v = inputs.get("IN", Signal.Z)
            return {"OUT1": v, "OUT2": v}

        return {}

    def _and(self, signals: list[Signal]) -> Signal:
        if any(s == Signal.X for s in signals):
            return Signal.X
        if all(s == Signal.HIGH for s in signals):
            return Signal.HIGH
        return Signal.LOW

    def _or(self, signals: list[Signal]) -> Signal:
        if any(s == Signal.X for s in signals):
            return Signal.X
        if any(s == Signal.HIGH for s in signals):
            return Signal.HIGH
        return Signal.LOW

    def _not(self, signal: Signal) -> Signal:
        if signal == Signal.HIGH:
            return Signal.LOW
        if signal == Signal.LOW:
            return Signal.HIGH
        return Signal.X

    def _xor(self, a: Signal, b: Signal) -> Signal:
        if a == Signal.X or b == Signal.X:
            return Signal.X
        if (a == Signal.HIGH) != (b == Signal.HIGH):
            return Signal.HIGH
        return Signal.LOW

    def get_wire_states(self) -> dict[str, str]:
        """Get all wire states for frontend."""
        result = {}
        for wire in self.wires:
            from_key = f"{wire.from_component_id}:{wire.from_pin_id}"
            result[wire.id] = self.pin_values.get(from_key, Signal.X).value
        return result

    def get_pin_states(self) -> dict[str, dict[str, str]]:
        """Get all pin states grouped by component."""
        result = {}
        for key, value in self.pin_values.items():
            comp_id, pin_id = key.split(":")
            if comp_id not in result:
                result[comp_id] = {}
            result[comp_id][pin_id] = value.value
        return result

    def get_component_states(self) -> dict[str, dict]:
        """Get internal state for all components (for sequential elements)."""
        return {
            comp_id: {
                "outputs": {k: v.value for k, v in state.outputs.items()},
                "internal": state.internal,
            }
            for comp_id, state in self.states.items()
        }
