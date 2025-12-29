/**
 * Component definitions for the circuit palette
 */

import type { ComponentType, Pin, Position } from '@/types';

export interface ComponentDefinition {
    type: ComponentType;
    name: string;
    category: string;
    description: string;
    width: number;
    height: number;
    pins: Omit<Pin, 'id'>[];
}

// Helper to create pin positions
const inputPin = (name: string, x: number, y: number): Omit<Pin, 'id'> => ({
    name,
    type: 'input',
    position: { x, y },
});

const outputPin = (name: string, x: number, y: number): Omit<Pin, 'id'> => ({
    name,
    type: 'output',
    position: { x, y },
});

export const COMPONENT_DEFINITIONS: ComponentDefinition[] = [
    // Logic Gates (Basic)
    {
        type: 'AND_2',
        name: 'AND Gate',
        category: 'Logic Gates',
        description: '2-input AND gate',
        width: 60,
        height: 40,
        pins: [
            inputPin('A', -30, -10),
            inputPin('B', -30, 10),
            outputPin('Y', 30, 0),
        ],
    },
    {
        type: 'OR_2',
        name: 'OR Gate',
        category: 'Logic Gates',
        description: '2-input OR gate',
        width: 60,
        height: 40,
        pins: [
            inputPin('A', -30, -10),
            inputPin('B', -30, 10),
            outputPin('Y', 30, 0),
        ],
    },
    {
        type: 'NOT',
        name: 'NOT Gate',
        category: 'Logic Gates',
        description: 'Inverter',
        width: 50,
        height: 30,
        pins: [
            inputPin('A', -25, 0),
            outputPin('Y', 25, 0),
        ],
    },
    {
        type: 'NAND_2',
        name: 'NAND Gate',
        category: 'Logic Gates',
        description: '2-input NAND gate',
        width: 60,
        height: 40,
        pins: [
            inputPin('A', -30, -10),
            inputPin('B', -30, 10),
            outputPin('Y', 30, 0),
        ],
    },
    {
        type: 'NOR_2',
        name: 'NOR Gate',
        category: 'Logic Gates',
        description: '2-input NOR gate',
        width: 60,
        height: 40,
        pins: [
            inputPin('A', -30, -10),
            inputPin('B', -30, 10),
            outputPin('Y', 30, 0),
        ],
    },
    {
        type: 'XOR_2',
        name: 'XOR Gate',
        category: 'Logic Gates',
        description: '2-input XOR gate',
        width: 60,
        height: 40,
        pins: [
            inputPin('A', -30, -10),
            inputPin('B', -30, 10),
            outputPin('Y', 30, 0),
        ],
    },
    {
        type: 'BUFFER',
        name: 'Buffer',
        category: 'Logic Gates',
        description: 'Buffer gate',
        width: 50,
        height: 30,
        pins: [
            inputPin('A', -25, 0),
            outputPin('Y', 25, 0),
        ],
    },

    // Input Devices
    {
        type: 'SWITCH_TOGGLE',
        name: 'Toggle Switch',
        category: 'Input Devices',
        description: 'On/Off toggle switch',
        width: 40,
        height: 40,
        pins: [
            outputPin('OUT', 20, 0),
        ],
    },
    {
        type: 'SWITCH_PUSH',
        name: 'Push Button',
        category: 'Input Devices',
        description: 'Momentary push button',
        width: 40,
        height: 40,
        pins: [
            outputPin('OUT', 20, 0),
        ],
    },
    {
        type: 'CLOCK',
        name: 'Clock',
        category: 'Input Devices',
        description: 'Clock signal generator',
        width: 50,
        height: 40,
        pins: [
            outputPin('CLK', 25, 0),
        ],
    },
    {
        type: 'CONST_HIGH',
        name: 'VCC (High)',
        category: 'Input Devices',
        description: 'Constant HIGH signal',
        width: 30,
        height: 30,
        pins: [
            outputPin('OUT', 15, 0),
        ],
    },
    {
        type: 'CONST_LOW',
        name: 'GND (Low)',
        category: 'Input Devices',
        description: 'Constant LOW signal',
        width: 30,
        height: 30,
        pins: [
            outputPin('OUT', 15, 0),
        ],
    },
    {
        type: 'DIP_SWITCH_4',
        name: '4-bit DIP Switch',
        category: 'Input Devices',
        description: '4-bit DIP switch array',
        width: 60,
        height: 60,
        pins: [
            outputPin('Q0', 30, -20),
            outputPin('Q1', 30, -7),
            outputPin('Q2', 30, 7),
            outputPin('Q3', 30, 20),
        ],
    },
    {
        type: 'NUMERIC_INPUT',
        name: 'Numeric Input',
        category: 'Input Devices',
        description: 'Numeric value input (0-15)',
        width: 50,
        height: 60,
        pins: [
            outputPin('Q0', 25, -20),
            outputPin('Q1', 25, -7),
            outputPin('Q2', 25, 7),
            outputPin('Q3', 25, 20),
        ],
    },

    // Output Devices
    {
        type: 'LED_RED',
        name: 'Red LED',
        category: 'Output Devices',
        description: 'Red light-emitting diode',
        width: 30,
        height: 30,
        pins: [
            inputPin('IN', -15, 0),
        ],
    },
    {
        type: 'LED_GREEN',
        name: 'Green LED',
        category: 'Output Devices',
        description: 'Green light-emitting diode',
        width: 30,
        height: 30,
        pins: [
            inputPin('IN', -15, 0),
        ],
    },
    {
        type: 'LED_BLUE',
        name: 'Blue LED',
        category: 'Output Devices',
        description: 'Blue light-emitting diode',
        width: 30,
        height: 30,
        pins: [
            inputPin('IN', -15, 0),
        ],
    },
    {
        type: 'LED_YELLOW',
        name: 'Yellow LED',
        category: 'Output Devices',
        description: 'Yellow light-emitting diode',
        width: 30,
        height: 30,
        pins: [
            inputPin('IN', -15, 0),
        ],
    },
    {
        type: 'DISPLAY_7SEG',
        name: '7-Segment Display',
        category: 'Output Devices',
        description: '7-segment numeric display',
        width: 50,
        height: 70,
        pins: [
            inputPin('A', -25, -25),
            inputPin('B', -25, -15),
            inputPin('C', -25, -5),
            inputPin('D', -25, 5),
            inputPin('E', -25, 15),
            inputPin('F', -25, 25),
            inputPin('G', -25, 35),
        ],
    },

    // Flip-Flops
    {
        type: 'D_FLIPFLOP',
        name: 'D Flip-Flop',
        category: 'Flip-Flops',
        description: 'D-type flip-flop',
        width: 60,
        height: 50,
        pins: [
            inputPin('D', -30, -15),
            inputPin('CLK', -30, 15),
            outputPin('Q', 30, -15),
            outputPin('Q\'', 30, 15),
        ],
    },
    {
        type: 'SR_LATCH',
        name: 'SR Latch',
        category: 'Flip-Flops',
        description: 'Set-Reset latch',
        width: 60,
        height: 50,
        pins: [
            inputPin('S', -30, -15),
            inputPin('R', -30, 15),
            outputPin('Q', 30, -15),
            outputPin('Q\'', 30, 15),
        ],
    },
    {
        type: 'JK_FLIPFLOP',
        name: 'JK Flip-Flop',
        category: 'Flip-Flops',
        description: 'JK-type flip-flop',
        width: 60,
        height: 60,
        pins: [
            inputPin('J', -30, -20),
            inputPin('CLK', -30, 0),
            inputPin('K', -30, 20),
            outputPin('Q', 30, -15),
            outputPin('Q\'', 30, 15),
        ],
    },

    // Combinational
    {
        type: 'MUX_2TO1',
        name: '2:1 Multiplexer',
        category: 'Combinational',
        description: '2-to-1 multiplexer',
        width: 60,
        height: 50,
        pins: [
            inputPin('A', -30, -15),
            inputPin('B', -30, 0),
            inputPin('S', -30, 15),
            outputPin('Y', 30, 0),
        ],
    },
    {
        type: 'DECODER_2TO4',
        name: '2-to-4 Decoder',
        category: 'Combinational',
        description: '2-to-4 line decoder',
        width: 80,
        height: 70,
        pins: [
            inputPin('A0', -40, -15),
            inputPin('A1', -40, 15),
            outputPin('Y0', 40, -30),
            outputPin('Y1', 40, -10),
            outputPin('Y2', 40, 10),
            outputPin('Y3', 40, 30),
        ],
    },
    {
        type: 'ADDER_4BIT',
        name: '4-bit Adder',
        category: 'Combinational',
        description: '4-bit ripple carry adder',
        width: 100,
        height: 120,
        pins: [
            inputPin('A0', -50, -45),
            inputPin('A1', -50, -30),
            inputPin('A2', -50, -15),
            inputPin('A3', -50, 0),
            inputPin('B0', -50, 15),
            inputPin('B1', -50, 30),
            inputPin('B2', -50, 45),
            inputPin('B3', -50, 60),
            outputPin('S0', 50, -30),
            outputPin('S1', 50, -15),
            outputPin('S2', 50, 0),
            outputPin('S3', 50, 15),
            outputPin('Cout', 50, 30),
        ],
    },
    {
        type: 'COMPARATOR_4BIT',
        name: '4-bit Comparator',
        category: 'Combinational',
        description: '4-bit magnitude comparator',
        width: 100,
        height: 120,
        pins: [
            inputPin('A0', -50, -45),
            inputPin('A1', -50, -30),
            inputPin('A2', -50, -15),
            inputPin('A3', -50, 0),
            inputPin('B0', -50, 15),
            inputPin('B1', -50, 30),
            inputPin('B2', -50, 45),
            inputPin('B3', -50, 60),
            outputPin('A>B', 50, -15),
            outputPin('A=B', 50, 0),
            outputPin('A<B', 50, 15),
        ],
    },

    // Sequential
    {
        type: 'COUNTER_4BIT',
        name: '4-bit Counter',
        category: 'Sequential',
        description: '4-bit binary counter',
        width: 80,
        height: 80,
        pins: [
            inputPin('CLK', -40, 0),
            outputPin('Q0', 40, -30),
            outputPin('Q1', 40, -10),
            outputPin('Q2', 40, 10),
            outputPin('Q3', 40, 30),
        ],
    },
    {
        type: 'SHIFT_REGISTER_8BIT',
        name: '8-bit Shift Register',
        category: 'Sequential',
        description: '8-bit serial-in parallel-out shift register',
        width: 120,
        height: 100,
        pins: [
            inputPin('SI', -60, -20),
            inputPin('CLK', -60, 20),
            outputPin('Q0', 60, -35),
            outputPin('Q1', 60, -20),
            outputPin('Q2', 60, -5),
            outputPin('Q3', 60, 10),
            outputPin('Q4', 60, 25),
            outputPin('Q5', 60, 40),
            outputPin('Q6', 60, 55),
            outputPin('Q7', 60, 70),
        ],
    },

    // Motors
    {
        type: 'MOTOR_DC',
        name: 'DC Motor',
        category: 'Output Devices',
        description: 'DC motor with direction control',
        width: 50,
        height: 50,
        pins: [
            inputPin('FWD', -25, -10),
            inputPin('REV', -25, 10),
        ],
    },

    // Power
    {
        type: 'VCC_5V',
        name: 'VCC +5V',
        category: 'Power',
        description: '+5V power supply',
        width: 30,
        height: 30,
        pins: [
            outputPin('VCC', 0, 15),
        ],
    },
    {
        type: 'VCC_3V3',
        name: 'VCC +3.3V',
        category: 'Power',
        description: '+3.3V power supply',
        width: 30,
        height: 30,
        pins: [
            outputPin('VCC', 0, 15),
        ],
    },
    {
        type: 'GROUND',
        name: 'Ground',
        category: 'Power',
        description: 'Ground connection',
        width: 30,
        height: 30,
        pins: [
            inputPin('GND', 0, -15),
        ],
    },

    // Passive Components
    {
        type: 'RESISTOR',
        name: 'Resistor',
        category: 'Passive Components',
        description: 'Resistor for current limiting',
        width: 60,
        height: 20,
        pins: [
            inputPin('IN', -30, 0),
            outputPin('OUT', 30, 0),
        ],
    },
    {
        type: 'CAPACITOR',
        name: 'Capacitor',
        category: 'Passive Components',
        description: 'Capacitor for filtering',
        width: 30,
        height: 40,
        pins: [
            inputPin('IN', 0, -20),
            outputPin('OUT', 0, 20),
        ],
    },
    {
        type: 'DIODE',
        name: 'Diode',
        category: 'Passive Components',
        description: 'Diode for one-way current flow',
        width: 50,
        height: 20,
        pins: [
            inputPin('A', -25, 0),
            outputPin('K', 25, 0),
        ],
    },

    // Connectors
    {
        type: 'JUNCTION',
        name: 'Wire Junction',
        category: 'Connectors',
        description: 'Wire junction point',
        width: 20,
        height: 20,
        pins: [
            inputPin('IN', -10, 0),
            outputPin('OUT1', 10, -5),
            outputPin('OUT2', 10, 5),
        ],
    },
    {
        type: 'PROBE',
        name: 'Probe',
        category: 'Connectors',
        description: 'Signal probe for debugging',
        width: 30,
        height: 30,
        pins: [
            inputPin('IN', -15, 0),
        ],
    },
];

// Group components by category
export const COMPONENT_CATEGORIES = COMPONENT_DEFINITIONS.reduce(
    (acc, comp) => {
        const category = acc[comp.category];
        if (!category) {
            acc[comp.category] = [comp];
        } else {
            category.push(comp);
        }
        return acc;
    },
    {} as Record<string, ComponentDefinition[]>
);

// Get component definition by type
export function getComponentDefinition(type: ComponentType): ComponentDefinition | undefined {
    return COMPONENT_DEFINITIONS.find((c) => c.type === type);
}

// Label prefix mapping for component types
const LABEL_PREFIXES: Record<string, string> = {
    'AND_2': 'AND',
    'AND_3': 'AND',
    'AND_4': 'AND',
    'OR_2': 'OR',
    'OR_3': 'OR',
    'OR_4': 'OR',
    'NOT': 'NOT',
    'NAND_2': 'NAND',
    'NAND_3': 'NAND',
    'NOR_2': 'NOR',
    'NOR_3': 'NOR',
    'XOR_2': 'XOR',
    'XNOR_2': 'XNOR',
    'BUFFER': 'BUF',
    'SR_LATCH': 'SR',
    'D_FLIPFLOP': 'DFF',
    'JK_FLIPFLOP': 'JKFF',
    'T_FLIPFLOP': 'TFF',
    'MUX_2TO1': 'MUX',
    'MUX_4TO1': 'MUX',
    'DEMUX_1TO2': 'DEMUX',
    'DECODER_2TO4': 'DEC',
    'SWITCH_TOGGLE': 'SW',
    'SWITCH_PUSH': 'BTN',
    'DIP_SWITCH_4': 'DIP',
    'NUMERIC_INPUT': 'NUM',
    'CLOCK': 'CLK',
    'CONST_HIGH': 'VCC',
    'CONST_LOW': 'GND',
    'LED_RED': 'LED',
    'LED_GREEN': 'LED',
    'LED_YELLOW': 'LED',
    'LED_BLUE': 'LED',
    'LED_RGB': 'RGB',
    'DISPLAY_7SEG': '7SEG',
    'BUZZER': 'BUZ',
    'MOTOR_DC': 'MOT',
    'VCC_5V': 'VCC',
    'VCC_3V3': 'VCC',
    'GROUND': 'GND',
    'RESISTOR': 'R',
    'CAPACITOR': 'C',
    'DIODE': 'D',
    'JUNCTION': 'J',
    'PROBE': 'PRB',
};

// Counter for generating unique labels per type
const labelCounters: Record<string, number> = {};

// Generate a unique label for a component type
export function generateComponentLabel(type: ComponentType, existingLabels: string[] = []): string {
    const prefix = LABEL_PREFIXES[type] || type.split('_')[0] || 'COMP';

    // Initialize counter if not exists
    if (!(prefix in labelCounters)) {
        labelCounters[prefix] = 0;
    }

    // Find the next available number
    let counter = (labelCounters[prefix] ?? 0) + 1;
    let label = `${prefix}${counter}`;

    while (existingLabels.includes(label)) {
        counter++;
        label = `${prefix}${counter}`;
    }

    labelCounters[prefix] = counter;
    return label;
}

// Reset label counters (useful when starting a new session)
export function resetLabelCounters(): void {
    Object.keys(labelCounters).forEach(key => {
        labelCounters[key] = 0;
    });
}

// Create a new component instance with generated IDs
export function createComponentInstance(
    type: ComponentType,
    position: Position,
    existingLabels: string[] = []
): { id: string; type: ComponentType; label: string; position: Position; rotation: 0; properties: Record<string, unknown>; pins: Pin[] } | null {
    const def = getComponentDefinition(type);
    if (!def) return null;

    const componentId = `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const label = generateComponentLabel(type, existingLabels);

    return {
        id: componentId,
        type,
        label,
        position,
        rotation: 0,
        properties: {},
        pins: def.pins.map((pin, index): Pin => ({
            id: `${componentId}-pin-${index}`,
            name: pin.name,
            type: pin.type,
            position: pin.position,
        })),
    };
}
