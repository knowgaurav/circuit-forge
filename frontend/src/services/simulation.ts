/**
 * Circuit Simulation Service
 * Implements logic gate evaluation with truth tables
 */

import type { CircuitComponent, CircuitState, Wire, ComponentType } from '@/types';

export type SignalState = 'HIGH' | 'LOW' | 'UNDEFINED' | 'ERROR';

export interface SimulationError {
    errorType: string;
    message: string;
    componentId?: string;
    pinId?: string;
}

export interface SimulationResult {
    success: boolean;
    wireStates: Record<string, SignalState>;
    pinStates: Record<string, Record<string, SignalState>>;
    errors: SimulationError[];
}

// Logic gate types
const LOGIC_GATES = new Set<ComponentType>([
    'AND_2', 'AND_3', 'AND_4',
    'OR_2', 'OR_3', 'OR_4',
    'NOT', 'BUFFER',
    'NAND_2', 'NAND_3',
    'NOR_2', 'NOR_3',
    'XOR_2', 'XNOR_2',
] as ComponentType[]);

// Combinational logic (multiplexers, etc.)
const COMBINATIONAL_LOGIC = new Set<ComponentType>([
    'MUX_2TO1', 'MUX_4TO1',
    'DEMUX_1TO2', 'DECODER_2TO4',
    'ADDER_4BIT', 'COMPARATOR_4BIT', 'BCD_TO_7SEG',
] as ComponentType[]);

// Sequential logic (flip-flops, latches, counters)
const SEQUENTIAL_LOGIC = new Set<ComponentType>([
    'D_FLIPFLOP', 'SR_LATCH', 'JK_FLIPFLOP', 'T_FLIPFLOP',
    'COUNTER_4BIT', 'SHIFT_REGISTER_8BIT',
    'TRAFFIC_LIGHT_CTRL',
] as ComponentType[]);

// Input devices that produce signals
const INPUT_DEVICES = new Set<ComponentType>([
    'SWITCH_TOGGLE', 'SWITCH_PUSH',
    'CONST_HIGH', 'CONST_LOW',
    'CLOCK', 'DIP_SWITCH_4',
    'NUMERIC_INPUT',
    'VCC_5V', 'VCC_3V3', // Power sources act as HIGH
] as ComponentType[]);

// Output devices that consume signals
const OUTPUT_DEVICES = new Set<ComponentType>([
    'LED_RED', 'LED_GREEN',
    'LED_YELLOW', 'LED_BLUE',
    'LED_RGB', 'DISPLAY_7SEG',
    'BUZZER', 'MOTOR_DC',
    'PROBE', // Probe just displays signal state
    'GROUND', // Ground consumes signal
] as ComponentType[]);

// Junction/splitter components
const JUNCTION_COMPONENTS = new Set<ComponentType>([
    'JUNCTION',
] as ComponentType[]);

/**
 * Logic gate evaluation functions
 */
export const LogicGate = {
    /**
     * AND gate: Output HIGH only when all inputs are HIGH
     */
    evaluateAnd(inputs: SignalState[]): SignalState {
        if (inputs.includes('UNDEFINED') || inputs.includes('ERROR')) {
            return 'UNDEFINED';
        }
        return inputs.every(s => s === 'HIGH') ? 'HIGH' : 'LOW';
    },

    /**
     * OR gate: Output HIGH when any input is HIGH
     */
    evaluateOr(inputs: SignalState[]): SignalState {
        if (inputs.includes('UNDEFINED') || inputs.includes('ERROR')) {
            return 'UNDEFINED';
        }
        return inputs.some(s => s === 'HIGH') ? 'HIGH' : 'LOW';
    },

    /**
     * NOT gate: Output is inverse of input
     */
    evaluateNot(input: SignalState): SignalState {
        if (input === 'HIGH') return 'LOW';
        if (input === 'LOW') return 'HIGH';
        return 'UNDEFINED';
    },

    /**
     * NAND gate: Output LOW only when all inputs are HIGH
     */
    evaluateNand(inputs: SignalState[]): SignalState {
        const andResult = LogicGate.evaluateAnd(inputs);
        return LogicGate.evaluateNot(andResult);
    },

    /**
     * NOR gate: Output LOW when any input is HIGH
     */
    evaluateNor(inputs: SignalState[]): SignalState {
        const orResult = LogicGate.evaluateOr(inputs);
        return LogicGate.evaluateNot(orResult);
    },

    /**
     * XOR gate: Output HIGH when inputs differ (for 2-input)
     */
    evaluateXor(inputs: SignalState[]): SignalState {
        if (inputs.length !== 2) return 'UNDEFINED';
        if (inputs.includes('UNDEFINED') || inputs.includes('ERROR')) {
            return 'UNDEFINED';
        }
        return inputs[0] !== inputs[1] ? 'HIGH' : 'LOW';
    },

    /**
     * XNOR gate: Output HIGH when inputs are same (for 2-input)
     */
    evaluateXnor(inputs: SignalState[]): SignalState {
        const xorResult = LogicGate.evaluateXor(inputs);
        return LogicGate.evaluateNot(xorResult);
    },

    /**
     * Buffer: Output equals input
     */
    evaluateBuffer(input: SignalState): SignalState {
        return input;
    },

    /**
     * 2:1 Multiplexer: Output A when S=LOW, B when S=HIGH
     */
    evaluateMux2to1(a: SignalState, b: SignalState, sel: SignalState): SignalState {
        if (sel === 'UNDEFINED' || sel === 'ERROR') return 'UNDEFINED';
        return sel === 'LOW' ? a : b;
    },

    /**
     * SR Latch: Set-Reset latch
     * S=1, R=0 -> Q=1
     * S=0, R=1 -> Q=0
     * S=0, R=0 -> Q holds previous state
     * S=1, R=1 -> Invalid (both outputs LOW in this implementation)
     */
    evaluateSRLatch(s: SignalState, r: SignalState, prevQ: SignalState): { q: SignalState; qBar: SignalState } {
        if (s === 'UNDEFINED' || r === 'UNDEFINED') {
            return { q: 'UNDEFINED', qBar: 'UNDEFINED' };
        }
        if (s === 'HIGH' && r === 'HIGH') {
            // Invalid state - both outputs LOW
            return { q: 'LOW', qBar: 'LOW' };
        }
        if (s === 'HIGH') {
            return { q: 'HIGH', qBar: 'LOW' };
        }
        if (r === 'HIGH') {
            return { q: 'LOW', qBar: 'HIGH' };
        }
        // Hold state
        const q = prevQ === 'UNDEFINED' ? 'LOW' : prevQ;
        return { q, qBar: q === 'HIGH' ? 'LOW' : 'HIGH' };
    },

    /**
     * D Flip-Flop: On rising edge of CLK, Q = D
     */
    evaluateDFlipFlop(d: SignalState, clk: SignalState, prevClk: SignalState, prevQ: SignalState): { q: SignalState; qBar: SignalState } {
        if (d === 'UNDEFINED' || clk === 'UNDEFINED') {
            return { q: 'UNDEFINED', qBar: 'UNDEFINED' };
        }
        // Rising edge detection
        if (prevClk === 'LOW' && clk === 'HIGH') {
            return { q: d, qBar: d === 'HIGH' ? 'LOW' : 'HIGH' };
        }
        // Hold state
        const q = prevQ === 'UNDEFINED' ? 'LOW' : prevQ;
        return { q, qBar: q === 'HIGH' ? 'LOW' : 'HIGH' };
    },

    /**
     * JK Flip-Flop: On rising edge of CLK
     * J=0, K=0 -> Hold
     * J=1, K=0 -> Set (Q=1)
     * J=0, K=1 -> Reset (Q=0)
     * J=1, K=1 -> Toggle
     */
    evaluateJKFlipFlop(j: SignalState, k: SignalState, clk: SignalState, prevClk: SignalState, prevQ: SignalState): { q: SignalState; qBar: SignalState } {
        if (j === 'UNDEFINED' || k === 'UNDEFINED' || clk === 'UNDEFINED') {
            return { q: 'UNDEFINED', qBar: 'UNDEFINED' };
        }
        const q = prevQ === 'UNDEFINED' ? 'LOW' : prevQ;
        // Rising edge detection
        if (prevClk === 'LOW' && clk === 'HIGH') {
            if (j === 'LOW' && k === 'LOW') {
                // Hold
                return { q, qBar: q === 'HIGH' ? 'LOW' : 'HIGH' };
            }
            if (j === 'HIGH' && k === 'LOW') {
                // Set
                return { q: 'HIGH', qBar: 'LOW' };
            }
            if (j === 'LOW' && k === 'HIGH') {
                // Reset
                return { q: 'LOW', qBar: 'HIGH' };
            }
            // Toggle (J=1, K=1)
            const newQ = q === 'HIGH' ? 'LOW' : 'HIGH';
            return { q: newQ, qBar: newQ === 'HIGH' ? 'LOW' : 'HIGH' };
        }
        // Hold state
        return { q, qBar: q === 'HIGH' ? 'LOW' : 'HIGH' };
    },
};

/**
 * Circuit Simulation Engine
 * Supports both acyclic circuits (topological sort) and circuits with feedback loops (iterative convergence)
 */
export class SimulationEngine {
    private componentMap: Map<string, CircuitComponent> = new Map();
    private wireMap: Map<string, Wire> = new Map();
    private adjacency: Map<string, string[]> = new Map();
    private pinConnections: Map<string, Array<{ compId: string; pinId: string }>> = new Map();

    // Maximum iterations for feedback loop convergence
    private static readonly MAX_ITERATIONS = 100;

    /**
     * Simulate the circuit and compute signal states
     */
    simulate(circuit: CircuitState): SimulationResult {
        this.buildGraph(circuit);

        const errors: SimulationError[] = [];
        const pinStates: Record<string, Record<string, SignalState>> = {};
        const wireStates: Record<string, SignalState> = {};

        // Validate circuit (skip floating input check for feedback loops)
        const validationErrors = this.validateCircuitForFeedback(circuit);
        if (validationErrors.length > 0) {
            return {
                success: false,
                wireStates: {},
                pinStates: {},
                errors: validationErrors,
            };
        }

        // Check if circuit has cycles (feedback loops)
        const hasCycles = this.detectCycles(circuit);

        // Initialize pin states for all components
        for (const comp of circuit.components) {
            pinStates[comp.id] = {};
            if (INPUT_DEVICES.has(comp.type)) {
                this.initializeInputDevice(comp, pinStates);
            } else {
                // Initialize all other components to LOW (needed for feedback convergence)
                const compPins = pinStates[comp.id];
                if (compPins) {
                    for (const pin of comp.pins) {
                        if (pin.type === 'output') {
                            compPins[pin.id] = 'LOW';
                        }
                    }
                }
            }
        }

        if (hasCycles) {
            // Use iterative simulation for circuits with feedback loops
            const converged = this.simulateWithFeedback(circuit, pinStates, errors);
            if (!converged) {
                errors.push({
                    errorType: 'NO_CONVERGENCE',
                    message: 'Circuit feedback loop did not stabilize - possible oscillation',
                });
            }
        } else {
            // Use topological sort for acyclic circuits
            const evalOrder = this.topologicalSort(circuit);

            // Evaluate components in topological order
            for (const compId of evalOrder) {
                const comp = this.componentMap.get(compId);
                if (!comp) continue;
                this.evaluateComponent(comp, pinStates);
            }
        }

        // Compute wire states from pin states
        for (const wire of circuit.wires) {
            const fromState = pinStates[wire.fromComponentId]?.[wire.fromPinId] ?? 'UNDEFINED';
            wireStates[wire.id] = fromState;
        }

        return {
            success: errors.length === 0,
            wireStates,
            pinStates,
            errors,
        };
    }

    /**
     * Simulate circuit with feedback loops using iterative convergence
     */
    private simulateWithFeedback(
        circuit: CircuitState,
        pinStates: Record<string, Record<string, SignalState>>,
        _errors: SimulationError[]
    ): boolean {
        // Get evaluation order (all non-input components)
        const evalOrder = circuit.components
            .filter(c => !INPUT_DEVICES.has(c.type))
            .map(c => c.id);

        let converged = false;

        for (let iteration = 0; iteration < SimulationEngine.MAX_ITERATIONS; iteration++) {
            // Save previous state for convergence check
            const prevStates = this.clonePinStates(pinStates);

            // Evaluate all components
            for (const compId of evalOrder) {
                const comp = this.componentMap.get(compId);
                if (!comp) continue;
                this.evaluateComponent(comp, pinStates);
            }

            // Check for convergence (states stopped changing)
            if (this.statesEqual(prevStates, pinStates)) {
                converged = true;
                break;
            }
        }

        return converged;
    }

    /**
     * Clone pin states for comparison
     */
    private clonePinStates(
        pinStates: Record<string, Record<string, SignalState>>
    ): Record<string, Record<string, SignalState>> {
        const clone: Record<string, Record<string, SignalState>> = {};
        for (const compId in pinStates) {
            clone[compId] = { ...pinStates[compId] };
        }
        return clone;
    }

    /**
     * Check if two pin state objects are equal
     */
    private statesEqual(
        a: Record<string, Record<string, SignalState>>,
        b: Record<string, Record<string, SignalState>>
    ): boolean {
        for (const compId in a) {
            if (!b[compId]) return false;
            for (const pinId in a[compId]) {
                if (a[compId][pinId] !== b[compId]?.[pinId]) return false;
            }
        }
        return true;
    }

    /**
     * Detect if circuit contains cycles (feedback loops)
     */
    private detectCycles(circuit: CircuitState): boolean {
        const visited = new Set<string>();
        const recStack = new Set<string>();

        const dfs = (compId: string): boolean => {
            visited.add(compId);
            recStack.add(compId);

            for (const neighbor of this.adjacency.get(compId) ?? []) {
                if (!visited.has(neighbor)) {
                    if (dfs(neighbor)) return true;
                } else if (recStack.has(neighbor)) {
                    return true; // Back edge found - cycle exists
                }
            }

            recStack.delete(compId);
            return false;
        };

        for (const comp of circuit.components) {
            if (!visited.has(comp.id)) {
                if (dfs(comp.id)) return true;
            }
        }

        return false;
    }

    /**
     * Evaluate a single component based on its type
     */
    private evaluateComponent(
        comp: CircuitComponent,
        pinStates: Record<string, Record<string, SignalState>>
    ): void {
        if (LOGIC_GATES.has(comp.type)) {
            this.evaluateGate(comp, pinStates);
        } else if (COMBINATIONAL_LOGIC.has(comp.type)) {
            this.evaluateCombinational(comp, pinStates);
        } else if (SEQUENTIAL_LOGIC.has(comp.type)) {
            this.evaluateSequential(comp, pinStates);
        } else if (JUNCTION_COMPONENTS.has(comp.type)) {
            this.evaluateJunction(comp, pinStates);
        } else if (OUTPUT_DEVICES.has(comp.type)) {
            this.evaluateOutputDevice(comp, pinStates);
        }
    }

    /**
     * Validate circuit for feedback simulation (less strict than acyclic validation)
     */
    private validateCircuitForFeedback(circuit: CircuitState): SimulationError[] {
        const errors: SimulationError[] = [];
        const connectedInputs = new Set<string>();
        const outputDrivers = new Map<string, string[]>();

        // Build connection maps
        for (const wire of circuit.wires) {
            const toKey = `${wire.toComponentId}:${wire.toPinId}`;
            connectedInputs.add(toKey);

            if (!outputDrivers.has(toKey)) {
                outputDrivers.set(toKey, []);
            }
            outputDrivers.get(toKey)!.push(wire.fromComponentId);
        }

        // Check for floating inputs (but allow feedback connections)
        // For feedback circuits, we only report floating inputs on non-latch components
        // that aren't part of a feedback loop
        const feedbackComponents = this.findFeedbackComponents(circuit);

        for (const comp of circuit.components) {
            // Skip input devices and output devices (output devices don't require all inputs)
            if (INPUT_DEVICES.has(comp.type) || OUTPUT_DEVICES.has(comp.type)) continue;

            for (const pin of comp.pins) {
                if (pin.type === 'input') {
                    const pinKey = `${comp.id}:${pin.id}`;
                    if (!connectedInputs.has(pinKey)) {
                        // Skip floating input error for components in feedback loops
                        // as they get their input from the loop
                        if (!feedbackComponents.has(comp.id)) {
                            const compName = comp.label || this.formatComponentType(comp.type);
                            errors.push({
                                errorType: 'FLOATING_INPUT',
                                message: `Floating Input: ${compName} pin '${pin.name}' has no connection`,
                                componentId: comp.id,
                                pinId: pin.id,
                            });
                        }
                    }
                }
            }
        }

        // Check output conflicts
        outputDrivers.forEach((drivers, pinKey) => {
            const uniqueDrivers = Array.from(new Set(drivers));
            if (uniqueDrivers.length > 1) {
                const parts = pinKey.split(':');
                const compId = parts[0] || '';
                const pinId = parts[1] || '';
                const comp = circuit.components.find(c => c.id === compId);
                const compName = comp?.label || (comp ? this.formatComponentType(comp.type) : 'Unknown');
                const pin = comp?.pins.find(p => p.id === pinId);
                const pinName = pin?.name || pinId;
                errors.push({
                    errorType: 'OUTPUT_CONFLICT',
                    message: `Output Conflict: ${compName} pin '${pinName}' has multiple drivers`,
                    componentId: compId,
                    pinId: pinId,
                });
            }
        });

        return errors;
    }

    /**
     * Find all components that are part of feedback loops
     */
    private findFeedbackComponents(circuit: CircuitState): Set<string> {
        const feedbackComponents = new Set<string>();
        const visited = new Set<string>();
        const recStack = new Set<string>();
        const path: string[] = [];

        const dfs = (compId: string): void => {
            visited.add(compId);
            recStack.add(compId);
            path.push(compId);

            for (const neighbor of this.adjacency.get(compId) ?? []) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor);
                } else if (recStack.has(neighbor)) {
                    // Found a cycle - mark all components in the cycle
                    const cycleStart = path.indexOf(neighbor);
                    if (cycleStart !== -1) {
                        for (let i = cycleStart; i < path.length; i++) {
                            const pathComp = path[i];
                            if (pathComp) {
                                feedbackComponents.add(pathComp);
                            }
                        }
                    }
                }
            }

            path.pop();
            recStack.delete(compId);
        };

        for (const comp of circuit.components) {
            if (!visited.has(comp.id)) {
                dfs(comp.id);
            }
        }

        return feedbackComponents;
    }

    private buildGraph(circuit: CircuitState): void {
        this.componentMap.clear();
        this.wireMap.clear();
        this.adjacency.clear();
        this.pinConnections.clear();

        for (const comp of circuit.components) {
            this.componentMap.set(comp.id, comp);
            this.adjacency.set(comp.id, []);
        }

        for (const wire of circuit.wires) {
            this.wireMap.set(wire.id, wire);

            // Add adjacency (avoid duplicates - only add if not already present)
            const adj = this.adjacency.get(wire.fromComponentId);
            if (adj && !adj.includes(wire.toComponentId)) {
                adj.push(wire.toComponentId);
            }

            // Track pin connections
            const fromKey = `${wire.fromComponentId}:${wire.fromPinId}`;
            if (!this.pinConnections.has(fromKey)) {
                this.pinConnections.set(fromKey, []);
            }
            this.pinConnections.get(fromKey)!.push({
                compId: wire.toComponentId,
                pinId: wire.toPinId,
            });
        }
    }

    private formatComponentType(type: ComponentType): string {
        // Convert component type to readable name
        const typeMap: Record<string, string> = {
            'AND_2': '2-Input AND Gate',
            'AND_3': '3-Input AND Gate',
            'AND_4': '4-Input AND Gate',
            'OR_2': '2-Input OR Gate',
            'OR_3': '3-Input OR Gate',
            'OR_4': '4-Input OR Gate',
            'NOT': 'NOT Gate',
            'BUFFER': 'Buffer',
            'NAND_2': '2-Input NAND Gate',
            'NAND_3': '3-Input NAND Gate',
            'NOR_2': '2-Input NOR Gate',
            'NOR_3': '3-Input NOR Gate',
            'XOR_2': 'XOR Gate',
            'XNOR_2': 'XNOR Gate',
            'LED_RED': 'Red LED',
            'LED_GREEN': 'Green LED',
            'LED_YELLOW': 'Yellow LED',
            'LED_BLUE': 'Blue LED',
            'LED_RGB': 'RGB LED',
            'DISPLAY_7SEG': '7-Segment Display',
            'BUZZER': 'Buzzer',
            'MOTOR_DC': 'DC Motor',
        };
        return typeMap[type] || type.replace(/_/g, ' ');
    }

    private topologicalSort(circuit: CircuitState): string[] {
        const inDegree = new Map<string, number>();
        for (const comp of circuit.components) {
            inDegree.set(comp.id, 0);
        }

        // Count in-degree based on unique source components (from adjacency list)
        this.adjacency.forEach((neighbors, _fromCompId) => {
            for (const toCompId of neighbors) {
                const current = inDegree.get(toCompId) ?? 0;
                inDegree.set(toCompId, current + 1);
            }
        });

        const queue: string[] = [];
        inDegree.forEach((degree, compId) => {
            if (degree === 0) {
                queue.push(compId);
            }
        });

        const result: string[] = [];
        while (queue.length > 0) {
            const current = queue.shift()!;
            result.push(current);

            for (const neighbor of this.adjacency.get(current) ?? []) {
                const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
                inDegree.set(neighbor, newDegree);
                if (newDegree === 0) {
                    queue.push(neighbor);
                }
            }
        }

        // For acyclic circuits, this should include all components
        // If not all components are included, the circuit has cycles (handled elsewhere)
        return result;
    }

    private initializeInputDevice(
        comp: CircuitComponent,
        pinStates: Record<string, Record<string, SignalState>>
    ): void {
        const props = comp.properties as Record<string, unknown>;
        const compPins = pinStates[comp.id] ?? {};
        pinStates[comp.id] = compPins;

        if (comp.type === 'CONST_HIGH') {
            for (const pin of comp.pins) {
                if (pin.type === 'output') {
                    compPins[pin.id] = 'HIGH';
                }
            }
        } else if (comp.type === 'CONST_LOW') {
            for (const pin of comp.pins) {
                if (pin.type === 'output') {
                    compPins[pin.id] = 'LOW';
                }
            }
        } else if (comp.type === 'SWITCH_TOGGLE') {
            const isOn = props.state === true;
            for (const pin of comp.pins) {
                if (pin.type === 'output') {
                    compPins[pin.id] = isOn ? 'HIGH' : 'LOW';
                }
            }
        } else if (comp.type === 'SWITCH_PUSH') {
            // Check both 'pressed' and 'state' for compatibility
            const isPressed = props.pressed === true || props.state === true;
            for (const pin of comp.pins) {
                if (pin.type === 'output') {
                    compPins[pin.id] = isPressed ? 'HIGH' : 'LOW';
                }
            }
        } else if (comp.type === 'CLOCK') {
            const phase = (props.phase as number) ?? 0;
            for (const pin of comp.pins) {
                if (pin.type === 'output') {
                    compPins[pin.id] = phase % 2 === 0 ? 'HIGH' : 'LOW';
                }
            }
        } else if (comp.type === 'VCC_5V' || comp.type === 'VCC_3V3') {
            // Power sources output HIGH
            for (const pin of comp.pins) {
                if (pin.type === 'output') {
                    compPins[pin.id] = 'HIGH';
                }
            }
        } else if (comp.type === 'DIP_SWITCH_4') {
            // 4-bit DIP switch: sw0, sw1, sw2, sw3 -> Q0, Q1, Q2, Q3
            for (const pin of comp.pins) {
                if (pin.type === 'output') {
                    const match = pin.name.match(/Q(\d)/i) || pin.id.match(/q(\d)/i);
                    if (match && match[1]) {
                        const idx = parseInt(match[1], 10);
                        const switchState = props[`sw${idx}`] === true;
                        compPins[pin.id] = switchState ? 'HIGH' : 'LOW';
                    } else {
                        compPins[pin.id] = 'LOW';
                    }
                }
            }
        } else {
            // Default: all outputs LOW
            for (const pin of comp.pins) {
                if (pin.type === 'output') {
                    compPins[pin.id] = 'LOW';
                }
            }
        }
    }

    private getInputSignals(
        comp: CircuitComponent,
        pinStates: Record<string, Record<string, SignalState>>
    ): SignalState[] {
        const inputs: SignalState[] = [];

        for (const pin of comp.pins) {
            if (pin.type === 'input') {
                let signal: SignalState = 'UNDEFINED';

                // Find wire connected to this input
                this.pinConnections.forEach((connections, fromKey) => {
                    for (const conn of connections) {
                        if (conn.compId === comp.id && conn.pinId === pin.id) {
                            const parts = fromKey.split(':');
                            const fromCompId = parts[0] || '';
                            const fromPinId = parts[1] || '';
                            signal = pinStates[fromCompId]?.[fromPinId] ?? 'UNDEFINED';
                        }
                    }
                });
                inputs.push(signal);
            }
        }

        return inputs;
    }

    private evaluateGate(
        comp: CircuitComponent,
        pinStates: Record<string, Record<string, SignalState>>
    ): void {
        const inputs = this.getInputSignals(comp, pinStates);
        let output: SignalState = 'UNDEFINED';

        switch (comp.type) {
            case 'AND_2':
            case 'AND_3':
            case 'AND_4':
                output = LogicGate.evaluateAnd(inputs);
                break;
            case 'OR_2':
            case 'OR_3':
            case 'OR_4':
                output = LogicGate.evaluateOr(inputs);
                break;
            case 'NOT':
                output = LogicGate.evaluateNot(inputs[0] ?? 'UNDEFINED');
                break;
            case 'BUFFER':
                output = LogicGate.evaluateBuffer(inputs[0] ?? 'UNDEFINED');
                break;
            case 'NAND_2':
            case 'NAND_3':
                output = LogicGate.evaluateNand(inputs);
                break;
            case 'NOR_2':
            case 'NOR_3':
                output = LogicGate.evaluateNor(inputs);
                break;
            case 'XOR_2':
                output = LogicGate.evaluateXor(inputs);
                break;
            case 'XNOR_2':
                output = LogicGate.evaluateXnor(inputs);
                break;
        }

        // Set output pin states
        const compPins = pinStates[comp.id] ?? {};
        pinStates[comp.id] = compPins;
        for (const pin of comp.pins) {
            if (pin.type === 'output') {
                compPins[pin.id] = output;
            }
        }
    }

    private evaluateOutputDevice(
        comp: CircuitComponent,
        pinStates: Record<string, Record<string, SignalState>>
    ): void {
        const inputs = this.getInputSignals(comp, pinStates);

        // Store input states for visualization
        const compPins = pinStates[comp.id] ?? {};
        pinStates[comp.id] = compPins;
        let i = 0;
        for (const pin of comp.pins) {
            if (pin.type === 'input' && i < inputs.length) {
                compPins[pin.id] = inputs[i] ?? 'UNDEFINED';
                i++;
            }
        }
    }

    private evaluateCombinational(
        comp: CircuitComponent,
        pinStates: Record<string, Record<string, SignalState>>
    ): void {
        const inputs = this.getInputSignals(comp, pinStates);
        const compPins = pinStates[comp.id] ?? {};
        pinStates[comp.id] = compPins;

        if (comp.type === 'MUX_2TO1') {
            // Inputs: A, B, S (select) -> Output: Y
            const a = inputs[0] ?? 'UNDEFINED';
            const b = inputs[1] ?? 'UNDEFINED';
            const sel = inputs[2] ?? 'UNDEFINED';
            const output = LogicGate.evaluateMux2to1(a, b, sel);

            for (const pin of comp.pins) {
                if (pin.type === 'output') {
                    compPins[pin.id] = output;
                }
            }
        } else if (comp.type === 'DECODER_2TO4') {
            // 2-to-4 Decoder: A0, A1 inputs -> Y0, Y1, Y2, Y3 outputs
            // Only one output is HIGH based on the binary input

            // Get input pins and find A0, A1 by pin id/name
            const inputPins = comp.pins.filter(p => p.type === 'input');
            let a0: SignalState = 'LOW';
            let a1: SignalState = 'LOW';

            for (let i = 0; i < inputPins.length; i++) {
                const pin = inputPins[i];
                if (!pin) continue;
                const signal = inputs[i] ?? 'LOW';
                if (pin.id.match(/a0/i) || pin.name.match(/A0/i)) {
                    a0 = signal;
                } else if (pin.id.match(/a1/i) || pin.name.match(/A1/i)) {
                    a1 = signal;
                }
            }

            // Convert inputs to binary value (0-3)
            const a0Val = a0 === 'HIGH' ? 1 : 0;
            const a1Val = a1 === 'HIGH' ? 1 : 0;
            const selectValue = a0Val + (a1Val * 2); // A1 is MSB, A0 is LSB

            // Set outputs - only the selected output is HIGH
            const outputPins = comp.pins.filter(p => p.type === 'output');
            for (const pin of outputPins) {
                // Extract output index from pin id/name (e.g., 'y0' -> 0)
                const match = pin.id.match(/y(\d)/i) || pin.name.match(/Y(\d)/i);
                if (match && match[1]) {
                    const outputIndex = parseInt(match[1], 10);
                    compPins[pin.id] = (outputIndex === selectValue) ? 'HIGH' : 'LOW';
                } else {
                    // Fallback: use pin order
                    const idx = outputPins.indexOf(pin);
                    compPins[pin.id] = (idx === selectValue) ? 'HIGH' : 'LOW';
                }
            }
        } else if (comp.type === 'DEMUX_1TO2') {
            // 1-to-2 Demultiplexer: D (data), S (select) -> Y0, Y1 outputs
            const d = inputs[0] ?? 'LOW';
            const s = inputs[1] ?? 'LOW';

            const outputPins = comp.pins.filter(p => p.type === 'output');
            if (s === 'LOW') {
                // Select Y0
                if (outputPins[0]) compPins[outputPins[0].id] = d;
                if (outputPins[1]) compPins[outputPins[1].id] = 'LOW';
            } else {
                // Select Y1
                if (outputPins[0]) compPins[outputPins[0].id] = 'LOW';
                if (outputPins[1]) compPins[outputPins[1].id] = d;
            }
        } else if (comp.type === 'ADDER_4BIT') {
            // 4-bit Adder: A0-A3, B0-B3 -> S0-S3, Cout
            const inputPins = comp.pins.filter(p => p.type === 'input');
            let a = 0, b = 0;
            for (let i = 0; i < inputPins.length; i++) {
                const pin = inputPins[i];
                if (!pin) continue;
                const signal = inputs[i] ?? 'LOW';
                const val = signal === 'HIGH' ? 1 : 0;
                const aMatch = pin.name.match(/A(\d)/i) || pin.id.match(/a(\d)/i);
                const bMatch = pin.name.match(/B(\d)/i) || pin.id.match(/b(\d)/i);
                if (aMatch && aMatch[1]) a |= (val << parseInt(aMatch[1], 10));
                if (bMatch && bMatch[1]) b |= (val << parseInt(bMatch[1], 10));
            }
            const sum = a + b;
            const outputPins = comp.pins.filter(p => p.type === 'output');
            for (const pin of outputPins) {
                const sMatch = pin.name.match(/S(\d)/i) || pin.id.match(/s(\d)/i);
                if (sMatch && sMatch[1]) {
                    const bit = parseInt(sMatch[1], 10);
                    compPins[pin.id] = ((sum >> bit) & 1) === 1 ? 'HIGH' : 'LOW';
                } else if (pin.name.match(/Cout/i) || pin.id.match(/cout/i)) {
                    compPins[pin.id] = sum > 15 ? 'HIGH' : 'LOW';
                }
            }
        } else if (comp.type === 'COMPARATOR_4BIT') {
            // 4-bit Comparator: A0-A3, B0-B3 -> A>B, A=B, A<B
            const inputPins = comp.pins.filter(p => p.type === 'input');
            let a = 0, b = 0;
            for (let i = 0; i < inputPins.length; i++) {
                const pin = inputPins[i];
                if (!pin) continue;
                const signal = inputs[i] ?? 'LOW';
                const val = signal === 'HIGH' ? 1 : 0;
                const aMatch = pin.name.match(/A(\d)/i) || pin.id.match(/a(\d)/i);
                const bMatch = pin.name.match(/B(\d)/i) || pin.id.match(/b(\d)/i);
                if (aMatch && aMatch[1]) a |= (val << parseInt(aMatch[1], 10));
                if (bMatch && bMatch[1]) b |= (val << parseInt(bMatch[1], 10));
            }
            const outputPins = comp.pins.filter(p => p.type === 'output');
            for (const pin of outputPins) {
                if (pin.name === 'A>B' || pin.id.match(/a>b/i)) {
                    compPins[pin.id] = a > b ? 'HIGH' : 'LOW';
                } else if (pin.name === 'A=B' || pin.id.match(/a=b/i)) {
                    compPins[pin.id] = a === b ? 'HIGH' : 'LOW';
                } else if (pin.name === 'A<B' || pin.id.match(/a<b/i)) {
                    compPins[pin.id] = a < b ? 'HIGH' : 'LOW';
                }
            }
        } else if (comp.type === 'BCD_TO_7SEG') {
            // BCD to 7-Segment Decoder: D0-D3 -> A,B,C,D,E,F,G
            // Truth table for digits 0-9
            const segmentTable: Record<number, string> = {
                0: 'ABCDEF',  // 0: all except G
                1: 'BC',      // 1: right side
                2: 'ABDEG',   // 2
                3: 'ABCDG',   // 3
                4: 'BCFG',    // 4
                5: 'ACDFG',   // 5
                6: 'ACDEFG',  // 6
                7: 'ABC',     // 7
                8: 'ABCDEFG', // 8: all
                9: 'ABCDFG',  // 9
            };
            const inputPins = comp.pins.filter(p => p.type === 'input');
            let value = 0;
            for (let i = 0; i < inputPins.length; i++) {
                const pin = inputPins[i];
                if (!pin) continue;
                const signal = inputs[i] ?? 'LOW';
                const val = signal === 'HIGH' ? 1 : 0;
                const match = pin.name.match(/D(\d)/i);
                if (match && match[1]) {
                    value |= (val << parseInt(match[1], 10));
                }
            }
            // Clamp to 0-9
            if (value > 9) value = value % 10;
            const activeSegs = segmentTable[value] || '';
            const outputPins = comp.pins.filter(p => p.type === 'output');
            for (const pin of outputPins) {
                const segName = pin.name.toUpperCase();
                compPins[pin.id] = activeSegs.includes(segName) ? 'HIGH' : 'LOW';
            }
        }
    }

    private evaluateSequential(
        comp: CircuitComponent,
        pinStates: Record<string, Record<string, SignalState>>
    ): void {
        const inputs = this.getInputSignals(comp, pinStates);
        const compPins = pinStates[comp.id] ?? {};
        pinStates[comp.id] = compPins;

        // Get previous state from properties
        const props = comp.properties as Record<string, unknown>;
        const prevQ = (props._prevQ as SignalState) ?? 'LOW';
        const prevClk = (props._prevClk as SignalState) ?? 'LOW';

        if (comp.type === 'SR_LATCH') {
            // Inputs: S, R -> Outputs: Q, Q'
            const s = inputs[0] ?? 'UNDEFINED';
            const r = inputs[1] ?? 'UNDEFINED';
            const result = LogicGate.evaluateSRLatch(s, r, prevQ);

            const outputPins = comp.pins.filter(p => p.type === 'output');
            if (outputPins[0]) compPins[outputPins[0].id] = result.q;
            if (outputPins[1]) compPins[outputPins[1].id] = result.qBar;
        } else if (comp.type === 'D_FLIPFLOP') {
            // Inputs: D, CLK -> Outputs: Q, Q'
            const d = inputs[0] ?? 'UNDEFINED';
            const clk = inputs[1] ?? 'UNDEFINED';
            const result = LogicGate.evaluateDFlipFlop(d, clk, prevClk, prevQ);

            const outputPins = comp.pins.filter(p => p.type === 'output');
            if (outputPins[0]) compPins[outputPins[0].id] = result.q;
            if (outputPins[1]) compPins[outputPins[1].id] = result.qBar;
        } else if (comp.type === 'JK_FLIPFLOP') {
            // Inputs: J, CLK, K -> Outputs: Q, Q'
            const j = inputs[0] ?? 'UNDEFINED';
            const clk = inputs[1] ?? 'UNDEFINED';
            const k = inputs[2] ?? 'UNDEFINED';
            const result = LogicGate.evaluateJKFlipFlop(j, k, clk, prevClk, prevQ);

            const outputPins = comp.pins.filter(p => p.type === 'output');
            if (outputPins[0]) compPins[outputPins[0].id] = result.q;
            if (outputPins[1]) compPins[outputPins[1].id] = result.qBar;
        } else if (comp.type === 'COUNTER_4BIT') {
            // 4-bit counter: CLK input -> Q0, Q1, Q2, Q3 outputs
            // Get current count from properties (default to 0)
            const count = ((props._count as number) ?? 0) % 16;

            // Output the current count as binary on Q0-Q3
            // Find output pins by name pattern (q0, q1, q2, q3 or Q0, Q1, Q2, Q3)
            const outputPins = comp.pins.filter(p => p.type === 'output');
            for (const pin of outputPins) {
                // Extract bit index from pin id/name (e.g., 'q0' -> 0, 'q1' -> 1)
                const match = pin.id.match(/q(\d)/i) || pin.name.match(/Q(\d)/i);
                if (match && match[1]) {
                    const bitIndex = parseInt(match[1], 10);
                    const bitValue = (count >> bitIndex) & 1;
                    compPins[pin.id] = bitValue === 1 ? 'HIGH' : 'LOW';
                } else {
                    // Fallback: use pin order
                    const idx = outputPins.indexOf(pin);
                    const bitValue = (count >> idx) & 1;
                    compPins[pin.id] = bitValue === 1 ? 'HIGH' : 'LOW';
                }
            }
        } else if (comp.type === 'SHIFT_REGISTER_8BIT') {
            // 8-bit shift register: D, CLK inputs -> Q0-Q7 outputs
            const shiftValue = ((props._shiftValue as number) ?? 0) % 256;

            const outputPins = comp.pins.filter(p => p.type === 'output');
            for (let i = 0; i < outputPins.length && i < 8; i++) {
                const pin = outputPins[i];
                if (pin) {
                    const bitValue = (shiftValue >> i) & 1;
                    compPins[pin.id] = bitValue === 1 ? 'HIGH' : 'LOW';
                }
            }
        } else if (comp.type === 'TRAFFIC_LIGHT_CTRL') {
            // Traffic light controller: CLK input -> R, Y, G outputs
            // Cycles through: Red (4 ticks) -> Yellow (2 ticks) -> Green (4 ticks) -> Yellow (2 ticks)
            const count = ((props._count as number) ?? 0) % 12; // 12-state cycle

            const outputPins = comp.pins.filter(p => p.type === 'output');
            // Outputs: R (red), Y (yellow), G (green)
            let red: SignalState = 'LOW';
            let yellow: SignalState = 'LOW';
            let green: SignalState = 'LOW';

            if (count < 4) {
                // States 0-3: Red
                red = 'HIGH';
            } else if (count < 6) {
                // States 4-5: Yellow (transition from red to green)
                yellow = 'HIGH';
            } else if (count < 10) {
                // States 6-9: Green
                green = 'HIGH';
            } else {
                // States 10-11: Yellow (transition from green to red)
                yellow = 'HIGH';
            }

            // Assign to output pins (R, Y, G order)
            if (outputPins[0]) compPins[outputPins[0].id] = red;
            if (outputPins[1]) compPins[outputPins[1].id] = yellow;
            if (outputPins[2]) compPins[outputPins[2].id] = green;
        }
    }

    private evaluateJunction(
        comp: CircuitComponent,
        pinStates: Record<string, Record<string, SignalState>>
    ): void {
        const inputs = this.getInputSignals(comp, pinStates);
        const compPins = pinStates[comp.id] ?? {};
        pinStates[comp.id] = compPins;

        // Junction passes input signal to all outputs
        const inputSignal = inputs[0] ?? 'UNDEFINED';

        for (const pin of comp.pins) {
            if (pin.type === 'output') {
                compPins[pin.id] = inputSignal;
            }
        }
    }
}

// Singleton instance
export const simulationEngine = new SimulationEngine();
