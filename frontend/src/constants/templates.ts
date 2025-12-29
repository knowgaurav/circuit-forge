/**
 * Circuit Template Definitions
 * 
 * Templates organized by 6 categories:
 * - Digital Logic Fundamentals
 * - Computing
 * - Sequential Circuits
 * - Robotics
 * - Automation
 * - Communication
 */

import type { CircuitComponent, Wire } from '@/types';
import { ADDITIONAL_TEMPLATES_V2 } from './additional-templates';

export interface TemplateStep {
    id: string;
    title: string;
    description: string;
    components: string[]; // Component IDs to add in this step
    wires: string[]; // Wire IDs to add in this step
    hint?: string;
}

export interface Template {
    id: string;
    name: string;
    category: TemplateCategory;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    overview: string;
    theory?: string;
    components: CircuitComponent[];
    wires: Wire[];
    steps: TemplateStep[];
    thumbnail?: string;
}

export type TemplateCategory =
    | 'digital-logic'
    | 'computing'
    | 'sequential'
    | 'robotics'
    | 'automation'
    | 'communication';

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, { name: string; description: string; icon: string }> = {
    'digital-logic': {
        name: 'Digital Logic Fundamentals',
        description: 'Learn basic logic gates and combinational circuits',
        icon: '🔌',
    },
    'computing': {
        name: 'Computing',
        description: 'Build ALUs, registers, and basic CPU components',
        icon: '💻',
    },
    'sequential': {
        name: 'Sequential Circuits',
        description: 'Counters, shift registers, and state machines',
        icon: '🔄',
    },
    'robotics': {
        name: 'Robotics',
        description: 'Motor controllers and robot logic circuits',
        icon: '🤖',
    },
    'automation': {
        name: 'Automation',
        description: 'Traffic lights, elevators, and control systems',
        icon: '🏭',
    },
    'communication': {
        name: 'Communication',
        description: 'UART, SPI, and I2C interfaces',
        icon: '📡',
    },
};

// Helper to create component with position
function createComp(
    id: string,
    type: string,
    x: number,
    y: number,
    pins: Array<{ id: string; name: string; type: 'input' | 'output'; x: number; y: number }>
): CircuitComponent {
    return {
        id,
        type: type as CircuitComponent['type'],
        label: id.toUpperCase(), // Use ID as label
        position: { x, y },
        rotation: 0,
        properties: {},
        pins: pins.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            position: { x: p.x, y: p.y },
        })),
    };
}

// Helper to create wire
function createWire(id: string, fromComp: string, fromPin: string, toComp: string, toPin: string): Wire {
    return {
        id,
        fromComponentId: fromComp,
        fromPinId: fromPin,
        toComponentId: toComp,
        toPinId: toPin,
        waypoints: [],
    };
}

// ============================================================================
// DIGITAL LOGIC FUNDAMENTALS TEMPLATES
// ============================================================================

const halfAdderTemplate: Template = {
    id: 'half-adder',
    name: 'Half Adder',
    category: 'digital-logic',
    description: 'A circuit that adds two single bits',
    difficulty: 'beginner',
    overview: 'A half adder is a combinational circuit that performs addition of two single bits. It produces a sum (S) and a carry (C) output.',
    theory: `
Truth Table:
| A | B | Sum | Carry |
|---|---|-----|-------|
| 0 | 0 |  0  |   0   |
| 0 | 1 |  1  |   0   |
| 1 | 0 |  1  |   0   |
| 1 | 1 |  0  |   1   |

Equations:
- Sum = A XOR B
- Carry = A AND B
    `,
    components: [
        createComp('input-a', 'SWITCH_TOGGLE', 100, 100, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('input-b', 'SWITCH_TOGGLE', 100, 200, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('xor-gate', 'XOR_2', 250, 120, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-gate', 'AND_2', 250, 200, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('led-sum', 'LED_GREEN', 400, 120, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-carry', 'LED_RED', 400, 200, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'input-a', 'out', 'xor-gate', 'in1'),
        createWire('w2', 'input-b', 'out', 'xor-gate', 'in2'),
        createWire('w3', 'input-a', 'out', 'and-gate', 'in1'),
        createWire('w4', 'input-b', 'out', 'and-gate', 'in2'),
        createWire('w5', 'xor-gate', 'out', 'led-sum', 'in'),
        createWire('w6', 'and-gate', 'out', 'led-carry', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Input Switches',
            description: 'Place two toggle switches for inputs A and B',
            components: ['input-a', 'input-b'],
            wires: [],
            hint: 'Drag two SWITCH_TOGGLE components from the palette',
        },
        {
            id: 'step-2',
            title: 'Add XOR Gate for Sum',
            description: 'Place an XOR gate to compute the Sum output',
            components: ['xor-gate'],
            wires: ['w1', 'w2'],
            hint: 'The XOR gate outputs 1 when inputs differ',
        },
        {
            id: 'step-3',
            title: 'Add AND Gate for Carry',
            description: 'Place an AND gate to compute the Carry output',
            components: ['and-gate'],
            wires: ['w3', 'w4'],
            hint: 'The AND gate outputs 1 only when both inputs are 1',
        },
        {
            id: 'step-4',
            title: 'Add Output LEDs',
            description: 'Place LEDs to visualize Sum and Carry outputs',
            components: ['led-sum', 'led-carry'],
            wires: ['w5', 'w6'],
            hint: 'Green LED for Sum, Red LED for Carry',
        },
    ],
};

const fullAdderTemplate: Template = {
    id: 'full-adder',
    name: 'Full Adder',
    category: 'digital-logic',
    description: 'A circuit that adds three single bits (including carry-in)',
    difficulty: 'beginner',
    overview: 'A full adder adds three bits: two significant bits and a carry-in bit. It produces a sum and carry-out.',
    theory: `
A full adder can be built from two half adders and an OR gate.

Truth Table:
| A | B | Cin | Sum | Cout |
|---|---|-----|-----|------|
| 0 | 0 |  0  |  0  |  0   |
| 0 | 0 |  1  |  1  |  0   |
| 0 | 1 |  0  |  1  |  0   |
| 0 | 1 |  1  |  0  |  1   |
| 1 | 0 |  0  |  1  |  0   |
| 1 | 0 |  1  |  0  |  1   |
| 1 | 1 |  0  |  0  |  1   |
| 1 | 1 |  1  |  1  |  1   |
    `,
    components: [
        createComp('input-a', 'SWITCH_TOGGLE', 100, 80, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('input-b', 'SWITCH_TOGGLE', 100, 160, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('input-cin', 'SWITCH_TOGGLE', 100, 240, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('xor1', 'XOR_2', 220, 100, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('xor2', 'XOR_2', 340, 140, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and1', 'AND_2', 220, 200, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and2', 'AND_2', 340, 240, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('or1', 'OR_2', 460, 220, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('led-sum', 'LED_GREEN', 500, 140, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-cout', 'LED_RED', 560, 220, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'input-a', 'out', 'xor1', 'in1'),
        createWire('w2', 'input-b', 'out', 'xor1', 'in2'),
        createWire('w3', 'xor1', 'out', 'xor2', 'in1'),
        createWire('w4', 'input-cin', 'out', 'xor2', 'in2'),
        createWire('w5', 'input-a', 'out', 'and1', 'in1'),
        createWire('w6', 'input-b', 'out', 'and1', 'in2'),
        createWire('w7', 'xor1', 'out', 'and2', 'in1'),
        createWire('w8', 'input-cin', 'out', 'and2', 'in2'),
        createWire('w9', 'and1', 'out', 'or1', 'in1'),
        createWire('w10', 'and2', 'out', 'or1', 'in2'),
        createWire('w11', 'xor2', 'out', 'led-sum', 'in'),
        createWire('w12', 'or1', 'out', 'led-cout', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Input Switches',
            description: 'Place three toggle switches for A, B, and Carry-in',
            components: ['input-a', 'input-b', 'input-cin'],
            wires: [],
        },
        {
            id: 'step-2',
            title: 'Build First Half Adder',
            description: 'Add XOR and AND gates for the first half adder',
            components: ['xor1', 'and1'],
            wires: ['w1', 'w2', 'w5', 'w6'],
        },
        {
            id: 'step-3',
            title: 'Build Second Half Adder',
            description: 'Add XOR and AND gates for the second half adder',
            components: ['xor2', 'and2'],
            wires: ['w3', 'w4', 'w7', 'w8'],
        },
        {
            id: 'step-4',
            title: 'Add OR Gate for Carry-out',
            description: 'Combine the carry outputs with an OR gate',
            components: ['or1'],
            wires: ['w9', 'w10'],
        },
        {
            id: 'step-5',
            title: 'Add Output LEDs',
            description: 'Add LEDs to visualize Sum and Carry-out',
            components: ['led-sum', 'led-cout'],
            wires: ['w11', 'w12'],
        },
    ],
};

// ============================================================================
// MORE DIGITAL LOGIC TEMPLATES
// ============================================================================

const decoder2to4Template: Template = {
    id: 'decoder-2to4',
    name: '2-to-4 Decoder',
    category: 'digital-logic',
    description: 'A decoder that converts 2-bit binary input to 4 output lines',
    difficulty: 'beginner',
    overview: 'A 2-to-4 decoder takes a 2-bit binary input and activates one of four output lines based on the input value.',
    theory: `
A decoder converts binary information from n input lines to 2^n unique output lines.

Truth Table:
| A1 | A0 | Y0 | Y1 | Y2 | Y3 |
|----|----|----|----|----|-----|
| 0  | 0  | 1  | 0  | 0  | 0   |
| 0  | 1  | 0  | 1  | 0  | 0   |
| 1  | 0  | 0  | 0  | 1  | 0   |
| 1  | 1  | 0  | 0  | 0  | 1   |

Equations:
- Y0 = NOT(A1) AND NOT(A0)
- Y1 = NOT(A1) AND A0
- Y2 = A1 AND NOT(A0)
- Y3 = A1 AND A0
    `,
    components: [
        createComp('input-a0', 'SWITCH_TOGGLE', 80, 120, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('input-a1', 'SWITCH_TOGGLE', 80, 200, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('not-a0', 'NOT', 180, 100, [
            { id: 'in', name: 'A', type: 'input', x: -25, y: 0 },
            { id: 'out', name: 'Y', type: 'output', x: 25, y: 0 },
        ]),
        createComp('not-a1', 'NOT', 180, 220, [
            { id: 'in', name: 'A', type: 'input', x: -25, y: 0 },
            { id: 'out', name: 'Y', type: 'output', x: 25, y: 0 },
        ]),
        createComp('and-y0', 'AND_2', 300, 80, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-y1', 'AND_2', 300, 140, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-y2', 'AND_2', 300, 200, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-y3', 'AND_2', 300, 260, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('led-y0', 'LED_GREEN', 420, 80, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-y1', 'LED_GREEN', 420, 140, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-y2', 'LED_GREEN', 420, 200, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-y3', 'LED_GREEN', 420, 260, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'input-a0', 'out', 'not-a0', 'in'),
        createWire('w2', 'input-a1', 'out', 'not-a1', 'in'),
        createWire('w3', 'not-a1', 'out', 'and-y0', 'in1'),
        createWire('w4', 'not-a0', 'out', 'and-y0', 'in2'),
        createWire('w5', 'not-a1', 'out', 'and-y1', 'in1'),
        createWire('w6', 'input-a0', 'out', 'and-y1', 'in2'),
        createWire('w7', 'input-a1', 'out', 'and-y2', 'in1'),
        createWire('w8', 'not-a0', 'out', 'and-y2', 'in2'),
        createWire('w9', 'input-a1', 'out', 'and-y3', 'in1'),
        createWire('w10', 'input-a0', 'out', 'and-y3', 'in2'),
        createWire('w11', 'and-y0', 'out', 'led-y0', 'in'),
        createWire('w12', 'and-y1', 'out', 'led-y1', 'in'),
        createWire('w13', 'and-y2', 'out', 'led-y2', 'in'),
        createWire('w14', 'and-y3', 'out', 'led-y3', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Input Switches',
            description: 'Place two toggle switches for the 2-bit input (A0, A1)',
            components: ['input-a0', 'input-a1'],
            wires: [],
            hint: 'A0 is the least significant bit, A1 is the most significant bit',
        },
        {
            id: 'step-2',
            title: 'Add Inverters',
            description: 'Add NOT gates to create inverted versions of inputs',
            components: ['not-a0', 'not-a1'],
            wires: ['w1', 'w2'],
            hint: 'We need both A and NOT(A) for each input',
        },
        {
            id: 'step-3',
            title: 'Add AND Gates',
            description: 'Add four AND gates, one for each output',
            components: ['and-y0', 'and-y1', 'and-y2', 'and-y3'],
            wires: ['w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10'],
            hint: 'Each AND gate decodes one specific input combination',
        },
        {
            id: 'step-4',
            title: 'Add Output LEDs',
            description: 'Add LEDs to visualize which output is active',
            components: ['led-y0', 'led-y1', 'led-y2', 'led-y3'],
            wires: ['w11', 'w12', 'w13', 'w14'],
            hint: 'Only one LED should be on at a time',
        },
    ],
};

const rippleCarryAdderTemplate: Template = {
    id: 'ripple-carry-adder',
    name: '4-bit Ripple Carry Adder',
    category: 'digital-logic',
    description: 'A 4-bit adder built by cascading full adders',
    difficulty: 'intermediate',
    overview: 'A ripple carry adder chains multiple full adders together, with the carry output of each stage feeding into the next.',
    theory: `
4-bit Ripple Carry Adder
========================

Adds two 4-bit numbers A[3:0] and B[3:0] to produce Sum[3:0] and Carry-out.

Architecture:
    A0 B0    A1 B1    A2 B2    A3 B3
     │  │     │  │     │  │     │  │
     ▼  ▼     ▼  ▼     ▼  ▼     ▼  ▼
   ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
Cin│ FA0 │─▶│ FA1 │─▶│ FA2 │─▶│ FA3 │─▶ Cout
   └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘
      │        │        │        │
      ▼        ▼        ▼        ▼
     S0       S1       S2       S3

Example: 0101 (5) + 0011 (3) = 1000 (8)

The "ripple" refers to how the carry propagates through each stage.
This is simple but slow for large bit widths.
    `,
    components: [
        // Inputs A[3:0]
        createComp('a0', 'SWITCH_TOGGLE', 60, 80, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('a1', 'SWITCH_TOGGLE', 60, 160, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('a2', 'SWITCH_TOGGLE', 60, 240, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('a3', 'SWITCH_TOGGLE', 60, 320, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        // Inputs B[3:0]
        createComp('b0', 'SWITCH_TOGGLE', 60, 120, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('b1', 'SWITCH_TOGGLE', 60, 200, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('b2', 'SWITCH_TOGGLE', 60, 280, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('b3', 'SWITCH_TOGGLE', 60, 360, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        // Use 4-bit adder component
        createComp('adder', 'ADDER_4BIT', 250, 220, [
            { id: 'a0', name: 'A0', type: 'input', x: -50, y: -60 },
            { id: 'a1', name: 'A1', type: 'input', x: -50, y: -30 },
            { id: 'a2', name: 'A2', type: 'input', x: -50, y: 0 },
            { id: 'a3', name: 'A3', type: 'input', x: -50, y: 30 },
            { id: 'b0', name: 'B0', type: 'input', x: -50, y: 60 },
            { id: 'b1', name: 'B1', type: 'input', x: -50, y: 90 },
            { id: 'b2', name: 'B2', type: 'input', x: -50, y: 120 },
            { id: 'b3', name: 'B3', type: 'input', x: -50, y: 150 },
            { id: 's0', name: 'S0', type: 'output', x: 50, y: -45 },
            { id: 's1', name: 'S1', type: 'output', x: 50, y: -15 },
            { id: 's2', name: 'S2', type: 'output', x: 50, y: 15 },
            { id: 's3', name: 'S3', type: 'output', x: 50, y: 45 },
            { id: 'cout', name: 'Cout', type: 'output', x: 50, y: 75 },
        ]),
        // Output LEDs
        createComp('led-s0', 'LED_GREEN', 400, 100, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-s1', 'LED_GREEN', 400, 160, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-s2', 'LED_GREEN', 400, 220, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-s3', 'LED_GREEN', 400, 280, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-cout', 'LED_RED', 400, 340, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'a0', 'out', 'adder', 'a0'),
        createWire('w2', 'a1', 'out', 'adder', 'a1'),
        createWire('w3', 'a2', 'out', 'adder', 'a2'),
        createWire('w4', 'a3', 'out', 'adder', 'a3'),
        createWire('w5', 'b0', 'out', 'adder', 'b0'),
        createWire('w6', 'b1', 'out', 'adder', 'b1'),
        createWire('w7', 'b2', 'out', 'adder', 'b2'),
        createWire('w8', 'b3', 'out', 'adder', 'b3'),
        createWire('w9', 'adder', 's0', 'led-s0', 'in'),
        createWire('w10', 'adder', 's1', 'led-s1', 'in'),
        createWire('w11', 'adder', 's2', 'led-s2', 'in'),
        createWire('w12', 'adder', 's3', 'led-s3', 'in'),
        createWire('w13', 'adder', 'cout', 'led-cout', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Input A Switches',
            description: 'Place 4 toggle switches for the first 4-bit number (A3-A0)',
            components: ['a0', 'a1', 'a2', 'a3'],
            wires: [],
            hint: 'A0 is the least significant bit',
        },
        {
            id: 'step-2',
            title: 'Add Input B Switches',
            description: 'Place 4 toggle switches for the second 4-bit number (B3-B0)',
            components: ['b0', 'b1', 'b2', 'b3'],
            wires: [],
            hint: 'B0 is the least significant bit',
        },
        {
            id: 'step-3',
            title: 'Add 4-bit Adder',
            description: 'Place the 4-bit adder and connect all inputs',
            components: ['adder'],
            wires: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'],
            hint: 'The adder internally chains 4 full adders',
        },
        {
            id: 'step-4',
            title: 'Add Output LEDs',
            description: 'Add LEDs for the 4-bit sum and carry out',
            components: ['led-s0', 'led-s1', 'led-s2', 'led-s3', 'led-cout'],
            wires: ['w9', 'w10', 'w11', 'w12', 'w13'],
            hint: 'Try adding 5 (0101) + 3 (0011) = 8 (1000)',
        },
    ],
};

// ============================================================================
// COMPUTING TEMPLATES
// ============================================================================

const comparator4BitTemplate: Template = {
    id: 'comparator-4bit',
    name: '4-bit Comparator',
    category: 'computing',
    description: 'Compare two 4-bit numbers and determine their relationship',
    difficulty: 'intermediate',
    overview: 'A 4-bit comparator compares two binary numbers and outputs whether A > B, A = B, or A < B.',
    theory: `
4-bit Magnitude Comparator
==========================

Compares two 4-bit numbers A[3:0] and B[3:0].

Outputs:
- A_GT_B: HIGH when A > B
- A_EQ_B: HIGH when A = B  
- A_LT_B: HIGH when A < B

The comparison starts from the most significant bit (MSB).
If MSBs are equal, compare the next bit, and so on.

Example:
A = 0110 (6), B = 0100 (4)
Result: A > B (A_GT_B = 1)
    `,
    components: [
        createComp('a0', 'SWITCH_TOGGLE', 60, 80, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('a1', 'SWITCH_TOGGLE', 60, 130, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('a2', 'SWITCH_TOGGLE', 60, 180, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('a3', 'SWITCH_TOGGLE', 60, 230, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('b0', 'SWITCH_TOGGLE', 60, 300, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('b1', 'SWITCH_TOGGLE', 60, 350, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('b2', 'SWITCH_TOGGLE', 60, 400, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('b3', 'SWITCH_TOGGLE', 60, 450, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('comparator', 'COMPARATOR_4BIT', 250, 260, [
            { id: 'a0', name: 'A0', type: 'input', x: -50, y: -60 },
            { id: 'a1', name: 'A1', type: 'input', x: -50, y: -30 },
            { id: 'a2', name: 'A2', type: 'input', x: -50, y: 0 },
            { id: 'a3', name: 'A3', type: 'input', x: -50, y: 30 },
            { id: 'b0', name: 'B0', type: 'input', x: -50, y: 60 },
            { id: 'b1', name: 'B1', type: 'input', x: -50, y: 90 },
            { id: 'b2', name: 'B2', type: 'input', x: -50, y: 120 },
            { id: 'b3', name: 'B3', type: 'input', x: -50, y: 150 },
            { id: 'gt', name: 'A>B', type: 'output', x: 50, y: -20 },
            { id: 'eq', name: 'A=B', type: 'output', x: 50, y: 0 },
            { id: 'lt', name: 'A<B', type: 'output', x: 50, y: 20 },
        ]),
        createComp('led-gt', 'LED_GREEN', 400, 200, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-eq', 'LED_YELLOW', 400, 260, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-lt', 'LED_RED', 400, 320, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'a0', 'out', 'comparator', 'a0'),
        createWire('w2', 'a1', 'out', 'comparator', 'a1'),
        createWire('w3', 'a2', 'out', 'comparator', 'a2'),
        createWire('w4', 'a3', 'out', 'comparator', 'a3'),
        createWire('w5', 'b0', 'out', 'comparator', 'b0'),
        createWire('w6', 'b1', 'out', 'comparator', 'b1'),
        createWire('w7', 'b2', 'out', 'comparator', 'b2'),
        createWire('w8', 'b3', 'out', 'comparator', 'b3'),
        createWire('w9', 'comparator', 'gt', 'led-gt', 'in'),
        createWire('w10', 'comparator', 'eq', 'led-eq', 'in'),
        createWire('w11', 'comparator', 'lt', 'led-lt', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Input A Switches',
            description: 'Place 4 toggle switches for number A (A3-A0)',
            components: ['a0', 'a1', 'a2', 'a3'],
            wires: [],
            hint: 'A0 is the least significant bit',
        },
        {
            id: 'step-2',
            title: 'Add Input B Switches',
            description: 'Place 4 toggle switches for number B (B3-B0)',
            components: ['b0', 'b1', 'b2', 'b3'],
            wires: [],
        },
        {
            id: 'step-3',
            title: 'Add Comparator',
            description: 'Place the 4-bit comparator and connect inputs',
            components: ['comparator'],
            wires: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'],
        },
        {
            id: 'step-4',
            title: 'Add Output LEDs',
            description: 'Add LEDs for Greater Than, Equal, and Less Than',
            components: ['led-gt', 'led-eq', 'led-lt'],
            wires: ['w9', 'w10', 'w11'],
            hint: 'Green = A>B, Yellow = A=B, Red = A<B',
        },
    ],
};

const multiplexerDemoTemplate: Template = {
    id: 'mux-demo',
    name: 'Data Selector (MUX)',
    category: 'computing',
    description: 'Learn how multiplexers select between multiple data inputs',
    difficulty: 'beginner',
    overview: 'A multiplexer (MUX) selects one of several input signals and forwards it to the output based on select lines.',
    theory: `
2-to-1 Multiplexer
==================

A MUX acts like a data switch - it selects one of multiple inputs
based on the select signal.

Truth Table:
| S | Y    |
|---|------|
| 0 | A    |
| 1 | B    |

When S=0, output Y follows input A
When S=1, output Y follows input B

Equation: Y = (NOT(S) AND A) OR (S AND B)

Applications:
- Data routing in CPUs
- Memory address selection
- Signal switching
    `,
    components: [
        createComp('input-a', 'SWITCH_TOGGLE', 80, 100, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('input-b', 'SWITCH_TOGGLE', 80, 160, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('select', 'SWITCH_TOGGLE', 80, 240, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('mux', 'MUX_2TO1', 250, 150, [
            { id: 'a', name: 'A', type: 'input', x: -30, y: -15 },
            { id: 'b', name: 'B', type: 'input', x: -30, y: 0 },
            { id: 's', name: 'S', type: 'input', x: -30, y: 15 },
            { id: 'y', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('led-out', 'LED_GREEN', 380, 150, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'input-a', 'out', 'mux', 'a'),
        createWire('w2', 'input-b', 'out', 'mux', 'b'),
        createWire('w3', 'select', 'out', 'mux', 's'),
        createWire('w4', 'mux', 'y', 'led-out', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Data Inputs',
            description: 'Place two toggle switches for data inputs A and B',
            components: ['input-a', 'input-b'],
            wires: [],
            hint: 'These are the two data sources to choose from',
        },
        {
            id: 'step-2',
            title: 'Add Select Switch',
            description: 'Add a switch to control which input is selected',
            components: ['select'],
            wires: [],
            hint: 'S=0 selects A, S=1 selects B',
        },
        {
            id: 'step-3',
            title: 'Add Multiplexer',
            description: 'Place the 2:1 MUX and connect all inputs',
            components: ['mux'],
            wires: ['w1', 'w2', 'w3'],
        },
        {
            id: 'step-4',
            title: 'Add Output LED',
            description: 'Add an LED to see the selected output',
            components: ['led-out'],
            wires: ['w4'],
            hint: 'Toggle the select switch to see the output change',
        },
    ],
};

// ============================================================================
// SEQUENTIAL CIRCUITS TEMPLATES
// ============================================================================

const srLatchTemplate: Template = {
    id: 'sr-latch',
    name: 'SR Latch',
    category: 'sequential',
    description: 'A basic memory element that stores one bit',
    difficulty: 'beginner',
    overview: 'An SR latch is the simplest form of memory. It can store one bit of information using Set and Reset inputs.',
    theory: `
The SR latch has two inputs: Set (S) and Reset (R).
- S=1, R=0: Sets Q to 1
- S=0, R=1: Resets Q to 0
- S=0, R=0: Holds previous state
- S=1, R=1: Invalid state (avoid!)

Internally, an SR latch is built from cross-coupled NOR gates,
but here we use a pre-built SR_LATCH component for simulation.
    `,
    components: [
        createComp('input-s', 'SWITCH_TOGGLE', 100, 120, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('input-r', 'SWITCH_TOGGLE', 100, 180, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('sr-latch', 'SR_LATCH', 250, 150, [
            { id: 's', name: 'S', type: 'input', x: -30, y: -15 },
            { id: 'r', name: 'R', type: 'input', x: -30, y: 15 },
            { id: 'q', name: 'Q', type: 'output', x: 30, y: -15 },
            { id: 'qn', name: "Q'", type: 'output', x: 30, y: 15 },
        ]),
        createComp('led-q', 'LED_GREEN', 400, 120, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-qn', 'LED_RED', 400, 180, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'input-s', 'out', 'sr-latch', 's'),
        createWire('w2', 'input-r', 'out', 'sr-latch', 'r'),
        createWire('w3', 'sr-latch', 'q', 'led-q', 'in'),
        createWire('w4', 'sr-latch', 'qn', 'led-qn', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Set and Reset Switches',
            description: 'Place toggle switches for Set and Reset inputs',
            components: ['input-s', 'input-r'],
            wires: [],
            hint: 'Toggle switches let you control the S and R inputs',
        },
        {
            id: 'step-2',
            title: 'Add SR Latch',
            description: 'Place the SR Latch component and connect inputs',
            components: ['sr-latch'],
            wires: ['w1', 'w2'],
            hint: 'The SR Latch stores one bit based on Set/Reset inputs',
        },
        {
            id: 'step-3',
            title: 'Add Output LEDs',
            description: 'Add LEDs to show Q and Q-bar outputs',
            components: ['led-q', 'led-qn'],
            wires: ['w3', 'w4'],
            hint: 'Green LED shows Q, Red LED shows Q-bar (inverted)',
        },
    ],
};

const dFlipFlopTemplate: Template = {
    id: 'd-flipflop',
    name: 'D Flip-Flop',
    category: 'sequential',
    description: 'A clocked memory element that captures data on clock edge',
    difficulty: 'beginner',
    overview: 'A D flip-flop captures the value of the D input at the rising edge of the clock and holds it until the next clock edge.',
    theory: `
D Flip-Flop (Data Flip-Flop)
============================

The D flip-flop is the most commonly used flip-flop in digital design.
It captures the D input value on the rising edge of CLK.

Truth Table:
| CLK | D | Q(next) |
|-----|---|---------|
|  ↑  | 0 |    0    |
|  ↑  | 1 |    1    |
|  -  | X | Q(hold) |

↑ = rising edge, - = no edge, X = don't care

Key Properties:
- Edge-triggered (not level-sensitive)
- Q follows D only at clock edge
- Holds value between clock edges
- Q' is always the inverse of Q

Applications:
- Registers
- Counters
- State machines
- Data synchronization
    `,
    components: [
        createComp('input-d', 'SWITCH_TOGGLE', 80, 120, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('clock', 'CLOCK', 80, 200, [{ id: 'out', name: 'CLK', type: 'output', x: 30, y: 0 }]),
        createComp('dff', 'D_FLIPFLOP', 250, 160, [
            { id: 'd', name: 'D', type: 'input', x: -30, y: -15 },
            { id: 'clk', name: 'CLK', type: 'input', x: -30, y: 15 },
            { id: 'q', name: 'Q', type: 'output', x: 30, y: -15 },
            { id: 'qn', name: "Q'", type: 'output', x: 30, y: 15 },
        ]),
        createComp('led-q', 'LED_GREEN', 400, 130, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-qn', 'LED_RED', 400, 190, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'input-d', 'out', 'dff', 'd'),
        createWire('w2', 'clock', 'out', 'dff', 'clk'),
        createWire('w3', 'dff', 'q', 'led-q', 'in'),
        createWire('w4', 'dff', 'qn', 'led-qn', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Data Input',
            description: 'Place a toggle switch for the D (data) input',
            components: ['input-d'],
            wires: [],
            hint: 'This is the data you want to store',
        },
        {
            id: 'step-2',
            title: 'Add Clock',
            description: 'Add a clock signal generator',
            components: ['clock'],
            wires: [],
            hint: 'The clock determines when data is captured',
        },
        {
            id: 'step-3',
            title: 'Add D Flip-Flop',
            description: 'Place the D flip-flop and connect inputs',
            components: ['dff'],
            wires: ['w1', 'w2'],
            hint: 'Data is captured on the rising edge of CLK',
        },
        {
            id: 'step-4',
            title: 'Add Output LEDs',
            description: 'Add LEDs to show Q and Q-bar outputs',
            components: ['led-q', 'led-qn'],
            wires: ['w3', 'w4'],
            hint: 'Watch how Q changes only on clock edges',
        },
    ],
};

const jkCounterTemplate: Template = {
    id: 'jk-counter',
    name: 'JK Flip-Flop Counter',
    category: 'sequential',
    description: 'Build a 2-bit counter using JK flip-flops',
    difficulty: 'intermediate',
    overview: 'Learn how JK flip-flops can be configured to create a binary counter that cycles through states 0, 1, 2, 3.',
    theory: `
2-bit Asynchronous Counter using JK Flip-Flops
==============================================

A JK flip-flop toggles when both J and K are HIGH.
By connecting J=K=1, we create a toggle flip-flop (T flip-flop).

Counter Sequence:
| Clock | Q1 | Q0 | Decimal |
|-------|----|----|---------|
|   0   | 0  | 0  |    0    |
|   1   | 0  | 1  |    1    |
|   2   | 1  | 0  |    2    |
|   3   | 1  | 1  |    3    |
|   4   | 0  | 0  |    0    | (wraps)

Architecture:
- First JK-FF (Q0) toggles on every clock pulse
- Second JK-FF (Q1) toggles when Q0 goes from 1→0
- This creates a ripple counter

JK Truth Table:
| J | K | Q(next)  |
|---|---|----------|
| 0 | 0 | Q (hold) |
| 0 | 1 | 0 (reset)|
| 1 | 0 | 1 (set)  |
| 1 | 1 | Q' (toggle)|
    `,
    components: [
        createComp('clock', 'CLOCK', 80, 150, [{ id: 'out', name: 'CLK', type: 'output', x: 30, y: 0 }]),
        createComp('vcc', 'CONST_HIGH', 80, 80, [{ id: 'out', name: 'OUT', type: 'output', x: 15, y: 0 }]),
        createComp('jk0', 'JK_FLIPFLOP', 220, 150, [
            { id: 'j', name: 'J', type: 'input', x: -30, y: -20 },
            { id: 'clk', name: 'CLK', type: 'input', x: -30, y: 0 },
            { id: 'k', name: 'K', type: 'input', x: -30, y: 20 },
            { id: 'q', name: 'Q', type: 'output', x: 30, y: -15 },
            { id: 'qn', name: "Q'", type: 'output', x: 30, y: 15 },
        ]),
        createComp('jk1', 'JK_FLIPFLOP', 380, 150, [
            { id: 'j', name: 'J', type: 'input', x: -30, y: -20 },
            { id: 'clk', name: 'CLK', type: 'input', x: -30, y: 0 },
            { id: 'k', name: 'K', type: 'input', x: -30, y: 20 },
            { id: 'q', name: 'Q', type: 'output', x: 30, y: -15 },
            { id: 'qn', name: "Q'", type: 'output', x: 30, y: 15 },
        ]),
        createComp('led-q0', 'LED_GREEN', 500, 100, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-q1', 'LED_GREEN', 500, 160, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'vcc', 'out', 'jk0', 'j'),
        createWire('w2', 'vcc', 'out', 'jk0', 'k'),
        createWire('w3', 'clock', 'out', 'jk0', 'clk'),
        createWire('w4', 'vcc', 'out', 'jk1', 'j'),
        createWire('w5', 'vcc', 'out', 'jk1', 'k'),
        createWire('w6', 'jk0', 'q', 'jk1', 'clk'),
        createWire('w7', 'jk0', 'q', 'led-q0', 'in'),
        createWire('w8', 'jk1', 'q', 'led-q1', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Clock and VCC',
            description: 'Add a clock source and constant HIGH for J/K inputs',
            components: ['clock', 'vcc'],
            wires: [],
            hint: 'VCC keeps J=K=1 for toggle mode',
        },
        {
            id: 'step-2',
            title: 'Add First JK Flip-Flop',
            description: 'Add JK-FF for the least significant bit (Q0)',
            components: ['jk0'],
            wires: ['w1', 'w2', 'w3'],
            hint: 'This toggles on every clock pulse',
        },
        {
            id: 'step-3',
            title: 'Add Second JK Flip-Flop',
            description: 'Add JK-FF for Q1, clocked by Q0',
            components: ['jk1'],
            wires: ['w4', 'w5', 'w6'],
            hint: 'Q1 toggles when Q0 falls (ripple counter)',
        },
        {
            id: 'step-4',
            title: 'Add Output LEDs',
            description: 'Add LEDs to display the 2-bit count',
            components: ['led-q0', 'led-q1'],
            wires: ['w7', 'w8'],
            hint: 'Watch the binary count: 00→01→10→11→00',
        },
    ],
};

const shiftRegisterTemplate: Template = {
    id: 'shift-register',
    name: '4-bit Shift Register',
    category: 'sequential',
    description: 'A register that shifts data through a chain of flip-flops',
    difficulty: 'intermediate',
    overview: 'A shift register moves data bits through a series of flip-flops on each clock pulse, useful for serial-to-parallel conversion.',
    theory: `
4-bit Serial-In Parallel-Out (SIPO) Shift Register
==================================================

Data enters serially (one bit at a time) and can be read
in parallel (all bits at once).

Operation:
- On each clock edge, data shifts right
- New bit enters from the left (Serial In)
- Old bit exits from the right

Example (shifting in 1011):
| Clock | SI | Q3 | Q2 | Q1 | Q0 |
|-------|----|----|----|----|-----|
|   0   | -  | 0  | 0  | 0  | 0   |
|   1   | 1  | 1  | 0  | 0  | 0   |
|   2   | 0  | 0  | 1  | 0  | 0   |
|   3   | 1  | 1  | 0  | 1  | 0   |
|   4   | 1  | 1  | 1  | 0  | 1   |

Applications:
- Serial communication (UART, SPI)
- LED displays (scanning)
- Delay lines
- Pseudo-random number generators
    `,
    components: [
        createComp('serial-in', 'SWITCH_TOGGLE', 60, 100, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('clock', 'CLOCK', 60, 180, [{ id: 'out', name: 'CLK', type: 'output', x: 30, y: 0 }]),
        createComp('shift-reg', 'SHIFT_REGISTER_8BIT', 280, 150, [
            { id: 'si', name: 'SI', type: 'input', x: -60, y: -20 },
            { id: 'clk', name: 'CLK', type: 'input', x: -60, y: 20 },
            { id: 'q0', name: 'Q0', type: 'output', x: 60, y: -35 },
            { id: 'q1', name: 'Q1', type: 'output', x: 60, y: -15 },
            { id: 'q2', name: 'Q2', type: 'output', x: 60, y: 5 },
            { id: 'q3', name: 'Q3', type: 'output', x: 60, y: 25 },
            { id: 'q4', name: 'Q4', type: 'output', x: 60, y: 45 },
            { id: 'q5', name: 'Q5', type: 'output', x: 60, y: 65 },
            { id: 'q6', name: 'Q6', type: 'output', x: 60, y: 85 },
            { id: 'q7', name: 'Q7', type: 'output', x: 60, y: 105 },
        ]),
        createComp('led-q0', 'LED_GREEN', 450, 80, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-q1', 'LED_GREEN', 450, 110, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-q2', 'LED_GREEN', 450, 140, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-q3', 'LED_GREEN', 450, 170, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'serial-in', 'out', 'shift-reg', 'si'),
        createWire('w2', 'clock', 'out', 'shift-reg', 'clk'),
        createWire('w3', 'shift-reg', 'q0', 'led-q0', 'in'),
        createWire('w4', 'shift-reg', 'q1', 'led-q1', 'in'),
        createWire('w5', 'shift-reg', 'q2', 'led-q2', 'in'),
        createWire('w6', 'shift-reg', 'q3', 'led-q3', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Serial Input',
            description: 'Place a toggle switch for serial data input',
            components: ['serial-in'],
            wires: [],
            hint: 'This is the data bit that enters on each clock',
        },
        {
            id: 'step-2',
            title: 'Add Clock',
            description: 'Add a clock to control when data shifts',
            components: ['clock'],
            wires: [],
        },
        {
            id: 'step-3',
            title: 'Add Shift Register',
            description: 'Place the 8-bit shift register and connect inputs',
            components: ['shift-reg'],
            wires: ['w1', 'w2'],
            hint: 'Data shifts through on each clock edge',
        },
        {
            id: 'step-4',
            title: 'Add Output LEDs',
            description: 'Add LEDs to see the first 4 bits of the register',
            components: ['led-q0', 'led-q1', 'led-q2', 'led-q3'],
            wires: ['w3', 'w4', 'w5', 'w6'],
            hint: 'Toggle the input and watch data shift through',
        },
    ],
};

// ============================================================================
// ROBOTICS TEMPLATES
// ============================================================================

const motorControllerTemplate: Template = {
    id: 'motor-controller',
    name: 'DC Motor Direction Controller',
    category: 'robotics',
    description: 'Control a DC motor direction using an H-bridge logic circuit',
    difficulty: 'intermediate',
    overview: 'Learn how to control motor direction using digital logic that mimics an H-bridge configuration.',
    theory: `
DC Motor Direction Control (H-Bridge Logic)
============================================

An H-bridge allows bidirectional control of a DC motor.
This circuit demonstrates the logic behind H-bridge control.

Control Signals:
| FWD | REV | Motor Action |
|-----|-----|--------------|
|  0  |  0  | Stop (coast) |
|  0  |  1  | Reverse      |
|  1  |  0  | Forward      |
|  1  |  1  | Stop (brake) |

Safety Logic:
- XOR gate detects conflicting inputs
- AND gates enable motor only when safe
- Prevents shoot-through (both sides ON)

Real H-bridges use transistors/MOSFETs,
but the control logic is the same.
    `,
    components: [
        createComp('sw-fwd', 'SWITCH_TOGGLE', 80, 100, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('sw-rev', 'SWITCH_TOGGLE', 80, 180, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('xor-dir', 'XOR_2', 200, 140, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-fwd', 'AND_2', 320, 100, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-rev', 'AND_2', 320, 180, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('led-fwd', 'LED_GREEN', 450, 100, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-rev', 'LED_RED', 450, 180, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('motor', 'MOTOR_DC', 450, 260, [
            { id: 'fwd', name: 'FWD', type: 'input', x: -30, y: -10 },
            { id: 'rev', name: 'REV', type: 'input', x: -30, y: 10 },
        ]),
    ],
    wires: [
        createWire('w1', 'sw-fwd', 'out', 'xor-dir', 'in1'),
        createWire('w2', 'sw-rev', 'out', 'xor-dir', 'in2'),
        createWire('w3', 'sw-fwd', 'out', 'and-fwd', 'in1'),
        createWire('w4', 'xor-dir', 'out', 'and-fwd', 'in2'),
        createWire('w5', 'sw-rev', 'out', 'and-rev', 'in1'),
        createWire('w6', 'xor-dir', 'out', 'and-rev', 'in2'),
        createWire('w7', 'and-fwd', 'out', 'led-fwd', 'in'),
        createWire('w8', 'and-rev', 'out', 'led-rev', 'in'),
        createWire('w9', 'and-fwd', 'out', 'motor', 'fwd'),
        createWire('w10', 'and-rev', 'out', 'motor', 'rev'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Direction Switches',
            description: 'Place Forward and Reverse control switches',
            components: ['sw-fwd', 'sw-rev'],
            wires: [],
            hint: 'These control the desired motor direction',
        },
        {
            id: 'step-2',
            title: 'Add XOR Safety Gate',
            description: 'XOR detects when only one direction is selected',
            components: ['xor-dir'],
            wires: ['w1', 'w2'],
            hint: 'XOR outputs 1 only when inputs differ',
        },
        {
            id: 'step-3',
            title: 'Add AND Gates',
            description: 'AND gates enable motor only when safe',
            components: ['and-fwd', 'and-rev'],
            wires: ['w3', 'w4', 'w5', 'w6'],
            hint: 'Motor runs only if direction is valid',
        },
        {
            id: 'step-4',
            title: 'Add Indicators and Motor',
            description: 'Add LEDs and motor to show the result',
            components: ['led-fwd', 'led-rev', 'motor'],
            wires: ['w7', 'w8', 'w9', 'w10'],
            hint: 'Try both switches ON - motor should stop!',
        },
    ],
};

const lineFollowerLogicTemplate: Template = {
    id: 'line-follower',
    name: 'Line Follower Logic',
    category: 'robotics',
    description: 'Basic logic for a line-following robot using two sensors',
    difficulty: 'advanced',
    overview: 'Implement the decision logic for a line-following robot that uses two IR sensors to detect a line and control two motors.',
    theory: `
Line Follower Robot Logic
=========================

A line follower uses sensors to detect a line and adjusts
motor speeds to follow it.

Sensor Configuration:
  [Left Sensor]  [Right Sensor]
       \\            /
        \\__Robot__/
           |  |
        [L Motor] [R Motor]

Decision Table:
| Left | Right | Action        | L Motor | R Motor |
|------|-------|---------------|---------|---------|
|  0   |   0   | Line lost     |   OFF   |   OFF   |
|  0   |   1   | Turn right    |   ON    |   OFF   |
|  1   |   0   | Turn left     |   OFF   |   ON    |
|  1   |   1   | Go straight   |   ON    |   ON    |

Sensor = 1 means "sees line" (dark surface)
Sensor = 0 means "no line" (light surface)

Logic:
- Left Motor = Right Sensor (cross-coupling)
- Right Motor = Left Sensor
    `,
    components: [
        createComp('sensor-left', 'SWITCH_TOGGLE', 80, 100, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('sensor-right', 'SWITCH_TOGGLE', 80, 180, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('or-both', 'OR_2', 200, 260, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-left', 'AND_2', 320, 100, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-right', 'AND_2', 320, 180, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('led-left', 'LED_GREEN', 450, 100, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-right', 'LED_GREEN', 450, 180, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-active', 'LED_BLUE', 450, 260, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'sensor-left', 'out', 'or-both', 'in1'),
        createWire('w2', 'sensor-right', 'out', 'or-both', 'in2'),
        createWire('w3', 'sensor-right', 'out', 'and-left', 'in1'),
        createWire('w4', 'or-both', 'out', 'and-left', 'in2'),
        createWire('w5', 'sensor-left', 'out', 'and-right', 'in1'),
        createWire('w6', 'or-both', 'out', 'and-right', 'in2'),
        createWire('w7', 'and-left', 'out', 'led-left', 'in'),
        createWire('w8', 'and-right', 'out', 'led-right', 'in'),
        createWire('w9', 'or-both', 'out', 'led-active', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Sensor Inputs',
            description: 'Place switches to simulate left and right IR sensors',
            components: ['sensor-left', 'sensor-right'],
            wires: [],
            hint: 'ON = sensor sees line, OFF = no line',
        },
        {
            id: 'step-2',
            title: 'Add Activity Detector',
            description: 'OR gate detects if any sensor sees the line',
            components: ['or-both'],
            wires: ['w1', 'w2'],
            hint: 'Robot is active only when line is detected',
        },
        {
            id: 'step-3',
            title: 'Add Motor Control Logic',
            description: 'AND gates control each motor based on cross-coupled sensors',
            components: ['and-left', 'and-right'],
            wires: ['w3', 'w4', 'w5', 'w6'],
            hint: 'Left motor follows right sensor, and vice versa',
        },
        {
            id: 'step-4',
            title: 'Add Output LEDs',
            description: 'Add LEDs to visualize motor states',
            components: ['led-left', 'led-right', 'led-active'],
            wires: ['w7', 'w8', 'w9'],
            hint: 'Test all 4 sensor combinations',
        },
    ],
};

// ============================================================================
// AUTOMATION TEMPLATES
// ============================================================================

const trafficLightTemplate: Template = {
    id: 'traffic-light',
    name: 'Traffic Light Controller',
    category: 'automation',
    description: 'Build a traffic light using Counter + Decoder + Logic Gates',
    difficulty: 'intermediate',
    overview:
        'Learn how traffic lights work by building one from basic components: a 4-bit counter for timing, a decoder for state selection, and logic gates to control the lights.',
    theory: `
Traffic Light Controller - Built from Basic Components
======================================================

This circuit teaches you how real traffic lights work
by building one from fundamental digital components.

Architecture:
┌─────────┐    ┌─────────┐    ┌───────────┐    ┌──────┐
│  CLOCK  │───▶│ COUNTER │───▶│  DECODER  │───▶│ GATES│───▶ LEDs
└─────────┘    └─────────┘    └───────────┘    └──────┘

Components Used:
1. CLOCK - Generates timing pulses (heartbeat)
2. COUNTER_4BIT - Counts 0-15, we use states 0-3
3. DECODER_2TO4 - Converts 2-bit count to 4 outputs
4. OR Gates - Combine decoder outputs for each light

State Machine (4-state simplified):
┌────────────────────────────────────┐
│ Count: 0    │ 1    │ 2    │ 3     │
│ Light: 🔴   │ 🟡   │ 🟢   │ 🟡    │
│        RED  │YELLOW│GREEN │YELLOW │
└────────────────────────────────────┘

How It Works:
1. Clock sends pulses at regular intervals
2. Counter increments: 0 → 1 → 2 → 3 → 0...
3. Decoder activates one output based on count:
   - Count 0 → Output 0 (RED)
   - Count 1 → Output 1 (YELLOW)
   - Count 2 → Output 2 (GREEN)
   - Count 3 → Output 3 (YELLOW)
4. OR gate combines outputs 1 and 3 for YELLOW

Truth Table:
| Count | Q1 Q0 | D0 | D1 | D2 | D3 | RED | YEL | GRN |
|-------|-------|----|----|----|----|-----|-----|-----|
|   0   | 0  0  | 1  | 0  | 0  | 0  |  1  |  0  |  0  |
|   1   | 0  1  | 0  | 1  | 0  | 0  |  0  |  1  |  0  |
|   2   | 1  0  | 0  | 0  | 1  | 0  |  0  |  0  |  1  |
|   3   | 1  1  | 0  | 0  | 0  | 1  |  0  |  1  |  0  |

Key Learning Points:
• Counters create sequential states
• Decoders convert binary to one-hot encoding
• OR gates combine multiple conditions
• This is how real FSMs are implemented in hardware
    `,
    components: [
        // Clock source
        createComp('clock', 'CLOCK', 80, 180, [{ id: 'out', name: 'CLK', type: 'output', x: 30, y: 0 }]),
        // 4-bit counter (we use Q0, Q1 for 4 states)
        createComp('counter', 'COUNTER_4BIT', 180, 180, [
            { id: 'clk', name: 'CLK', type: 'input', x: -40, y: 0 },
            { id: 'q0', name: 'Q0', type: 'output', x: 40, y: -30 },
            { id: 'q1', name: 'Q1', type: 'output', x: 40, y: -10 },
            { id: 'q2', name: 'Q2', type: 'output', x: 40, y: 10 },
            { id: 'q3', name: 'Q3', type: 'output', x: 40, y: 30 },
        ]),
        // 2-to-4 decoder
        createComp('decoder', 'DECODER_2TO4', 320, 180, [
            { id: 'a0', name: 'A0', type: 'input', x: -40, y: -15 },
            { id: 'a1', name: 'A1', type: 'input', x: -40, y: 15 },
            { id: 'y0', name: 'Y0', type: 'output', x: 40, y: -30 },
            { id: 'y1', name: 'Y1', type: 'output', x: 40, y: -10 },
            { id: 'y2', name: 'Y2', type: 'output', x: 40, y: 10 },
            { id: 'y3', name: 'Y3', type: 'output', x: 40, y: 30 },
        ]),
        // OR gate for yellow (combines decoder outputs 1 and 3)
        createComp('or-yellow', 'OR_2', 450, 200, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        // Output LEDs
        createComp('led-red', 'LED_RED', 550, 120, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-yellow', 'LED_YELLOW', 550, 200, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-green', 'LED_GREEN', 550, 280, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        // Clock to counter
        createWire('w1', 'clock', 'out', 'counter', 'clk'),
        // Counter Q0, Q1 to decoder inputs
        createWire('w2', 'counter', 'q0', 'decoder', 'a0'),
        createWire('w3', 'counter', 'q1', 'decoder', 'a1'),
        // Decoder Y0 (state 0) to RED LED
        createWire('w4', 'decoder', 'y0', 'led-red', 'in'),
        // Decoder Y1 (state 1) to OR gate for yellow
        createWire('w5', 'decoder', 'y1', 'or-yellow', 'in1'),
        // Decoder Y2 (state 2) to GREEN LED
        createWire('w6', 'decoder', 'y2', 'led-green', 'in'),
        // Decoder Y3 (state 3) to OR gate for yellow
        createWire('w7', 'decoder', 'y3', 'or-yellow', 'in2'),
        // OR gate output to YELLOW LED
        createWire('w8', 'or-yellow', 'out', 'led-yellow', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Clock Source',
            description: 'Place a clock generator - this is the heartbeat of the traffic light',
            components: ['clock'],
            wires: [],
            hint: 'The clock generates regular pulses that drive the state changes',
        },
        {
            id: 'step-2',
            title: 'Add 4-Bit Counter',
            description: 'Add a counter that increments on each clock pulse. We use Q0 and Q1 for 4 states (0-3)',
            components: ['counter'],
            wires: ['w1'],
            hint: 'The counter creates the sequence: 0 → 1 → 2 → 3 → 0...',
        },
        {
            id: 'step-3',
            title: 'Add 2-to-4 Decoder',
            description: 'The decoder converts the 2-bit count into 4 separate outputs (one-hot encoding)',
            components: ['decoder'],
            wires: ['w2', 'w3'],
            hint: 'Each decoder output corresponds to one state: Y0=RED, Y1=YELLOW1, Y2=GREEN, Y3=YELLOW2',
        },
        {
            id: 'step-4',
            title: 'Add OR Gate for Yellow',
            description: 'Yellow appears in states 1 AND 3, so we OR those decoder outputs together',
            components: ['or-yellow'],
            wires: ['w5', 'w7', 'w8'],
            hint: 'The OR gate combines two conditions: state 1 OR state 3 = YELLOW on',
        },
        {
            id: 'step-5',
            title: 'Add Traffic Light LEDs',
            description: 'Connect the LEDs: RED to Y0, GREEN to Y2, YELLOW to OR output',
            components: ['led-red', 'led-yellow', 'led-green'],
            wires: ['w4', 'w6'],
            hint: 'Run simulation to see the lights cycle: RED → YELLOW → GREEN → YELLOW → RED...',
        },
    ],
};

const elevatorControllerTemplate: Template = {
    id: 'elevator-controller',
    name: 'Simple Elevator Controller',
    category: 'automation',
    description: 'A 2-floor elevator controller with call buttons and floor indicators',
    difficulty: 'advanced',
    overview: 'Build a simple elevator controller that responds to floor call buttons and tracks the current floor position.',
    theory: `
2-Floor Elevator Controller
===========================

This simplified elevator demonstrates combinational logic
for basic elevator control.

Inputs:
- Call-1: Request to go to floor 1
- Call-2: Request to go to floor 2
- Sensor-1: Elevator is at floor 1 (toggle ON)
- Sensor-2: Elevator is at floor 2 (toggle ON)

Outputs:
- Motor Up (green): Move up
- Motor Down (red): Move down
- Floor indicators (yellow): Current position
- Door (blue): Door is open

Logic:
- Move UP = Call-2 AND Sensor-1 (want floor 2, currently at 1)
- Move DOWN = Call-1 AND Sensor-2 (want floor 1, currently at 2)
- Door Open = Sensor-1 OR Sensor-2 (at any floor)

Try it:
1. Set Sensor-1 ON (elevator at floor 1)
2. Press Call-2 → Motor Up lights
3. Toggle to Sensor-2 ON → Door opens
    `,
    components: [
        createComp('call-1', 'SWITCH_PUSH', 60, 80, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('call-2', 'SWITCH_PUSH', 60, 140, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('sensor-1', 'SWITCH_TOGGLE', 60, 220, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('sensor-2', 'SWITCH_TOGGLE', 60, 280, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('and-up', 'AND_2', 220, 110, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-down', 'AND_2', 220, 180, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('or-door', 'OR_2', 220, 250, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('led-up', 'LED_GREEN', 360, 90, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-down', 'LED_RED', 360, 150, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-f1', 'LED_YELLOW', 360, 210, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-f2', 'LED_YELLOW', 360, 270, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-door', 'LED_BLUE', 360, 330, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        // Move UP: call-2 pressed AND currently at floor 1 (sensor-1 ON)
        createWire('w1', 'call-2', 'out', 'and-up', 'in1'),
        createWire('w2', 'sensor-1', 'out', 'and-up', 'in2'),
        // Move DOWN: call-1 pressed AND currently at floor 2 (sensor-2 ON)
        createWire('w3', 'call-1', 'out', 'and-down', 'in1'),
        createWire('w4', 'sensor-2', 'out', 'and-down', 'in2'),
        // Door opens when at any floor
        createWire('w5', 'sensor-1', 'out', 'or-door', 'in1'),
        createWire('w6', 'sensor-2', 'out', 'or-door', 'in2'),
        // LED outputs
        createWire('w7', 'and-up', 'out', 'led-up', 'in'),
        createWire('w8', 'and-down', 'out', 'led-down', 'in'),
        createWire('w9', 'sensor-1', 'out', 'led-f1', 'in'),
        createWire('w10', 'sensor-2', 'out', 'led-f2', 'in'),
        createWire('w11', 'or-door', 'out', 'led-door', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Call Buttons',
            description: 'Place push buttons for floor 1 and floor 2 calls',
            components: ['call-1', 'call-2'],
            wires: [],
            hint: 'Push buttons simulate elevator call requests',
        },
        {
            id: 'step-2',
            title: 'Add Floor Sensors',
            description: 'Add toggle switches to simulate floor position sensors',
            components: ['sensor-1', 'sensor-2'],
            wires: [],
            hint: 'Toggle ON when elevator is at that floor',
        },
        {
            id: 'step-3',
            title: 'Add Motor Control Logic',
            description: 'AND gates determine when to move up or down',
            components: ['and-up', 'and-down'],
            wires: ['w1', 'w2', 'w3', 'w4'],
            hint: 'Move up if called to 2 AND at floor 1',
        },
        {
            id: 'step-4',
            title: 'Add Door Logic',
            description: 'OR gate opens door when at any floor',
            components: ['or-door'],
            wires: ['w5', 'w6'],
        },
        {
            id: 'step-5',
            title: 'Add Indicator LEDs',
            description: 'Add LEDs for motor direction, floor position, and door',
            components: ['led-up', 'led-down', 'led-f1', 'led-f2', 'led-door'],
            wires: ['w7', 'w8', 'w9', 'w10', 'w11'],
            hint: 'Green=Up, Red=Down, Yellow=Floor, Blue=Door',
        },
    ],
};

const alarmSystemTemplate: Template = {
    id: 'alarm-system',
    name: 'Security Alarm System',
    category: 'automation',
    description: 'A simple security alarm with multiple sensors and arm/disarm control',
    difficulty: 'intermediate',
    overview: 'Build a security alarm system that monitors multiple sensors and triggers an alarm when armed and a sensor is tripped.',
    theory: `
Security Alarm System
=====================

A basic security system with:
- ARM/DISARM control
- Multiple zone sensors (door, window, motion)
- Alarm output
- Zone indicator LEDs

Logic:
ALARM = ARM AND (DOOR OR WINDOW OR MOTION)

When armed (ARM=1):
- Any sensor going HIGH triggers the alarm
- All zones are monitored simultaneously

When disarmed (ARM=0):
- Sensors are ignored
- Alarm cannot trigger

Zone Indicators:
- Show which sensor(s) triggered the alarm
- Useful for identifying the breach point
    `,
    components: [
        createComp('arm-switch', 'SWITCH_TOGGLE', 60, 80, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('door-sensor', 'SWITCH_TOGGLE', 60, 160, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('window-sensor', 'SWITCH_TOGGLE', 60, 220, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('motion-sensor', 'SWITCH_TOGGLE', 60, 280, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('or-zones', 'OR_2', 200, 190, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('or-all', 'OR_2', 300, 220, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('and-alarm', 'AND_2', 420, 150, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('led-armed', 'LED_GREEN', 520, 80, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-alarm', 'LED_RED', 520, 150, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-door', 'LED_YELLOW', 520, 220, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-window', 'LED_YELLOW', 520, 280, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-motion', 'LED_YELLOW', 520, 340, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'door-sensor', 'out', 'or-zones', 'in1'),
        createWire('w2', 'window-sensor', 'out', 'or-zones', 'in2'),
        createWire('w3', 'or-zones', 'out', 'or-all', 'in1'),
        createWire('w4', 'motion-sensor', 'out', 'or-all', 'in2'),
        createWire('w5', 'arm-switch', 'out', 'and-alarm', 'in1'),
        createWire('w6', 'or-all', 'out', 'and-alarm', 'in2'),
        createWire('w7', 'arm-switch', 'out', 'led-armed', 'in'),
        createWire('w8', 'and-alarm', 'out', 'led-alarm', 'in'),
        createWire('w9', 'door-sensor', 'out', 'led-door', 'in'),
        createWire('w10', 'window-sensor', 'out', 'led-window', 'in'),
        createWire('w11', 'motion-sensor', 'out', 'led-motion', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Arm/Disarm Switch',
            description: 'Place the main arm/disarm control switch',
            components: ['arm-switch'],
            wires: [],
            hint: 'ON = Armed, OFF = Disarmed',
        },
        {
            id: 'step-2',
            title: 'Add Zone Sensors',
            description: 'Add door, window, and motion sensors',
            components: ['door-sensor', 'window-sensor', 'motion-sensor'],
            wires: [],
            hint: 'Each sensor monitors a different zone',
        },
        {
            id: 'step-3',
            title: 'Add Zone OR Gates',
            description: 'Combine all sensor signals with OR gates',
            components: ['or-zones', 'or-all'],
            wires: ['w1', 'w2', 'w3', 'w4'],
            hint: 'Any sensor can trigger the alarm',
        },
        {
            id: 'step-4',
            title: 'Add Alarm AND Gate',
            description: 'AND gate ensures alarm only triggers when armed',
            components: ['and-alarm'],
            wires: ['w5', 'w6'],
            hint: 'Alarm = Armed AND (any sensor)',
        },
        {
            id: 'step-5',
            title: 'Add Indicator LEDs',
            description: 'Add LEDs for armed status, alarm, and zone indicators',
            components: ['led-armed', 'led-alarm', 'led-door', 'led-window', 'led-motion'],
            wires: ['w7', 'w8', 'w9', 'w10', 'w11'],
            hint: 'Test: arm system, then trip a sensor',
        },
    ],
};

// ============================================================================
// COMMUNICATION TEMPLATES
// ============================================================================

const parallelToSerialTemplate: Template = {
    id: 'parallel-to-serial',
    name: 'Parallel to Serial Converter',
    category: 'communication',
    description: 'Convert 4-bit parallel data to serial output using a shift register',
    difficulty: 'intermediate',
    overview: 'Learn how parallel data is converted to serial format for transmission over a single wire, a fundamental concept in serial communication.',
    theory: `
Parallel to Serial Conversion (PISO)
====================================

Converts multiple bits available simultaneously (parallel)
into a sequence of bits sent one at a time (serial).

This is the basis for serial communication protocols
like UART, SPI, and I2C.

Operation:
1. LOAD phase: Parallel data loaded into shift register
2. SHIFT phase: Data shifted out one bit per clock

Timing Diagram:
CLK:    _|‾|_|‾|_|‾|_|‾|_
LOAD:   ‾‾‾|_____________
DATA:   [D3 D2 D1 D0]
SERIAL: ----D3-D2-D1-D0--

Applications:
- UART transmitter
- SPI MOSI line
- Reducing wire count in long-distance communication
    `,
    components: [
        createComp('d0', 'SWITCH_TOGGLE', 60, 80, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('d1', 'SWITCH_TOGGLE', 60, 130, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('d2', 'SWITCH_TOGGLE', 60, 180, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('d3', 'SWITCH_TOGGLE', 60, 230, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('clock', 'CLOCK', 60, 300, [{ id: 'out', name: 'CLK', type: 'output', x: 30, y: 0 }]),
        createComp('shift-reg', 'SHIFT_REGISTER_8BIT', 280, 180, [
            { id: 'si', name: 'SI', type: 'input', x: -60, y: -20 },
            { id: 'clk', name: 'CLK', type: 'input', x: -60, y: 20 },
            { id: 'q0', name: 'Q0', type: 'output', x: 60, y: -35 },
            { id: 'q1', name: 'Q1', type: 'output', x: 60, y: -15 },
            { id: 'q2', name: 'Q2', type: 'output', x: 60, y: 5 },
            { id: 'q3', name: 'Q3', type: 'output', x: 60, y: 25 },
            { id: 'q4', name: 'Q4', type: 'output', x: 60, y: 45 },
            { id: 'q5', name: 'Q5', type: 'output', x: 60, y: 65 },
            { id: 'q6', name: 'Q6', type: 'output', x: 60, y: 85 },
            { id: 'q7', name: 'Q7', type: 'output', x: 60, y: 105 },
        ]),
        createComp('led-serial', 'LED_GREEN', 450, 100, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-d0', 'LED_BLUE', 450, 160, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-d1', 'LED_BLUE', 450, 200, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-d2', 'LED_BLUE', 450, 240, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-d3', 'LED_BLUE', 450, 280, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'd0', 'out', 'shift-reg', 'si'),
        createWire('w2', 'clock', 'out', 'shift-reg', 'clk'),
        createWire('w3', 'shift-reg', 'q3', 'led-serial', 'in'),
        createWire('w4', 'shift-reg', 'q0', 'led-d0', 'in'),
        createWire('w5', 'shift-reg', 'q1', 'led-d1', 'in'),
        createWire('w6', 'shift-reg', 'q2', 'led-d2', 'in'),
        createWire('w7', 'shift-reg', 'q3', 'led-d3', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Parallel Data Inputs',
            description: 'Place 4 toggle switches for the parallel data (D0-D3)',
            components: ['d0', 'd1', 'd2', 'd3'],
            wires: [],
            hint: 'These represent 4 bits of parallel data',
        },
        {
            id: 'step-2',
            title: 'Add Clock',
            description: 'Add clock to control the shift timing',
            components: ['clock'],
            wires: [],
        },
        {
            id: 'step-3',
            title: 'Add Shift Register',
            description: 'Place shift register for serial conversion',
            components: ['shift-reg'],
            wires: ['w1', 'w2'],
            hint: 'Data shifts through on each clock pulse',
        },
        {
            id: 'step-4',
            title: 'Add Output LEDs',
            description: 'Add LEDs to see serial output and register contents',
            components: ['led-serial', 'led-d0', 'led-d1', 'led-d2', 'led-d3'],
            wires: ['w3', 'w4', 'w5', 'w6', 'w7'],
            hint: 'Green LED shows serial output, blue shows register state',
        },
    ],
};

const encoderDecoderTemplate: Template = {
    id: 'encoder-decoder',
    name: 'Priority Encoder & Decoder',
    category: 'communication',
    description: 'Learn how encoders compress data and decoders expand it',
    difficulty: 'beginner',
    overview: 'Encoders convert multiple input lines to a binary code, while decoders do the reverse. These are fundamental to address decoding and data compression.',
    theory: `
Priority Encoder and Decoder
============================

ENCODER: Many inputs → Few outputs (compression)
DECODER: Few inputs → Many outputs (expansion)

4-to-2 Priority Encoder:
| D3 | D2 | D1 | D0 | Y1 | Y0 | Valid |
|----|----|----|----|----|-----|-------|
| 0  | 0  | 0  | 0  | X  | X  |   0   |
| 0  | 0  | 0  | 1  | 0  | 0  |   1   |
| 0  | 0  | 1  | X  | 0  | 1  |   1   |
| 0  | 1  | X  | X  | 1  | 0  |   1   |
| 1  | X  | X  | X  | 1  | 1  |   1   |

"Priority" means higher-numbered inputs take precedence.

2-to-4 Decoder (reverse operation):
| A1 | A0 | Y0 | Y1 | Y2 | Y3 |
|----|----|----|----|----|----|
| 0  | 0  | 1  | 0  | 0  | 0  |
| 0  | 1  | 0  | 1  | 0  | 0  |
| 1  | 0  | 0  | 0  | 1  | 0  |
| 1  | 1  | 0  | 0  | 0  | 1  |

Applications:
- Keyboard encoding
- Memory address decoding
- Interrupt priority handling
    `,
    components: [
        createComp('a0', 'SWITCH_TOGGLE', 80, 120, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('a1', 'SWITCH_TOGGLE', 80, 180, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('decoder', 'DECODER_2TO4', 250, 150, [
            { id: 'a0', name: 'A0', type: 'input', x: -40, y: -15 },
            { id: 'a1', name: 'A1', type: 'input', x: -40, y: 15 },
            { id: 'y0', name: 'Y0', type: 'output', x: 40, y: -30 },
            { id: 'y1', name: 'Y1', type: 'output', x: 40, y: -10 },
            { id: 'y2', name: 'Y2', type: 'output', x: 40, y: 10 },
            { id: 'y3', name: 'Y3', type: 'output', x: 40, y: 30 },
        ]),
        createComp('led-y0', 'LED_GREEN', 400, 90, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-y1', 'LED_GREEN', 400, 130, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-y2', 'LED_GREEN', 400, 170, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-y3', 'LED_GREEN', 400, 210, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'a0', 'out', 'decoder', 'a0'),
        createWire('w2', 'a1', 'out', 'decoder', 'a1'),
        createWire('w3', 'decoder', 'y0', 'led-y0', 'in'),
        createWire('w4', 'decoder', 'y1', 'led-y1', 'in'),
        createWire('w5', 'decoder', 'y2', 'led-y2', 'in'),
        createWire('w6', 'decoder', 'y3', 'led-y3', 'in'),
    ],
    steps: [
        {
            id: 'step-1',
            title: 'Add Address Inputs',
            description: 'Place two toggle switches for the 2-bit address',
            components: ['a0', 'a1'],
            wires: [],
            hint: 'A0 is LSB, A1 is MSB',
        },
        {
            id: 'step-2',
            title: 'Add Decoder',
            description: 'Place the 2-to-4 decoder',
            components: ['decoder'],
            wires: ['w1', 'w2'],
            hint: 'Decoder converts 2-bit input to 4 output lines',
        },
        {
            id: 'step-3',
            title: 'Add Output LEDs',
            description: 'Add LEDs to show which output is selected',
            components: ['led-y0', 'led-y1', 'led-y2', 'led-y3'],
            wires: ['w3', 'w4', 'w5', 'w6'],
            hint: 'Only one LED should be ON at a time',
        },
    ],
};

// ============================================================================
// NEW TEMPLATES - DIGITAL LOGIC
// ============================================================================

const nandGateTemplate: Template = {
    id: 'nand-gate-basics',
    name: 'NAND Gate Universal',
    category: 'digital-logic',
    description: 'Build NOT, AND, OR gates using only NAND gates',
    difficulty: 'beginner',
    overview: 'NAND is a universal gate - you can build any logic circuit using only NAND gates. Learn how to create basic gates from NAND.',
    theory: `
NAND as Universal Gate
======================
NAND can implement any Boolean function.

NOT from NAND: Y = A NAND A
AND from NAND: Y = (A NAND B) NAND (A NAND B)
OR from NAND: Y = (A NAND A) NAND (B NAND B)

Truth Table (NAND):
| A | B | Y |
|---|---|---|
| 0 | 0 | 1 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |
    `,
    components: [
        createComp('input-a', 'SWITCH_TOGGLE', 80, 100, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('input-b', 'SWITCH_TOGGLE', 80, 180, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('nand1', 'NAND_2', 200, 140, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('nand2', 'NAND_2', 320, 140, [
            { id: 'in1', name: 'A', type: 'input', x: -30, y: -10 },
            { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 },
            { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 },
        ]),
        createComp('led-nand', 'LED_GREEN', 250, 60, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
        createComp('led-and', 'LED_BLUE', 420, 140, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'input-a', 'out', 'nand1', 'in1'),
        createWire('w2', 'input-b', 'out', 'nand1', 'in2'),
        createWire('w3', 'nand1', 'out', 'led-nand', 'in'),
        createWire('w4', 'nand1', 'out', 'nand2', 'in1'),
        createWire('w5', 'nand1', 'out', 'nand2', 'in2'),
        createWire('w6', 'nand2', 'out', 'led-and', 'in'),
    ],
    steps: [
        { id: 'step-1', title: 'Add Inputs', description: 'Place two toggle switches', components: ['input-a', 'input-b'], wires: [] },
        { id: 'step-2', title: 'Add First NAND', description: 'This performs A NAND B', components: ['nand1'], wires: ['w1', 'w2'] },
        { id: 'step-3', title: 'Show NAND Output', description: 'Green LED shows NAND result', components: ['led-nand'], wires: ['w3'] },
        { id: 'step-4', title: 'Create AND from NAND', description: 'NAND the NAND output with itself to get AND', components: ['nand2', 'led-and'], wires: ['w4', 'w5', 'w6'] },
    ],
};

const xorFromBasicGatesTemplate: Template = {
    id: 'xor-from-basic',
    name: 'XOR from Basic Gates',
    category: 'digital-logic',
    description: 'Build an XOR gate using AND, OR, and NOT gates',
    difficulty: 'intermediate',
    overview: 'Learn how complex gates are built from simpler ones by constructing XOR from AND, OR, and NOT.',
    theory: `
XOR from Basic Gates
====================
XOR = (A AND NOT B) OR (NOT A AND B)
    = A'B + AB'

This is the "exclusive or" - true when inputs differ.

| A | B | A XOR B |
|---|---|---------|
| 0 | 0 |    0    |
| 0 | 1 |    1    |
| 1 | 0 |    1    |
| 1 | 1 |    0    |
    `,
    components: [
        createComp('input-a', 'SWITCH_TOGGLE', 60, 100, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('input-b', 'SWITCH_TOGGLE', 60, 200, [{ id: 'out', name: 'Q', type: 'output', x: 30, y: 0 }]),
        createComp('not-a', 'NOT', 160, 80, [{ id: 'in', name: 'A', type: 'input', x: -25, y: 0 }, { id: 'out', name: 'Y', type: 'output', x: 25, y: 0 }]),
        createComp('not-b', 'NOT', 160, 220, [{ id: 'in', name: 'A', type: 'input', x: -25, y: 0 }, { id: 'out', name: 'Y', type: 'output', x: 25, y: 0 }]),
        createComp('and1', 'AND_2', 280, 100, [{ id: 'in1', name: 'A', type: 'input', x: -30, y: -10 }, { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 }, { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 }]),
        createComp('and2', 'AND_2', 280, 200, [{ id: 'in1', name: 'A', type: 'input', x: -30, y: -10 }, { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 }, { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 }]),
        createComp('or1', 'OR_2', 400, 150, [{ id: 'in1', name: 'A', type: 'input', x: -30, y: -10 }, { id: 'in2', name: 'B', type: 'input', x: -30, y: 10 }, { id: 'out', name: 'Y', type: 'output', x: 30, y: 0 }]),
        createComp('led-out', 'LED_GREEN', 500, 150, [{ id: 'in', name: 'D', type: 'input', x: -30, y: 0 }]),
    ],
    wires: [
        createWire('w1', 'input-a', 'out', 'not-a', 'in'),
        createWire('w2', 'input-b', 'out', 'not-b', 'in'),
        createWire('w3', 'input-a', 'out', 'and2', 'in1'),
        createWire('w4', 'not-b', 'out', 'and2', 'in2'),
        createWire('w5', 'not-a', 'out', 'and1', 'in1'),
        createWire('w6', 'input-b', 'out', 'and1', 'in2'),
        createWire('w7', 'and1', 'out', 'or1', 'in1'),
        createWire('w8', 'and2', 'out', 'or1', 'in2'),
        createWire('w9', 'or1', 'out', 'led-out', 'in'),
    ],
    steps: [
        { id: 'step-1', title: 'Add Inputs', description: 'Place two toggle switches for A and B', components: ['input-a', 'input-b'], wires: [] },
        { id: 'step-2', title: 'Add Inverters', description: 'Create NOT A and NOT B', components: ['not-a', 'not-b'], wires: ['w1', 'w2'] },
        { id: 'step-3', title: 'Add AND Gates', description: 'Create A·B\' and A\'·B', components: ['and1', 'and2'], wires: ['w3', 'w4', 'w5', 'w6'] },
        { id: 'step-4', title: 'Add OR Gate', description: 'Combine with OR to get XOR', components: ['or1', 'led-out'], wires: ['w7', 'w8', 'w9'] },
    ],
};

// ============================================================================
// ALL TEMPLATES
// ============================================================================

export const TEMPLATES: Template[] = [
    // Digital Logic Fundamentals (Beginner)
    nandGateTemplate,
    halfAdderTemplate,
    fullAdderTemplate,
    decoder2to4Template,
    rippleCarryAdderTemplate,
    xorFromBasicGatesTemplate,
    // Computing
    multiplexerDemoTemplate,
    comparator4BitTemplate,
    // Sequential Circuits
    srLatchTemplate,
    dFlipFlopTemplate,
    jkCounterTemplate,
    shiftRegisterTemplate,
    // Robotics
    motorControllerTemplate,
    lineFollowerLogicTemplate,
    // Automation
    trafficLightTemplate,
    elevatorControllerTemplate,
    alarmSystemTemplate,
    // Communication
    encoderDecoderTemplate,
    parallelToSerialTemplate,
    // Additional templates (13 more)
    ...ADDITIONAL_TEMPLATES_V2,
];

export function getTemplateById(id: string): Template | undefined {
    return TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): Template[] {
    return TEMPLATES.filter(t => t.category === category);
}
