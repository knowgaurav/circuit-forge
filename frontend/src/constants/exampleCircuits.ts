/**
 * Example Circuits for Component Documentation
 * Uses CircuitBlueprint format for consistency with LLM-generated courses
 */

import type { CircuitBlueprint } from '@/types';

// Simple circuit showing component in typical usage
export interface ExampleCircuit {
    id: string;
    name: string;
    description: string;
    blueprint: CircuitBlueprint;
}

// Helper to create blueprints concisely
function pos(x: number, y: number) {
    return { x, y };
}

// ============================================================================
// LOGIC GATES
// ============================================================================

export const OR_GATE_EXAMPLE: ExampleCircuit = {
    id: 'or-gate-example',
    name: 'OR Gate Demo',
    description: 'Two switches controlling an LED through an OR gate',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
            { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
            { type: 'OR_2', label: 'OR1', position: pos(180, 90) },
            { type: 'LED_RED', label: 'LED1', position: pos(300, 90) },
        ],
        wires: [
            { from: 'SW1:OUT', to: 'OR1:A' },
            { from: 'SW2:OUT', to: 'OR1:B' },
            { from: 'OR1:Y', to: 'LED1:IN' },
        ],
    },
};

export const AND_GATE_EXAMPLE: ExampleCircuit = {
    id: 'and-gate-example',
    name: 'AND Gate Demo',
    description: 'Both switches must be ON to light the LED',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
            { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
            { type: 'AND_2', label: 'AND1', position: pos(180, 90) },
            { type: 'LED_GREEN', label: 'LED1', position: pos(300, 90) },
        ],
        wires: [
            { from: 'SW1:OUT', to: 'AND1:A' },
            { from: 'SW2:OUT', to: 'AND1:B' },
            { from: 'AND1:Y', to: 'LED1:IN' },
        ],
    },
};

export const NOT_GATE_EXAMPLE: ExampleCircuit = {
    id: 'not-gate-example',
    name: 'NOT Gate Demo',
    description: 'Inverts the switch signal',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 90) },
            { type: 'NOT', label: 'NOT1', position: pos(160, 90) },
            { type: 'LED_RED', label: 'LED1', position: pos(270, 90) },
        ],
        wires: [
            { from: 'SW1:OUT', to: 'NOT1:A' },
            { from: 'NOT1:Y', to: 'LED1:IN' },
        ],
    },
};

export const NAND_GATE_EXAMPLE: ExampleCircuit = {
    id: 'nand-gate-example',
    name: 'NAND Gate Demo',
    description: 'LED is OFF only when both switches are ON',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
            { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
            { type: 'NAND_2', label: 'NAND1', position: pos(180, 90) },
            { type: 'LED_YELLOW', label: 'LED1', position: pos(300, 90) },
        ],
        wires: [
            { from: 'SW1:OUT', to: 'NAND1:A' },
            { from: 'SW2:OUT', to: 'NAND1:B' },
            { from: 'NAND1:Y', to: 'LED1:IN' },
        ],
    },
};

export const NOR_GATE_EXAMPLE: ExampleCircuit = {
    id: 'nor-gate-example',
    name: 'NOR Gate Demo',
    description: 'LED is ON only when both switches are OFF',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
            { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
            { type: 'NOR_2', label: 'NOR1', position: pos(180, 90) },
            { type: 'LED_BLUE', label: 'LED1', position: pos(300, 90) },
        ],
        wires: [
            { from: 'SW1:OUT', to: 'NOR1:A' },
            { from: 'SW2:OUT', to: 'NOR1:B' },
            { from: 'NOR1:Y', to: 'LED1:IN' },
        ],
    },
};

export const XOR_GATE_EXAMPLE: ExampleCircuit = {
    id: 'xor-gate-example',
    name: 'XOR Gate Demo',
    description: 'LED is ON when exactly one switch is ON',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
            { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
            { type: 'XOR_2', label: 'XOR1', position: pos(180, 90) },
            { type: 'LED_GREEN', label: 'LED1', position: pos(300, 90) },
        ],
        wires: [
            { from: 'SW1:OUT', to: 'XOR1:A' },
            { from: 'SW2:OUT', to: 'XOR1:B' },
            { from: 'XOR1:Y', to: 'LED1:IN' },
        ],
    },
};

export const XNOR_GATE_EXAMPLE: ExampleCircuit = {
    id: 'xnor-gate-example',
    name: 'XNOR Gate Demo',
    description: 'LED is ON when both switches have the same state',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(50, 60) },
            { type: 'SWITCH_TOGGLE', label: 'SW2', position: pos(50, 120) },
            { type: 'XNOR_2', label: 'XNOR1', position: pos(180, 90) },
            { type: 'LED_GREEN', label: 'LED1', position: pos(300, 90) },
        ],
        wires: [
            { from: 'SW1:OUT', to: 'XNOR1:A' },
            { from: 'SW2:OUT', to: 'XNOR1:B' },
            { from: 'XNOR1:Y', to: 'LED1:IN' },
        ],
    },
};

// ============================================================================
// INPUT DEVICES
// ============================================================================

export const SWITCH_TOGGLE_EXAMPLE: ExampleCircuit = {
    id: 'switch-toggle-example',
    name: 'Toggle Switch Demo',
    description: 'Toggle switch controlling an LED',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(80, 90) },
            { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
        ],
        wires: [
            { from: 'SW1:OUT', to: 'LED1:IN' },
        ],
    },
};

export const PUSH_BUTTON_EXAMPLE: ExampleCircuit = {
    id: 'push-button-example',
    name: 'Push Button Demo',
    description: 'Momentary button - LED on while pressed',
    blueprint: {
        components: [
            { type: 'SWITCH_PUSH', label: 'BTN1', position: pos(80, 90) },
            { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
        ],
        wires: [
            { from: 'BTN1:OUT', to: 'LED1:IN' },
        ],
    },
};

export const CLOCK_EXAMPLE: ExampleCircuit = {
    id: 'clock-example',
    name: 'Clock Signal Demo',
    description: 'Clock generator blinking an LED',
    blueprint: {
        components: [
            { type: 'CLOCK', label: 'CLK1', position: pos(80, 90) },
            { type: 'LED_GREEN', label: 'LED1', position: pos(220, 90) },
        ],
        wires: [
            { from: 'CLK1:OUT', to: 'LED1:IN' },
        ],
    },
};

export const CONST_HIGH_EXAMPLE: ExampleCircuit = {
    id: 'const-high-example',
    name: 'Constant HIGH Demo',
    description: 'Always-on signal source',
    blueprint: {
        components: [
            { type: 'CONST_HIGH', label: 'VCC', position: pos(80, 90) },
            { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
        ],
        wires: [
            { from: 'VCC:OUT', to: 'LED1:IN' },
        ],
    },
};

export const CONST_LOW_EXAMPLE: ExampleCircuit = {
    id: 'const-low-example',
    name: 'Constant LOW Demo',
    description: 'Always-off signal (ground reference)',
    blueprint: {
        components: [
            { type: 'CONST_LOW', label: 'GND', position: pos(80, 90) },
            { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
        ],
        wires: [
            { from: 'GND:OUT', to: 'LED1:IN' },
        ],
    },
};

// ============================================================================
// OUTPUT DEVICES
// ============================================================================

export const LED_EXAMPLE: ExampleCircuit = {
    id: 'led-example',
    name: 'LED Indicator Demo',
    description: 'LED controlled by a switch',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'SW1', position: pos(80, 90) },
            { type: 'LED_RED', label: 'LED1', position: pos(220, 90) },
        ],
        wires: [
            { from: 'SW1:OUT', to: 'LED1:IN' },
        ],
    },
};

export const DISPLAY_7SEG_EXAMPLE: ExampleCircuit = {
    id: '7seg-example',
    name: '7-Segment Display Demo',
    description: '4-bit counter driving a display',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'D0', position: pos(50, 40) },
            { type: 'SWITCH_TOGGLE', label: 'D1', position: pos(50, 90) },
            { type: 'SWITCH_TOGGLE', label: 'D2', position: pos(50, 140) },
            { type: 'SWITCH_TOGGLE', label: 'D3', position: pos(50, 190) },
            { type: 'DISPLAY_7SEG', label: 'DISP1', position: pos(220, 100) },
        ],
        wires: [
            { from: 'D0:OUT', to: 'DISP1:D0' },
            { from: 'D1:OUT', to: 'DISP1:D1' },
            { from: 'D2:OUT', to: 'DISP1:D2' },
            { from: 'D3:OUT', to: 'DISP1:D3' },
        ],
    },
};

// ============================================================================
// SEQUENTIAL LOGIC
// ============================================================================

export const D_FLIPFLOP_EXAMPLE: ExampleCircuit = {
    id: 'd-flipflop-example',
    name: 'D Flip-Flop Demo',
    description: 'Data latched on clock rising edge',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'DATA', position: pos(50, 60) },
            { type: 'SWITCH_PUSH', label: 'CLK', position: pos(50, 130) },
            { type: 'D_FLIPFLOP', label: 'DFF1', position: pos(180, 90) },
            { type: 'LED_GREEN', label: 'Q', position: pos(310, 70) },
            { type: 'LED_RED', label: 'Qn', position: pos(310, 120) },
        ],
        wires: [
            { from: 'DATA:OUT', to: 'DFF1:D' },
            { from: 'CLK:OUT', to: 'DFF1:CLK' },
            { from: 'DFF1:Q', to: 'Q:IN' },
            { from: 'DFF1:Qn', to: 'Qn:IN' },
        ],
    },
};

export const SR_LATCH_EXAMPLE: ExampleCircuit = {
    id: 'sr-latch-example',
    name: 'SR Latch Demo',
    description: 'Set-Reset memory element',
    blueprint: {
        components: [
            { type: 'SWITCH_PUSH', label: 'SET', position: pos(50, 60) },
            { type: 'SWITCH_PUSH', label: 'RST', position: pos(50, 130) },
            { type: 'SR_LATCH', label: 'SR1', position: pos(180, 90) },
            { type: 'LED_GREEN', label: 'Q', position: pos(310, 70) },
            { type: 'LED_RED', label: 'Qn', position: pos(310, 120) },
        ],
        wires: [
            { from: 'SET:OUT', to: 'SR1:S' },
            { from: 'RST:OUT', to: 'SR1:R' },
            { from: 'SR1:Q', to: 'Q:IN' },
            { from: 'SR1:Qn', to: 'Qn:IN' },
        ],
    },
};

export const JK_FLIPFLOP_EXAMPLE: ExampleCircuit = {
    id: 'jk-flipflop-example',
    name: 'JK Flip-Flop Demo',
    description: 'Versatile flip-flop with toggle mode',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'J', position: pos(50, 50) },
            { type: 'SWITCH_PUSH', label: 'CLK', position: pos(50, 100) },
            { type: 'SWITCH_TOGGLE', label: 'K', position: pos(50, 150) },
            { type: 'JK_FLIPFLOP', label: 'JK1', position: pos(180, 100) },
            { type: 'LED_GREEN', label: 'Q', position: pos(310, 80) },
            { type: 'LED_RED', label: 'Qn', position: pos(310, 130) },
        ],
        wires: [
            { from: 'J:OUT', to: 'JK1:J' },
            { from: 'CLK:OUT', to: 'JK1:CLK' },
            { from: 'K:OUT', to: 'JK1:K' },
            { from: 'JK1:Q', to: 'Q:IN' },
            { from: 'JK1:Qn', to: 'Qn:IN' },
        ],
    },
};

export const COUNTER_EXAMPLE: ExampleCircuit = {
    id: 'counter-example',
    name: '4-Bit Counter Demo',
    description: 'Counter with 7-segment display',
    blueprint: {
        components: [
            { type: 'SWITCH_PUSH', label: 'CLK', position: pos(50, 80) },
            { type: 'SWITCH_PUSH', label: 'RST', position: pos(50, 140) },
            { type: 'COUNTER_4BIT', label: 'CNT1', position: pos(180, 100) },
            { type: 'DISPLAY_7SEG', label: 'DISP1', position: pos(320, 100) },
        ],
        wires: [
            { from: 'CLK:OUT', to: 'CNT1:CLK' },
            { from: 'RST:OUT', to: 'CNT1:RST' },
            { from: 'CNT1:Q0', to: 'DISP1:D0' },
            { from: 'CNT1:Q1', to: 'DISP1:D1' },
            { from: 'CNT1:Q2', to: 'DISP1:D2' },
            { from: 'CNT1:Q3', to: 'DISP1:D3' },
        ],
    },
};

// ============================================================================
// COMBINATIONAL LOGIC
// ============================================================================

export const MUX_EXAMPLE: ExampleCircuit = {
    id: 'mux-example',
    name: '2-to-1 Multiplexer Demo',
    description: 'Select between two inputs',
    blueprint: {
        components: [
            { type: 'SWITCH_TOGGLE', label: 'IN0', position: pos(50, 50) },
            { type: 'SWITCH_TOGGLE', label: 'IN1', position: pos(50, 100) },
            { type: 'SWITCH_TOGGLE', label: 'SEL', position: pos(50, 160) },
            { type: 'MUX_2TO1', label: 'MUX1', position: pos(180, 90) },
            { type: 'LED_GREEN', label: 'OUT', position: pos(310, 90) },
        ],
        wires: [
            { from: 'IN0:OUT', to: 'MUX1:D0' },
            { from: 'IN1:OUT', to: 'MUX1:D1' },
            { from: 'SEL:OUT', to: 'MUX1:S' },
            { from: 'MUX1:Y', to: 'OUT:IN' },
        ],
    },
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
};

export function getExampleCircuit(componentType: string): ExampleCircuit | null {
    return EXAMPLE_CIRCUITS[componentType] || null;
}
