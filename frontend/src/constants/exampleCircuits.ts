/**
 * Example Circuits for Component Documentation
 * Uses CircuitBlueprint format for consistency with LLM-generated courses
 */

import type { CircuitBlueprint, ComponentType } from '@/types';
import { getComponentDefinition } from './components';

// Simple circuit showing component in typical usage
export interface ExampleCircuit {
    id: string;
    name: string;
    description: string;
    blueprint: CircuitBlueprint;
}

// Helper to create position
function pos(x: number, y: number) {
    return { x, y };
}

// Component specification for circuit builder
type ComponentSpec = { type: ComponentType; label: string; position: { x: number; y: number } };

// Wire specification: [fromSpec, toSpec] where spec is "label" or "label:pin"
type WireSpec = [string, string];

/**
 * Resolves a pin specification to full "label:pinId" format
 * - "LABEL" -> uses first output/input pin based on direction
 * - "LABEL:PIN" -> validates pin exists on component
 */
function resolvePin(
    spec: string,
    direction: 'output' | 'input',
    componentMap: Map<string, ComponentType>
): string {
    const parts = spec.split(':');
    const label = parts[0];
    const pinName = parts[1];
    
    const compType = componentMap.get(label);
    if (!compType) {
        throw new Error(`Unknown component label: "${label}". Available: ${[...componentMap.keys()].join(', ')}`);
    }
    
    const def = getComponentDefinition(compType);
    if (!def) {
        throw new Error(`No definition found for component type: ${compType}`);
    }
    
    const pins = def.pins.filter(p => p.type === direction);
    
    if (pinName) {
        // Explicit pin name - validate it exists
        const pin = pins.find(p => 
            (p.id && p.id.toLowerCase() === pinName.toLowerCase()) || 
            (p.name && p.name.toLowerCase() === pinName.toLowerCase())
        );
        if (!pin) {
            const available = pins.map(p => p.id || p.name || 'unknown').join(', ');
            throw new Error(`${direction} pin "${pinName}" not found on ${compType} (${label}). Available: ${available}`);
        }
        return `${label}:${pin.id || pin.name}`;
    }
    
    // No pin specified - use first pin of that direction
    if (pins.length === 0) {
        throw new Error(`No ${direction} pins on ${compType} (${label})`);
    }
    return `${label}:${pins[0].id || pins[0].name}`;
}

/**
 * Creates a circuit blueprint with automatic pin resolution
 * 
 * @example
 * circuit([
 *     { type: 'CLOCK', label: 'CLK', position: pos(50, 90) },
 *     { type: 'COUNTER_4BIT', label: 'CNT', position: pos(150, 90) },
 *     { type: 'LED_RED', label: 'L0', position: pos(250, 90) },
 * ], [
 *     ['CLK', 'CNT:CLK'],     // CLK's first output -> CNT's CLK input
 *     ['CNT:Q0', 'L0'],       // CNT's Q0 output -> L0's first input
 * ])
 */
function circuit(components: ComponentSpec[], wireSpecs: WireSpec[]): CircuitBlueprint {
    // Build label -> type map for pin resolution
    const componentMap = new Map(components.map(c => [c.label, c.type]));
    
    // Resolve all wires with validation
    const wires = wireSpecs.map(([from, to]) => ({
        from: resolvePin(from, 'output', componentMap),
        to: resolvePin(to, 'input', componentMap),
    }));
    
    return {
        components: components.map(c => ({
            type: c.type,
            label: c.label,
            position: c.position,
        })),
        wires,
    };
}

// ============================================================================
// LOGIC GATES
// ============================================================================

export const OR_GATE_EXAMPLE: ExampleCircuit = {
    id: 'or-gate-example',
    name: 'OR Gate Demo',
    description: 'Two switches controlling an LED through an OR gate',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
        { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
        { type: 'OR_2', label: 'OR1', position: pos(180, 90) },
        { type: 'LED_RED', label: 'LED1', position: pos(300, 90) },
    ], [
        ['SW1', 'OR1:A'],
        ['SW2', 'OR1:B'],
        ['OR1', 'LED1'],
    ]),
};

export const AND_GATE_EXAMPLE: ExampleCircuit = {
    id: 'and-gate-example',
    name: 'AND Gate Demo',
    description: 'Both switches must be ON to light the LED',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
        { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
        { type: 'AND_2', label: 'AND1', position: pos(180, 90) },
        { type: 'LED_GREEN', label: 'LED1', position: pos(300, 90) },
    ], [
        ['SW1', 'AND1:A'],
        ['SW2', 'AND1:B'],
        ['AND1', 'LED1'],
    ]),
};

export const NOT_GATE_EXAMPLE: ExampleCircuit = {
    id: 'not-gate-example',
    name: 'NOT Gate Demo',
    description: 'Inverts the switch signal',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 90) },
        { type: 'NOT', label: 'NOT1', position: pos(160, 90) },
        { type: 'LED_RED', label: 'LED1', position: pos(270, 90) },
    ], [
        ['SW1', 'NOT1'],
        ['NOT1', 'LED1'],
    ]),
};

export const NAND_GATE_EXAMPLE: ExampleCircuit = {
    id: 'nand-gate-example',
    name: 'NAND Gate Demo',
    description: 'LED is OFF only when both switches are ON',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
        { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
        { type: 'NAND_2', label: 'NAND1', position: pos(180, 90) },
        { type: 'LED_YELLOW', label: 'LED1', position: pos(300, 90) },
    ], [
        ['SW1', 'NAND1:A'],
        ['SW2', 'NAND1:B'],
        ['NAND1', 'LED1'],
    ]),
};

export const NOR_GATE_EXAMPLE: ExampleCircuit = {
    id: 'nor-gate-example',
    name: 'NOR Gate Demo',
    description: 'LED is ON only when both switches are OFF',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
        { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
        { type: 'NOR_2', label: 'NOR1', position: pos(180, 90) },
        { type: 'LED_BLUE', label: 'LED1', position: pos(300, 90) },
    ], [
        ['SW1', 'NOR1:A'],
        ['SW2', 'NOR1:B'],
        ['NOR1', 'LED1'],
    ]),
};

export const XOR_GATE_EXAMPLE: ExampleCircuit = {
    id: 'xor-gate-example',
    name: 'XOR Gate Demo',
    description: 'LED is ON when exactly one switch is ON',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
        { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
        { type: 'XOR_2', label: 'XOR1', position: pos(180, 90) },
        { type: 'LED_GREEN', label: 'LED1', position: pos(300, 90) },
    ], [
        ['SW1', 'XOR1:A'],
        ['SW2', 'XOR1:B'],
        ['XOR1', 'LED1'],
    ]),
};

export const XNOR_GATE_EXAMPLE: ExampleCircuit = {
    id: 'xnor-gate-example',
    name: 'XNOR Gate Demo',
    description: 'LED is ON when both switches have the same state',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
        { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
        { type: 'XNOR_2', label: 'XNOR1', position: pos(180, 90) },
        { type: 'LED_GREEN', label: 'LED1', position: pos(300, 90) },
    ], [
        ['SW1', 'XNOR1:A'],
        ['SW2', 'XNOR1:B'],
        ['XNOR1', 'LED1'],
    ]),
};

// ============================================================================
// INPUT DEVICES
// ============================================================================

export const SWITCH_TOGGLE_EXAMPLE: ExampleCircuit = {
    id: 'switch-toggle-example',
    name: 'Toggle Switch Demo',
    description: 'Toggle switch controlling an LED',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(80, 90) },
        { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
    ], [
        ['SW1', 'LED1'],
    ]),
};

export const PUSH_BUTTON_EXAMPLE: ExampleCircuit = {
    id: 'push-button-example',
    name: 'Push Button Demo',
    description: 'Momentary button - LED on while pressed',
    blueprint: circuit([
        { type: 'SWITCH_PUSH', label: 'BTN1', position: pos(80, 90) },
        { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
    ], [
        ['BTN1', 'LED1'],
    ]),
};

export const CLOCK_EXAMPLE: ExampleCircuit = {
    id: 'clock-example',
    name: 'Clock Signal Demo',
    description: 'Clock generator blinking an LED',
    blueprint: circuit([
        { type: 'CLOCK', label: 'CLK1', position: pos(80, 90) },
        { type: 'LED_GREEN', label: 'LED1', position: pos(220, 90) },
    ], [
        ['CLK1', 'LED1'],
    ]),
};

export const CONST_HIGH_EXAMPLE: ExampleCircuit = {
    id: 'const-high-example',
    name: 'Constant HIGH Demo',
    description: 'Always-on signal source',
    blueprint: circuit([
        { type: 'CONST_HIGH', label: 'VCC', position: pos(80, 90) },
        { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
    ], [
        ['VCC', 'LED1'],
    ]),
};

export const CONST_LOW_EXAMPLE: ExampleCircuit = {
    id: 'const-low-example',
    name: 'Constant LOW Demo',
    description: 'Always-off signal (ground reference)',
    blueprint: circuit([
        { type: 'CONST_LOW', label: 'GND', position: pos(80, 90) },
        { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
    ], [
        ['GND', 'LED1'],
    ]),
};

// ============================================================================
// OUTPUT DEVICES
// ============================================================================

export const LED_EXAMPLE: ExampleCircuit = {
    id: 'led-example',
    name: 'LED Indicator Demo',
    description: 'LED controlled by a switch',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(80, 90) },
        { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
    ], [
        ['SW1', 'LED1'],
    ]),
};

export const DISPLAY_7SEG_EXAMPLE: ExampleCircuit = {
    id: '7seg-example',
    name: '7-Segment Display Demo',
    description: 'Control individual segments with switches',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'A', position: pos(50, 50) },
        { type: 'SWITCH_TOGGLE', label: 'B', position: pos(50, 90) },
        { type: 'SWITCH_TOGGLE', label: 'G', position: pos(50, 130) },
        { type: 'DISPLAY_7SEG', label: 'DISP', position: pos(200, 90) },
    ], [
        ['A', 'DISP:A'],
        ['B', 'DISP:B'],
        ['G', 'DISP:G'],
    ]),
};

// ============================================================================
// SEQUENTIAL LOGIC
// ============================================================================

export const D_FLIPFLOP_EXAMPLE: ExampleCircuit = {
    id: 'd-flipflop-example',
    name: 'D Flip-Flop Demo',
    description: 'Data latched on clock rising edge',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'DATA', position: pos(50, 60) },
        { type: 'SWITCH_PUSH', label: 'CLK', position: pos(50, 130) },
        { type: 'D_FLIPFLOP', label: 'DFF1', position: pos(180, 90) },
        { type: 'LED_GREEN', label: 'Q', position: pos(310, 70) },
        { type: 'LED_RED', label: 'QB', position: pos(310, 120) },
    ], [
        ['DATA', 'DFF1:D'],
        ['CLK', 'DFF1:CLK'],
        ['DFF1:Q', 'Q'],
        ["DFF1:Q'", 'QB'],
    ]),
};

export const SR_LATCH_EXAMPLE: ExampleCircuit = {
    id: 'sr-latch-example',
    name: 'SR Latch Demo',
    description: 'Set-Reset memory element',
    blueprint: circuit([
        { type: 'SWITCH_PUSH', label: 'SET', position: pos(50, 60) },
        { type: 'SWITCH_PUSH', label: 'RST', position: pos(50, 130) },
        { type: 'SR_LATCH', label: 'SR1', position: pos(180, 90) },
        { type: 'LED_GREEN', label: 'Q', position: pos(310, 70) },
        { type: 'LED_RED', label: 'QB', position: pos(310, 120) },
    ], [
        ['SET', 'SR1:S'],
        ['RST', 'SR1:R'],
        ['SR1:Q', 'Q'],
        ["SR1:Q'", 'QB'],
    ]),
};

export const JK_FLIPFLOP_EXAMPLE: ExampleCircuit = {
    id: 'jk-flipflop-example',
    name: 'JK Flip-Flop Demo',
    description: 'Versatile flip-flop with toggle mode',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'J', position: pos(50, 50) },
        { type: 'SWITCH_PUSH', label: 'CLK', position: pos(50, 100) },
        { type: 'SWITCH_TOGGLE', label: 'K', position: pos(50, 150) },
        { type: 'JK_FLIPFLOP', label: 'JK1', position: pos(180, 100) },
        { type: 'LED_GREEN', label: 'Q', position: pos(310, 80) },
        { type: 'LED_RED', label: 'QB', position: pos(310, 130) },
    ], [
        ['J', 'JK1:J'],
        ['CLK', 'JK1:CLK'],
        ['K', 'JK1:K'],
        ['JK1:Q', 'Q'],
        ["JK1:Q'", 'QB'],
    ]),
};

export const COUNTER_EXAMPLE: ExampleCircuit = {
    id: 'counter-example',
    name: '4-Bit Counter Demo',
    description: 'Counter with LED outputs showing binary',
    blueprint: circuit([
        { type: 'CLOCK', label: 'CLK', position: pos(50, 90) },
        { type: 'COUNTER_4BIT', label: 'CNT1', position: pos(160, 90) },
        { type: 'LED_RED', label: 'Q0', position: pos(280, 50) },
        { type: 'LED_RED', label: 'Q1', position: pos(280, 90) },
        { type: 'LED_RED', label: 'Q2', position: pos(280, 130) },
        { type: 'LED_RED', label: 'Q3', position: pos(280, 170) },
    ], [
        ['CLK', 'CNT1:CLK'],
        ['CNT1:Q0', 'Q0'],
        ['CNT1:Q1', 'Q1'],
        ['CNT1:Q2', 'Q2'],
        ['CNT1:Q3', 'Q3'],
    ]),
};

// ============================================================================
// COMBINATIONAL LOGIC
// ============================================================================

export const MUX_EXAMPLE: ExampleCircuit = {
    id: 'mux-example',
    name: '2-to-1 Multiplexer Demo',
    description: 'Select between two inputs',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'IN0', position: pos(50, 50) },
        { type: 'SWITCH_TOGGLE', label: 'IN1', position: pos(50, 100) },
        { type: 'SWITCH_TOGGLE', label: 'SEL', position: pos(50, 160) },
        { type: 'MUX_2TO1', label: 'MUX1', position: pos(180, 90) },
        { type: 'LED_GREEN', label: 'OUT', position: pos(310, 90) },
    ], [
        ['IN0', 'MUX1:A'],
        ['IN1', 'MUX1:B'],
        ['SEL', 'MUX1:S'],
        ['MUX1', 'OUT'],
    ]),
};

export const SHIFT_REGISTER_EXAMPLE: ExampleCircuit = {
    id: 'shift-register-example',
    name: 'Shift Register Demo',
    description: 'Serial data shifts through on each clock',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'DATA', position: pos(50, 70) },
        { type: 'SWITCH_PUSH', label: 'CLK', position: pos(50, 130) },
        { type: 'SHIFT_REGISTER_8BIT', label: 'SR1', position: pos(180, 100) },
        { type: 'LED_RED', label: 'Q0', position: pos(300, 40) },
        { type: 'LED_RED', label: 'Q1', position: pos(300, 80) },
        { type: 'LED_RED', label: 'Q2', position: pos(300, 120) },
        { type: 'LED_RED', label: 'Q3', position: pos(300, 160) },
    ], [
        ['DATA', 'SR1:SI'],
        ['CLK', 'SR1:CLK'],
        ['SR1:Q0', 'Q0'],
        ['SR1:Q1', 'Q1'],
        ['SR1:Q2', 'Q2'],
        ['SR1:Q3', 'Q3'],
    ]),
};

export const DECODER_EXAMPLE: ExampleCircuit = {
    id: 'decoder-example',
    name: '2-to-4 Decoder Demo',
    description: 'Select one of four outputs based on 2-bit input',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'A0', position: pos(50, 60) },
        { type: 'SWITCH_TOGGLE', label: 'A1', position: pos(50, 120) },
        { type: 'DECODER_2TO4', label: 'DEC1', position: pos(180, 90) },
        { type: 'LED_RED', label: 'Y0', position: pos(300, 30) },
        { type: 'LED_RED', label: 'Y1', position: pos(300, 70) },
        { type: 'LED_RED', label: 'Y2', position: pos(300, 110) },
        { type: 'LED_RED', label: 'Y3', position: pos(300, 150) },
    ], [
        ['A0', 'DEC1:A0'],
        ['A1', 'DEC1:A1'],
        ['DEC1:Y0', 'Y0'],
        ['DEC1:Y1', 'Y1'],
        ['DEC1:Y2', 'Y2'],
        ['DEC1:Y3', 'Y3'],
    ]),
};

export const ADDER_EXAMPLE: ExampleCircuit = {
    id: 'adder-example',
    name: '4-bit Adder Demo',
    description: 'Add two 4-bit numbers',
    blueprint: circuit([
        { type: 'SWITCH_TOGGLE', label: 'A0', position: pos(40, 40) },
        { type: 'SWITCH_TOGGLE', label: 'A1', position: pos(40, 80) },
        { type: 'SWITCH_TOGGLE', label: 'B0', position: pos(40, 130) },
        { type: 'SWITCH_TOGGLE', label: 'B1', position: pos(40, 170) },
        { type: 'ADDER_4BIT', label: 'ADD1', position: pos(180, 100) },
        { type: 'LED_GREEN', label: 'S0', position: pos(300, 60) },
        { type: 'LED_GREEN', label: 'S1', position: pos(300, 100) },
        { type: 'LED_RED', label: 'CO', position: pos(300, 140) },
    ], [
        ['A0', 'ADD1:A0'],
        ['A1', 'ADD1:A1'],
        ['B0', 'ADD1:B0'],
        ['B1', 'ADD1:B1'],
        ['ADD1:S0', 'S0'],
        ['ADD1:S1', 'S1'],
        ['ADD1:Cout', 'CO'],
    ]),
};

export const DIP_SWITCH_EXAMPLE: ExampleCircuit = {
    id: 'dip-switch-example',
    name: 'DIP Switch Demo',
    description: '4 switches with individual outputs',
    blueprint: circuit([
        { type: 'DIP_SWITCH_4', label: 'DIP1', position: pos(100, 90) },
        { type: 'LED_RED', label: 'L0', position: pos(240, 40) },
        { type: 'LED_RED', label: 'L1', position: pos(240, 80) },
        { type: 'LED_RED', label: 'L2', position: pos(240, 120) },
        { type: 'LED_RED', label: 'L3', position: pos(240, 160) },
    ], [
        ['DIP1:Q0', 'L0'],
        ['DIP1:Q1', 'L1'],
        ['DIP1:Q2', 'L2'],
        ['DIP1:Q3', 'L3'],
    ]),
};

// ============================================================================
// REGISTRY - Map component types to their example circuits
// ============================================================================

export const EXAMPLE_CIRCUITS: Record<string, ExampleCircuit> = {
    // Logic Gates
    'AND_2': AND_GATE_EXAMPLE,
    'AND_3': AND_GATE_EXAMPLE,
    'AND_4': AND_GATE_EXAMPLE,
    'OR_2': OR_GATE_EXAMPLE,
    'OR_3': OR_GATE_EXAMPLE,
    'OR_4': OR_GATE_EXAMPLE,
    'NOT': NOT_GATE_EXAMPLE,
    'BUFFER': NOT_GATE_EXAMPLE,
    'NAND_2': NAND_GATE_EXAMPLE,
    'NAND_3': NAND_GATE_EXAMPLE,
    'NOR_2': NOR_GATE_EXAMPLE,
    'NOR_3': NOR_GATE_EXAMPLE,
    'XOR_2': XOR_GATE_EXAMPLE,
    'XNOR_2': XNOR_GATE_EXAMPLE,

    // Input Devices
    'SWITCH_TOGGLE': SWITCH_TOGGLE_EXAMPLE,
    'SWITCH_PUSH': PUSH_BUTTON_EXAMPLE,
    'CLOCK': CLOCK_EXAMPLE,
    'CONST_HIGH': CONST_HIGH_EXAMPLE,
    'CONST_LOW': CONST_LOW_EXAMPLE,

    // Output Devices
    'LED_RED': LED_EXAMPLE,
    'LED_GREEN': LED_EXAMPLE,
    'LED_YELLOW': LED_EXAMPLE,
    'LED_BLUE': LED_EXAMPLE,
    'DISPLAY_7SEG': DISPLAY_7SEG_EXAMPLE,

    // Sequential Logic
    'D_FLIPFLOP': D_FLIPFLOP_EXAMPLE,
    'SR_LATCH': SR_LATCH_EXAMPLE,
    'JK_FLIPFLOP': JK_FLIPFLOP_EXAMPLE,
    'T_FLIPFLOP': JK_FLIPFLOP_EXAMPLE,
    'COUNTER_4BIT': COUNTER_EXAMPLE,

    // Combinational Logic
    'MUX_2TO1': MUX_EXAMPLE,
    'MUX_4TO1': MUX_EXAMPLE,
    'DECODER_2TO4': DECODER_EXAMPLE,
    'ADDER_4BIT': ADDER_EXAMPLE,

    // Complex ICs
    'SHIFT_REGISTER_8BIT': SHIFT_REGISTER_EXAMPLE,
    'DIP_SWITCH_4': DIP_SWITCH_EXAMPLE,
};

export function getExampleCircuit(componentType: string): ExampleCircuit | null {
    return EXAMPLE_CIRCUITS[componentType] || null;
}
