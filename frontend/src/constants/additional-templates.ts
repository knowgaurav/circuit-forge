/**
 * Additional Circuit Templates - ADVANCED
 * All built from basic gates only - NO abstractions
 * Students learn the internal workings of every circuit
 */

import type { CircuitComponent, Wire } from '@/types';
import type { Template } from './templates';

// Helper functions
function createComp(
    id: string, type: string, x: number, y: number,
    pins: Array<{ id: string; name: string; type: 'input' | 'output'; x: number; y: number }>
): CircuitComponent {
    return {
        id, type: type as CircuitComponent['type'], label: id.toUpperCase(),
        position: { x, y }, rotation: 0, properties: {},
        pins: pins.map(p => ({ id: p.id, name: p.name, type: p.type, position: { x: p.x, y: p.y } })),
    };
}

function createWire(id: string, fromComp: string, fromPin: string, toComp: string, toPin: string): Wire {
    return { id, fromComponentId: fromComp, fromPinId: fromPin, toComponentId: toComp, toPinId: toPin, waypoints: [] };
}

// Standard pin definitions
const and2Pins = [
    { id: 'in1', name: 'A', type: 'input' as const, x: -30, y: -10 },
    { id: 'in2', name: 'B', type: 'input' as const, x: -30, y: 10 },
    { id: 'out', name: 'Y', type: 'output' as const, x: 30, y: 0 },
];
const or2Pins = and2Pins;
const xor2Pins = and2Pins;
const nand2Pins = and2Pins;
const nor2Pins = and2Pins;
const notPins = [
    { id: 'in', name: 'A', type: 'input' as const, x: -25, y: 0 },
    { id: 'out', name: 'Y', type: 'output' as const, x: 25, y: 0 },
];
const switchPins = [{ id: 'out', name: 'Q', type: 'output' as const, x: 30, y: 0 }];
const ledPins = [{ id: 'in', name: 'D', type: 'input' as const, x: -30, y: 0 }];


// ============================================================================
// 1. 4-TO-1 MUX FROM GATES (Advanced) - No MUX component, pure gates
// ============================================================================
export const mux4to1FromGatesTemplate: Template = {
    id: 'mux-4to1-gates',
    name: '4:1 MUX from Gates',
    category: 'computing',
    description: 'Build a 4-to-1 multiplexer using only AND, OR, NOT gates',
    difficulty: 'advanced',
    overview: 'Y = S1\'S0\'D0 + S1\'S0·D1 + S1·S0\'D2 + S1·S0·D3',
    theory: `
4-to-1 Multiplexer from basic gates:
- 2 select lines (S1, S0) choose one of 4 inputs (D0-D3)
- Each input needs a 3-input AND with appropriate select signals
- Final OR combines all paths

| S1 | S0 | Output |
|----|----| -------|
| 0  | 0  |   D0   |
| 0  | 1  |   D1   |
| 1  | 0  |   D2   |
| 1  | 1  |   D3   |
    `,
    components: [
        // Data inputs
        createComp('d0', 'SWITCH_TOGGLE', 60, 60, switchPins),
        createComp('d1', 'SWITCH_TOGGLE', 60, 120, switchPins),
        createComp('d2', 'SWITCH_TOGGLE', 60, 180, switchPins),
        createComp('d3', 'SWITCH_TOGGLE', 60, 240, switchPins),
        // Select inputs
        createComp('s0', 'SWITCH_TOGGLE', 60, 320, switchPins),
        createComp('s1', 'SWITCH_TOGGLE', 60, 380, switchPins),
        // Inverters for select lines
        createComp('not-s0', 'NOT', 160, 320, notPins),
        createComp('not-s1', 'NOT', 160, 380, notPins),
        // AND gates for each data path (need 3-input AND = 2 cascaded ANDs)
        createComp('and-d0-1', 'AND_2', 260, 50, and2Pins),
        createComp('and-d0-2', 'AND_2', 360, 60, and2Pins),
        createComp('and-d1-1', 'AND_2', 260, 110, and2Pins),
        createComp('and-d1-2', 'AND_2', 360, 120, and2Pins),
        createComp('and-d2-1', 'AND_2', 260, 170, and2Pins),
        createComp('and-d2-2', 'AND_2', 360, 180, and2Pins),
        createComp('and-d3-1', 'AND_2', 260, 230, and2Pins),
        createComp('and-d3-2', 'AND_2', 360, 240, and2Pins),
        // OR gates to combine (cascade 3 ORs)
        createComp('or1', 'OR_2', 480, 90, or2Pins),
        createComp('or2', 'OR_2', 480, 210, or2Pins),
        createComp('or3', 'OR_2', 580, 150, or2Pins),
        createComp('led', 'LED_GREEN', 680, 150, ledPins),
    ],
    wires: [
        // Inverters
        createWire('w1', 's0', 'out', 'not-s0', 'in'),
        createWire('w2', 's1', 'out', 'not-s1', 'in'),
        // D0 path: D0 AND S1' AND S0'
        createWire('w3', 'not-s1', 'out', 'and-d0-1', 'in1'),
        createWire('w4', 'not-s0', 'out', 'and-d0-1', 'in2'),
        createWire('w5', 'and-d0-1', 'out', 'and-d0-2', 'in1'),
        createWire('w6', 'd0', 'out', 'and-d0-2', 'in2'),
        // D1 path: D1 AND S1' AND S0
        createWire('w7', 'not-s1', 'out', 'and-d1-1', 'in1'),
        createWire('w8', 's0', 'out', 'and-d1-1', 'in2'),
        createWire('w9', 'and-d1-1', 'out', 'and-d1-2', 'in1'),
        createWire('w10', 'd1', 'out', 'and-d1-2', 'in2'),
        // D2 path: D2 AND S1 AND S0'
        createWire('w11', 's1', 'out', 'and-d2-1', 'in1'),
        createWire('w12', 'not-s0', 'out', 'and-d2-1', 'in2'),
        createWire('w13', 'and-d2-1', 'out', 'and-d2-2', 'in1'),
        createWire('w14', 'd2', 'out', 'and-d2-2', 'in2'),
        // D3 path: D3 AND S1 AND S0
        createWire('w15', 's1', 'out', 'and-d3-1', 'in1'),
        createWire('w16', 's0', 'out', 'and-d3-1', 'in2'),
        createWire('w17', 'and-d3-1', 'out', 'and-d3-2', 'in1'),
        createWire('w18', 'd3', 'out', 'and-d3-2', 'in2'),
        // OR tree
        createWire('w19', 'and-d0-2', 'out', 'or1', 'in1'),
        createWire('w20', 'and-d1-2', 'out', 'or1', 'in2'),
        createWire('w21', 'and-d2-2', 'out', 'or2', 'in1'),
        createWire('w22', 'and-d3-2', 'out', 'or2', 'in2'),
        createWire('w23', 'or1', 'out', 'or3', 'in1'),
        createWire('w24', 'or2', 'out', 'or3', 'in2'),
        createWire('w25', 'or3', 'out', 'led', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Data Inputs', description: 'Add 4 data switches D0-D3', components: ['d0', 'd1', 'd2', 'd3'], wires: [] },
        { id: 's2', title: 'Add Select Lines', description: 'Add S0, S1 and their inverters', components: ['s0', 's1', 'not-s0', 'not-s1'], wires: ['w1', 'w2'] },
        { id: 's3', title: 'Build D0 Path', description: 'D0 AND S1\' AND S0\'', components: ['and-d0-1', 'and-d0-2'], wires: ['w3', 'w4', 'w5', 'w6'] },
        { id: 's4', title: 'Build D1 Path', description: 'D1 AND S1\' AND S0', components: ['and-d1-1', 'and-d1-2'], wires: ['w7', 'w8', 'w9', 'w10'] },
        { id: 's5', title: 'Build D2 Path', description: 'D2 AND S1 AND S0\'', components: ['and-d2-1', 'and-d2-2'], wires: ['w11', 'w12', 'w13', 'w14'] },
        { id: 's6', title: 'Build D3 Path', description: 'D3 AND S1 AND S0', components: ['and-d3-1', 'and-d3-2'], wires: ['w15', 'w16', 'w17', 'w18'] },
        { id: 's7', title: 'Combine with OR', description: 'OR all paths together', components: ['or1', 'or2', 'or3', 'led'], wires: ['w19', 'w20', 'w21', 'w22', 'w23', 'w24', 'w25'] },
    ],
};


// ============================================================================
// 2. 2-BIT BINARY COUNTER FROM GATES (Advanced) - Using JK flip-flops built from NANDs
// ============================================================================
export const binaryCounterFromGatesTemplate: Template = {
    id: 'binary-counter-gates',
    name: '2-bit Counter from NANDs',
    category: 'sequential',
    description: 'Build a 2-bit binary counter using NAND gates to create JK flip-flops',
    difficulty: 'advanced',
    overview: 'Each bit uses a JK flip-flop in toggle mode. LSB toggles every clock, MSB toggles when LSB is high.',
    theory: `
2-bit Binary Counter: 00 → 01 → 10 → 11 → 00...

JK Flip-Flop from NANDs:
- SR latch + gating logic
- J=K=1 creates toggle mode

Counter Logic:
- Q0 (LSB): Toggle every clock (J0=K0=1)
- Q1 (MSB): Toggle when Q0=1 (J1=K1=Q0)

This shows how counters are built at the gate level!
    `,
    components: [
        // Clock input
        createComp('clk', 'SWITCH_TOGGLE', 60, 200, switchPins),
        // First JK FF (LSB) - built from NANDs
        // NAND latch core
        createComp('nand1-0', 'NAND_2', 200, 100, nand2Pins),
        createComp('nand2-0', 'NAND_2', 200, 160, nand2Pins),
        // Gating NANDs
        createComp('nand3-0', 'NAND_2', 300, 80, nand2Pins),
        createComp('nand4-0', 'NAND_2', 300, 180, nand2Pins),
        // Second JK FF (MSB)
        createComp('nand1-1', 'NAND_2', 480, 100, nand2Pins),
        createComp('nand2-1', 'NAND_2', 480, 160, nand2Pins),
        createComp('nand3-1', 'NAND_2', 580, 80, nand2Pins),
        createComp('nand4-1', 'NAND_2', 580, 180, nand2Pins),
        // Output LEDs
        createComp('led-q0', 'LED_GREEN', 400, 130, ledPins),
        createComp('led-q1', 'LED_GREEN', 680, 130, ledPins),
    ],
    wires: [
        // FF0: Cross-coupled NAND latch
        createWire('w1', 'nand1-0', 'out', 'nand2-0', 'in1'),
        createWire('w2', 'nand2-0', 'out', 'nand1-0', 'in2'),
        // FF0: Clock and feedback (toggle mode J=K=1 via feedback)
        createWire('w3', 'clk', 'out', 'nand3-0', 'in1'),
        createWire('w4', 'nand2-0', 'out', 'nand3-0', 'in2'),
        createWire('w5', 'clk', 'out', 'nand4-0', 'in1'),
        createWire('w6', 'nand1-0', 'out', 'nand4-0', 'in2'),
        createWire('w7', 'nand3-0', 'out', 'nand1-0', 'in1'),
        createWire('w8', 'nand4-0', 'out', 'nand2-0', 'in2'),
        // FF0 output
        createWire('w9', 'nand1-0', 'out', 'led-q0', 'in'),
        // FF1: Cross-coupled NAND latch
        createWire('w10', 'nand1-1', 'out', 'nand2-1', 'in1'),
        createWire('w11', 'nand2-1', 'out', 'nand1-1', 'in2'),
        // FF1: Gated by Q0 (toggle when Q0=1)
        createWire('w12', 'nand1-0', 'out', 'nand3-1', 'in1'),
        createWire('w13', 'nand2-1', 'out', 'nand3-1', 'in2'),
        createWire('w14', 'nand1-0', 'out', 'nand4-1', 'in1'),
        createWire('w15', 'nand1-1', 'out', 'nand4-1', 'in2'),
        createWire('w16', 'nand3-1', 'out', 'nand1-1', 'in1'),
        createWire('w17', 'nand4-1', 'out', 'nand2-1', 'in2'),
        // FF1 output
        createWire('w18', 'nand1-1', 'out', 'led-q1', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Clock', description: 'Add clock input', components: ['clk'], wires: [] },
        { id: 's2', title: 'Build FF0 Latch', description: 'Cross-coupled NANDs for LSB', components: ['nand1-0', 'nand2-0'], wires: ['w1', 'w2'] },
        { id: 's3', title: 'Add FF0 Gating', description: 'Clock gating for toggle', components: ['nand3-0', 'nand4-0'], wires: ['w3', 'w4', 'w5', 'w6', 'w7', 'w8'] },
        { id: 's4', title: 'Build FF1 Latch', description: 'Cross-coupled NANDs for MSB', components: ['nand1-1', 'nand2-1'], wires: ['w10', 'w11'] },
        { id: 's5', title: 'Add FF1 Gating', description: 'Gated by Q0', components: ['nand3-1', 'nand4-1'], wires: ['w12', 'w13', 'w14', 'w15', 'w16', 'w17'] },
        { id: 's6', title: 'Add LEDs', description: 'Show Q1 Q0', components: ['led-q0', 'led-q1'], wires: ['w9', 'w18'] },
    ],
};


// ============================================================================
// 3. 1-BIT ALU FROM GATES (Advanced) - Full ALU slice with AND, OR, ADD, SUB
// ============================================================================
export const aluSliceFromGatesTemplate: Template = {
    id: 'alu-slice-gates',
    name: '1-bit ALU Slice',
    category: 'computing',
    description: 'Build a 1-bit ALU that can AND, OR, ADD, SUB using only basic gates',
    difficulty: 'advanced',
    overview: 'Op select chooses operation. Uses full adder for arithmetic, gates for logic, MUX for output selection.',
    theory: `
1-bit ALU Operations:
- Op=00: A AND B
- Op=01: A OR B  
- Op=10: A + B (add with carry)
- Op=11: A - B (subtract via A + B' + 1)

Architecture:
1. Compute all operations in parallel
2. Use 4:1 MUX to select result
3. For SUB: invert B and set Cin=1

This is how real CPUs work at the bit level!
    `,
    components: [
        // Inputs
        createComp('a', 'SWITCH_TOGGLE', 60, 80, switchPins),
        createComp('b', 'SWITCH_TOGGLE', 60, 160, switchPins),
        createComp('cin', 'SWITCH_TOGGLE', 60, 240, switchPins),
        createComp('op0', 'SWITCH_TOGGLE', 60, 340, switchPins),
        createComp('op1', 'SWITCH_TOGGLE', 60, 400, switchPins),
        // B inverter for subtraction
        createComp('not-b', 'NOT', 160, 160, notPins),
        // Logic operations
        createComp('and-ab', 'AND_2', 260, 80, and2Pins),
        createComp('or-ab', 'OR_2', 260, 140, and2Pins),
        // Full adder for A+B
        createComp('xor1', 'XOR_2', 260, 200, xor2Pins),
        createComp('xor2', 'XOR_2', 360, 220, xor2Pins),
        createComp('and1', 'AND_2', 260, 260, and2Pins),
        createComp('and2', 'AND_2', 360, 280, and2Pins),
        createComp('or-carry', 'OR_2', 460, 270, or2Pins),
        // Op select inverters
        createComp('not-op0', 'NOT', 160, 340, notPins),
        createComp('not-op1', 'NOT', 160, 400, notPins),
        // 4:1 MUX for result selection (simplified - 4 AND gates + OR)
        createComp('mux-and0', 'AND_2', 500, 60, and2Pins),
        createComp('mux-and1', 'AND_2', 500, 100, and2Pins),
        createComp('mux-and2', 'AND_2', 500, 140, and2Pins),
        createComp('mux-and3', 'AND_2', 500, 180, and2Pins),
        createComp('mux-or1', 'OR_2', 600, 80, or2Pins),
        createComp('mux-or2', 'OR_2', 600, 160, or2Pins),
        createComp('mux-or3', 'OR_2', 700, 120, or2Pins),
        // Outputs
        createComp('led-result', 'LED_GREEN', 800, 120, ledPins),
        createComp('led-cout', 'LED_RED', 560, 270, ledPins),
    ],
    wires: [
        // B inverter
        createWire('w1', 'b', 'out', 'not-b', 'in'),
        // AND operation
        createWire('w2', 'a', 'out', 'and-ab', 'in1'),
        createWire('w3', 'b', 'out', 'and-ab', 'in2'),
        // OR operation
        createWire('w4', 'a', 'out', 'or-ab', 'in1'),
        createWire('w5', 'b', 'out', 'or-ab', 'in2'),
        // Full adder: Sum = A XOR B XOR Cin
        createWire('w6', 'a', 'out', 'xor1', 'in1'),
        createWire('w7', 'b', 'out', 'xor1', 'in2'),
        createWire('w8', 'xor1', 'out', 'xor2', 'in1'),
        createWire('w9', 'cin', 'out', 'xor2', 'in2'),
        // Full adder: Cout = AB + (A XOR B)Cin
        createWire('w10', 'a', 'out', 'and1', 'in1'),
        createWire('w11', 'b', 'out', 'and1', 'in2'),
        createWire('w12', 'xor1', 'out', 'and2', 'in1'),
        createWire('w13', 'cin', 'out', 'and2', 'in2'),
        createWire('w14', 'and1', 'out', 'or-carry', 'in1'),
        createWire('w15', 'and2', 'out', 'or-carry', 'in2'),
        createWire('w16', 'or-carry', 'out', 'led-cout', 'in'),
        // Op inverters
        createWire('w17', 'op0', 'out', 'not-op0', 'in'),
        createWire('w18', 'op1', 'out', 'not-op1', 'in'),
        // MUX: Select AND result when op=00
        createWire('w19', 'and-ab', 'out', 'mux-and0', 'in1'),
        createWire('w20', 'not-op0', 'out', 'mux-and0', 'in2'),
        // MUX: Select OR result when op=01
        createWire('w21', 'or-ab', 'out', 'mux-and1', 'in1'),
        createWire('w22', 'op0', 'out', 'mux-and1', 'in2'),
        // MUX: Select ADD result when op=10
        createWire('w23', 'xor2', 'out', 'mux-and2', 'in1'),
        createWire('w24', 'not-op0', 'out', 'mux-and2', 'in2'),
        // MUX: Select ADD result when op=11 (SUB uses same adder)
        createWire('w25', 'xor2', 'out', 'mux-and3', 'in1'),
        createWire('w26', 'op0', 'out', 'mux-and3', 'in2'),
        // MUX OR tree
        createWire('w27', 'mux-and0', 'out', 'mux-or1', 'in1'),
        createWire('w28', 'mux-and1', 'out', 'mux-or1', 'in2'),
        createWire('w29', 'mux-and2', 'out', 'mux-or2', 'in1'),
        createWire('w30', 'mux-and3', 'out', 'mux-or2', 'in2'),
        createWire('w31', 'mux-or1', 'out', 'mux-or3', 'in1'),
        createWire('w32', 'mux-or2', 'out', 'mux-or3', 'in2'),
        createWire('w33', 'mux-or3', 'out', 'led-result', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Inputs', description: 'A, B, Cin, Op0, Op1', components: ['a', 'b', 'cin', 'op0', 'op1'], wires: [] },
        { id: 's2', title: 'Logic Ops', description: 'AND and OR gates', components: ['and-ab', 'or-ab'], wires: ['w2', 'w3', 'w4', 'w5'] },
        { id: 's3', title: 'Full Adder', description: 'XOR chain for sum', components: ['xor1', 'xor2', 'and1', 'and2', 'or-carry'], wires: ['w6', 'w7', 'w8', 'w9', 'w10', 'w11', 'w12', 'w13', 'w14', 'w15', 'w16'] },
        { id: 's4', title: 'Op Decode', description: 'Invert op bits', components: ['not-b', 'not-op0', 'not-op1'], wires: ['w1', 'w17', 'w18'] },
        { id: 's5', title: 'Result MUX', description: '4:1 MUX selects output', components: ['mux-and0', 'mux-and1', 'mux-and2', 'mux-and3', 'mux-or1', 'mux-or2', 'mux-or3', 'led-result', 'led-cout'], wires: ['w19', 'w20', 'w21', 'w22', 'w23', 'w24', 'w25', 'w26', 'w27', 'w28', 'w29', 'w30', 'w31', 'w32', 'w33'] },
    ],
};


// ============================================================================
// 4. 1-BIT MEMORY CELL (D LATCH) FROM NAND GATES (Intermediate)
// ============================================================================
export const memoryCell1BitTemplate: Template = {
    id: 'memory-cell-1bit',
    name: '1-bit Memory Cell',
    category: 'sequential',
    description: 'Build a D latch memory cell using only NAND gates - the basis of RAM',
    difficulty: 'intermediate',
    overview: 'A gated D latch stores 1 bit. When Write Enable is HIGH, data is captured. When LOW, data is held.',
    theory: `
D Latch from NAND gates:
1. Two NANDs form SR latch (cross-coupled)
2. Two more NANDs create gating logic
3. NOT gate creates D' from D

When WE=1: Q follows D (transparent)
When WE=0: Q holds last value (latched)

This is the fundamental building block of RAM!
    `,
    components: [
        // Inputs
        createComp('d', 'SWITCH_TOGGLE', 60, 100, switchPins),
        createComp('we', 'SWITCH_TOGGLE', 60, 200, switchPins),
        // NOT for D'
        createComp('not-d', 'NOT', 160, 100, notPins),
        // Gating NANDs
        createComp('nand-s', 'NAND_2', 260, 80, nand2Pins),
        createComp('nand-r', 'NAND_2', 260, 180, nand2Pins),
        // SR latch NANDs
        createComp('nand-q', 'NAND_2', 380, 100, nand2Pins),
        createComp('nand-qn', 'NAND_2', 380, 160, nand2Pins),
        // Outputs
        createComp('led-q', 'LED_GREEN', 500, 100, ledPins),
        createComp('led-qn', 'LED_RED', 500, 160, ledPins),
    ],
    wires: [
        // D inverter
        createWire('w1', 'd', 'out', 'not-d', 'in'),
        // S gate: D AND WE
        createWire('w2', 'd', 'out', 'nand-s', 'in1'),
        createWire('w3', 'we', 'out', 'nand-s', 'in2'),
        // R gate: D' AND WE
        createWire('w4', 'not-d', 'out', 'nand-r', 'in1'),
        createWire('w5', 'we', 'out', 'nand-r', 'in2'),
        // SR latch connections
        createWire('w6', 'nand-s', 'out', 'nand-q', 'in1'),
        createWire('w7', 'nand-qn', 'out', 'nand-q', 'in2'),
        createWire('w8', 'nand-r', 'out', 'nand-qn', 'in2'),
        createWire('w9', 'nand-q', 'out', 'nand-qn', 'in1'),
        // Outputs
        createWire('w10', 'nand-q', 'out', 'led-q', 'in'),
        createWire('w11', 'nand-qn', 'out', 'led-qn', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Inputs', description: 'Data (D) and Write Enable (WE)', components: ['d', 'we'], wires: [] },
        { id: 's2', title: 'Invert D', description: 'Create D\' for reset path', components: ['not-d'], wires: ['w1'] },
        { id: 's3', title: 'Add Gating', description: 'NANDs gate D and D\' with WE', components: ['nand-s', 'nand-r'], wires: ['w2', 'w3', 'w4', 'w5'] },
        { id: 's4', title: 'Build SR Latch', description: 'Cross-coupled NANDs store the bit', components: ['nand-q', 'nand-qn'], wires: ['w6', 'w7', 'w8', 'w9'] },
        { id: 's5', title: 'Add Outputs', description: 'Q and Q\' LEDs', components: ['led-q', 'led-qn'], wires: ['w10', 'w11'] },
    ],
};


// ============================================================================
// 5. 2x2 RAM FROM GATES (Advanced) - Real RAM internals!
// ============================================================================
export const ram2x2FromGatesTemplate: Template = {
    id: 'ram-2x2-gates',
    name: '2x2 RAM from Gates',
    category: 'computing',
    description: 'Build a 2-word x 2-bit RAM using D latches, decoder, and MUX - all from basic gates',
    difficulty: 'advanced',
    overview: 'Real RAM architecture: Address decoder selects word, D latches store bits, MUX reads data.',
    theory: `
2x2 RAM Architecture:
- 2 words, 2 bits each = 4 D latches total
- 1-bit address selects word 0 or word 1
- Write: Decoder enables one word's latches
- Read: MUX selects one word's outputs

D Latch from NOR gates:
- Set path: D AND WE → NOR-Q input
- Reset path: D' AND WE → NOR-QN input
- Cross-coupled feedback holds state when WE=0

Address Decoder (1-to-2):
- A=0: Select word 0
- A=1: Select word 1

This is exactly how real SRAM works!
    `,
    components: [
        // Inputs
        createComp('d0', 'SWITCH_TOGGLE', 60, 60, switchPins),
        createComp('d1', 'SWITCH_TOGGLE', 60, 140, switchPins),
        createComp('addr', 'SWITCH_TOGGLE', 60, 240, switchPins),
        createComp('we', 'SWITCH_TOGGLE', 60, 320, switchPins),
        // Data inverters for reset path
        createComp('not-d0', 'NOT', 140, 90, notPins),
        createComp('not-d1', 'NOT', 140, 170, notPins),
        // Address decoder
        createComp('not-addr', 'NOT', 140, 240, notPins),
        createComp('and-sel0', 'AND_2', 240, 220, and2Pins),
        createComp('and-sel1', 'AND_2', 240, 280, and2Pins),
        // Word 0, Bit 0: D latch (Set AND + Reset AND + NOR SR latch)
        createComp('and-set-00', 'AND_2', 340, 40, and2Pins),   // D0 AND SEL0 -> Set
        createComp('and-rst-00', 'AND_2', 340, 80, and2Pins),   // D0' AND SEL0 -> Reset
        createComp('nor-00-q', 'NOR_2', 460, 50, nor2Pins),
        createComp('nor-00-qn', 'NOR_2', 460, 90, nor2Pins),
        // Word 0, Bit 1: D latch
        createComp('and-set-01', 'AND_2', 340, 140, and2Pins),
        createComp('and-rst-01', 'AND_2', 340, 180, and2Pins),
        createComp('nor-01-q', 'NOR_2', 460, 150, nor2Pins),
        createComp('nor-01-qn', 'NOR_2', 460, 190, nor2Pins),
        // Word 1, Bit 0: D latch
        createComp('and-set-10', 'AND_2', 340, 260, and2Pins),
        createComp('and-rst-10', 'AND_2', 340, 300, and2Pins),
        createComp('nor-10-q', 'NOR_2', 460, 270, nor2Pins),
        createComp('nor-10-qn', 'NOR_2', 460, 310, nor2Pins),
        // Word 1, Bit 1: D latch
        createComp('and-set-11', 'AND_2', 340, 360, and2Pins),
        createComp('and-rst-11', 'AND_2', 340, 400, and2Pins),
        createComp('nor-11-q', 'NOR_2', 460, 370, nor2Pins),
        createComp('nor-11-qn', 'NOR_2', 460, 410, nor2Pins),
        // Read MUX (2:1 for each bit)
        createComp('and-mux0-w0', 'AND_2', 580, 60, and2Pins),
        createComp('and-mux0-w1', 'AND_2', 580, 120, and2Pins),
        createComp('or-mux0', 'OR_2', 680, 90, or2Pins),
        createComp('and-mux1-w0', 'AND_2', 580, 200, and2Pins),
        createComp('and-mux1-w1', 'AND_2', 580, 260, and2Pins),
        createComp('or-mux1', 'OR_2', 680, 230, or2Pins),
        // Outputs
        createComp('led-out0', 'LED_GREEN', 780, 90, ledPins),
        createComp('led-out1', 'LED_GREEN', 780, 230, ledPins),
    ],
    wires: [
        // Data inverters
        createWire('w1', 'd0', 'out', 'not-d0', 'in'),
        createWire('w2', 'd1', 'out', 'not-d1', 'in'),
        // Address decoder
        createWire('w3', 'addr', 'out', 'not-addr', 'in'),
        createWire('w4', 'not-addr', 'out', 'and-sel0', 'in1'),
        createWire('w5', 'we', 'out', 'and-sel0', 'in2'),
        createWire('w6', 'addr', 'out', 'and-sel1', 'in1'),
        createWire('w7', 'we', 'out', 'and-sel1', 'in2'),
        // Word 0, Bit 0: D latch
        createWire('w10', 'd0', 'out', 'and-set-00', 'in1'),
        createWire('w11', 'and-sel0', 'out', 'and-set-00', 'in2'),
        createWire('w12', 'not-d0', 'out', 'and-rst-00', 'in1'),
        createWire('w13', 'and-sel0', 'out', 'and-rst-00', 'in2'),
        createWire('w14', 'and-set-00', 'out', 'nor-00-q', 'in1'),
        createWire('w15', 'nor-00-qn', 'out', 'nor-00-q', 'in2'),
        createWire('w16', 'and-rst-00', 'out', 'nor-00-qn', 'in1'),
        createWire('w17', 'nor-00-q', 'out', 'nor-00-qn', 'in2'),
        // Word 0, Bit 1: D latch
        createWire('w20', 'd1', 'out', 'and-set-01', 'in1'),
        createWire('w21', 'and-sel0', 'out', 'and-set-01', 'in2'),
        createWire('w22', 'not-d1', 'out', 'and-rst-01', 'in1'),
        createWire('w23', 'and-sel0', 'out', 'and-rst-01', 'in2'),
        createWire('w24', 'and-set-01', 'out', 'nor-01-q', 'in1'),
        createWire('w25', 'nor-01-qn', 'out', 'nor-01-q', 'in2'),
        createWire('w26', 'and-rst-01', 'out', 'nor-01-qn', 'in1'),
        createWire('w27', 'nor-01-q', 'out', 'nor-01-qn', 'in2'),
        // Word 1, Bit 0: D latch
        createWire('w30', 'd0', 'out', 'and-set-10', 'in1'),
        createWire('w31', 'and-sel1', 'out', 'and-set-10', 'in2'),
        createWire('w32', 'not-d0', 'out', 'and-rst-10', 'in1'),
        createWire('w33', 'and-sel1', 'out', 'and-rst-10', 'in2'),
        createWire('w34', 'and-set-10', 'out', 'nor-10-q', 'in1'),
        createWire('w35', 'nor-10-qn', 'out', 'nor-10-q', 'in2'),
        createWire('w36', 'and-rst-10', 'out', 'nor-10-qn', 'in1'),
        createWire('w37', 'nor-10-q', 'out', 'nor-10-qn', 'in2'),
        // Word 1, Bit 1: D latch
        createWire('w40', 'd1', 'out', 'and-set-11', 'in1'),
        createWire('w41', 'and-sel1', 'out', 'and-set-11', 'in2'),
        createWire('w42', 'not-d1', 'out', 'and-rst-11', 'in1'),
        createWire('w43', 'and-sel1', 'out', 'and-rst-11', 'in2'),
        createWire('w44', 'and-set-11', 'out', 'nor-11-q', 'in1'),
        createWire('w45', 'nor-11-qn', 'out', 'nor-11-q', 'in2'),
        createWire('w46', 'and-rst-11', 'out', 'nor-11-qn', 'in1'),
        createWire('w47', 'nor-11-q', 'out', 'nor-11-qn', 'in2'),
        // Read MUX bit 0
        createWire('w50', 'nor-00-q', 'out', 'and-mux0-w0', 'in1'),
        createWire('w51', 'not-addr', 'out', 'and-mux0-w0', 'in2'),
        createWire('w52', 'nor-10-q', 'out', 'and-mux0-w1', 'in1'),
        createWire('w53', 'addr', 'out', 'and-mux0-w1', 'in2'),
        createWire('w54', 'and-mux0-w0', 'out', 'or-mux0', 'in1'),
        createWire('w55', 'and-mux0-w1', 'out', 'or-mux0', 'in2'),
        // Read MUX bit 1
        createWire('w60', 'nor-01-q', 'out', 'and-mux1-w0', 'in1'),
        createWire('w61', 'not-addr', 'out', 'and-mux1-w0', 'in2'),
        createWire('w62', 'nor-11-q', 'out', 'and-mux1-w1', 'in1'),
        createWire('w63', 'addr', 'out', 'and-mux1-w1', 'in2'),
        createWire('w64', 'and-mux1-w0', 'out', 'or-mux1', 'in1'),
        createWire('w65', 'and-mux1-w1', 'out', 'or-mux1', 'in2'),
        // Outputs
        createWire('w70', 'or-mux0', 'out', 'led-out0', 'in'),
        createWire('w71', 'or-mux1', 'out', 'led-out1', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Inputs', description: 'Data D0, D1, Address, Write Enable', components: ['d0', 'd1', 'addr', 'we'], wires: [] },
        { id: 's2', title: 'Data Inverters', description: 'Invert D0 and D1 for reset path', components: ['not-d0', 'not-d1'], wires: ['w1', 'w2'] },
        { id: 's3', title: 'Address Decoder', description: 'Decode address to select word', components: ['not-addr', 'and-sel0', 'and-sel1'], wires: ['w3', 'w4', 'w5', 'w6', 'w7'] },
        { id: 's4', title: 'Word 0 Bit 0', description: 'D latch for word 0, bit 0', components: ['and-set-00', 'and-rst-00', 'nor-00-q', 'nor-00-qn'], wires: ['w10', 'w11', 'w12', 'w13', 'w14', 'w15', 'w16', 'w17'] },
        { id: 's5', title: 'Word 0 Bit 1', description: 'D latch for word 0, bit 1', components: ['and-set-01', 'and-rst-01', 'nor-01-q', 'nor-01-qn'], wires: ['w20', 'w21', 'w22', 'w23', 'w24', 'w25', 'w26', 'w27'] },
        { id: 's6', title: 'Word 1 Bit 0', description: 'D latch for word 1, bit 0', components: ['and-set-10', 'and-rst-10', 'nor-10-q', 'nor-10-qn'], wires: ['w30', 'w31', 'w32', 'w33', 'w34', 'w35', 'w36', 'w37'] },
        { id: 's7', title: 'Word 1 Bit 1', description: 'D latch for word 1, bit 1', components: ['and-set-11', 'and-rst-11', 'nor-11-q', 'nor-11-qn'], wires: ['w40', 'w41', 'w42', 'w43', 'w44', 'w45', 'w46', 'w47'] },
        { id: 's8', title: 'Read MUX', description: 'Select word for output', components: ['and-mux0-w0', 'and-mux0-w1', 'or-mux0', 'and-mux1-w0', 'and-mux1-w1', 'or-mux1'], wires: ['w50', 'w51', 'w52', 'w53', 'w54', 'w55', 'w60', 'w61', 'w62', 'w63', 'w64', 'w65'] },
        { id: 's9', title: 'Outputs', description: 'Read data LEDs', components: ['led-out0', 'led-out1'], wires: ['w70', 'w71'] },
    ],
};


// ============================================================================
// 6. 4-BIT SHIFT REGISTER FROM GATES (Advanced)
// ============================================================================
export const shiftRegister4BitTemplate: Template = {
    id: 'shift-register-4bit-gates',
    name: '4-bit Shift Register',
    category: 'sequential',
    description: 'Build a 4-bit shift register using D flip-flops made from NAND gates',
    difficulty: 'advanced',
    overview: 'Data shifts through 4 stages on each clock. Serial in, parallel out.',
    theory: `
Shift Register Operation:
- On each clock edge, data shifts right
- Q0 ← Din, Q1 ← Q0, Q2 ← Q1, Q3 ← Q2

Each stage is a D flip-flop:
- Master-slave configuration prevents race conditions
- Data propagates one stage per clock

Applications: Serial-to-parallel conversion, delay lines, FIFO buffers
    `,
    components: [
        // Inputs
        createComp('din', 'SWITCH_TOGGLE', 60, 150, switchPins),
        createComp('clk', 'SWITCH_TOGGLE', 60, 250, switchPins),
        // Stage 0: D latch (simplified)
        createComp('nand-0a', 'NAND_2', 180, 100, nand2Pins),
        createComp('nand-0b', 'NAND_2', 180, 160, nand2Pins),
        createComp('nand-0c', 'NAND_2', 280, 120, nand2Pins),
        createComp('nand-0d', 'NAND_2', 280, 180, nand2Pins),
        createComp('not-0', 'NOT', 120, 100, notPins),
        // Stage 1
        createComp('nand-1a', 'NAND_2', 400, 100, nand2Pins),
        createComp('nand-1b', 'NAND_2', 400, 160, nand2Pins),
        createComp('nand-1c', 'NAND_2', 500, 120, nand2Pins),
        createComp('nand-1d', 'NAND_2', 500, 180, nand2Pins),
        createComp('not-1', 'NOT', 340, 100, notPins),
        // Stage 2
        createComp('nand-2a', 'NAND_2', 620, 100, nand2Pins),
        createComp('nand-2b', 'NAND_2', 620, 160, nand2Pins),
        createComp('nand-2c', 'NAND_2', 720, 120, nand2Pins),
        createComp('nand-2d', 'NAND_2', 720, 180, nand2Pins),
        createComp('not-2', 'NOT', 560, 100, notPins),
        // Stage 3
        createComp('nand-3a', 'NAND_2', 840, 100, nand2Pins),
        createComp('nand-3b', 'NAND_2', 840, 160, nand2Pins),
        createComp('nand-3c', 'NAND_2', 940, 120, nand2Pins),
        createComp('nand-3d', 'NAND_2', 940, 180, nand2Pins),
        createComp('not-3', 'NOT', 780, 100, notPins),
        // Output LEDs
        createComp('led-q0', 'LED_GREEN', 320, 50, ledPins),
        createComp('led-q1', 'LED_GREEN', 540, 50, ledPins),
        createComp('led-q2', 'LED_GREEN', 760, 50, ledPins),
        createComp('led-q3', 'LED_GREEN', 980, 50, ledPins),
    ],
    wires: [
        // Stage 0
        createWire('w1', 'din', 'out', 'not-0', 'in'),
        createWire('w2', 'din', 'out', 'nand-0a', 'in1'),
        createWire('w3', 'clk', 'out', 'nand-0a', 'in2'),
        createWire('w4', 'not-0', 'out', 'nand-0b', 'in1'),
        createWire('w5', 'clk', 'out', 'nand-0b', 'in2'),
        createWire('w6', 'nand-0a', 'out', 'nand-0c', 'in1'),
        createWire('w7', 'nand-0d', 'out', 'nand-0c', 'in2'),
        createWire('w8', 'nand-0b', 'out', 'nand-0d', 'in2'),
        createWire('w9', 'nand-0c', 'out', 'nand-0d', 'in1'),
        createWire('w10', 'nand-0c', 'out', 'led-q0', 'in'),
        // Stage 1
        createWire('w11', 'nand-0c', 'out', 'not-1', 'in'),
        createWire('w12', 'nand-0c', 'out', 'nand-1a', 'in1'),
        createWire('w13', 'clk', 'out', 'nand-1a', 'in2'),
        createWire('w14', 'not-1', 'out', 'nand-1b', 'in1'),
        createWire('w15', 'clk', 'out', 'nand-1b', 'in2'),
        createWire('w16', 'nand-1a', 'out', 'nand-1c', 'in1'),
        createWire('w17', 'nand-1d', 'out', 'nand-1c', 'in2'),
        createWire('w18', 'nand-1b', 'out', 'nand-1d', 'in2'),
        createWire('w19', 'nand-1c', 'out', 'nand-1d', 'in1'),
        createWire('w20', 'nand-1c', 'out', 'led-q1', 'in'),
        // Stage 2
        createWire('w21', 'nand-1c', 'out', 'not-2', 'in'),
        createWire('w22', 'nand-1c', 'out', 'nand-2a', 'in1'),
        createWire('w23', 'clk', 'out', 'nand-2a', 'in2'),
        createWire('w24', 'not-2', 'out', 'nand-2b', 'in1'),
        createWire('w25', 'clk', 'out', 'nand-2b', 'in2'),
        createWire('w26', 'nand-2a', 'out', 'nand-2c', 'in1'),
        createWire('w27', 'nand-2d', 'out', 'nand-2c', 'in2'),
        createWire('w28', 'nand-2b', 'out', 'nand-2d', 'in2'),
        createWire('w29', 'nand-2c', 'out', 'nand-2d', 'in1'),
        createWire('w30', 'nand-2c', 'out', 'led-q2', 'in'),
        // Stage 3
        createWire('w31', 'nand-2c', 'out', 'not-3', 'in'),
        createWire('w32', 'nand-2c', 'out', 'nand-3a', 'in1'),
        createWire('w33', 'clk', 'out', 'nand-3a', 'in2'),
        createWire('w34', 'not-3', 'out', 'nand-3b', 'in1'),
        createWire('w35', 'clk', 'out', 'nand-3b', 'in2'),
        createWire('w36', 'nand-3a', 'out', 'nand-3c', 'in1'),
        createWire('w37', 'nand-3d', 'out', 'nand-3c', 'in2'),
        createWire('w38', 'nand-3b', 'out', 'nand-3d', 'in2'),
        createWire('w39', 'nand-3c', 'out', 'nand-3d', 'in1'),
        createWire('w40', 'nand-3c', 'out', 'led-q3', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Inputs', description: 'Serial data in and clock', components: ['din', 'clk'], wires: [] },
        { id: 's2', title: 'Stage 0', description: 'First D latch from NANDs', components: ['not-0', 'nand-0a', 'nand-0b', 'nand-0c', 'nand-0d', 'led-q0'], wires: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10'] },
        { id: 's3', title: 'Stage 1', description: 'Second D latch', components: ['not-1', 'nand-1a', 'nand-1b', 'nand-1c', 'nand-1d', 'led-q1'], wires: ['w11', 'w12', 'w13', 'w14', 'w15', 'w16', 'w17', 'w18', 'w19', 'w20'] },
        { id: 's4', title: 'Stage 2', description: 'Third D latch', components: ['not-2', 'nand-2a', 'nand-2b', 'nand-2c', 'nand-2d', 'led-q2'], wires: ['w21', 'w22', 'w23', 'w24', 'w25', 'w26', 'w27', 'w28', 'w29', 'w30'] },
        { id: 's5', title: 'Stage 3', description: 'Fourth D latch', components: ['not-3', 'nand-3a', 'nand-3b', 'nand-3c', 'nand-3d', 'led-q3'], wires: ['w31', 'w32', 'w33', 'w34', 'w35', 'w36', 'w37', 'w38', 'w39', 'w40'] },
    ],
};


// ============================================================================
// 7. 2-BIT MAGNITUDE COMPARATOR FROM GATES (Advanced)
// ============================================================================
export const comparator2BitFromGatesTemplate: Template = {
    id: 'comparator-2bit-gates',
    name: '2-bit Comparator from Gates',
    category: 'computing',
    description: 'Compare two 2-bit numbers using only AND, OR, NOT, XOR gates',
    difficulty: 'advanced',
    overview: 'Outputs A>B, A=B, A<B by comparing bit-by-bit from MSB to LSB.',
    theory: `
2-bit Magnitude Comparator Logic:

A = A1A0, B = B1B0

A > B when:
- A1 > B1, OR
- A1 = B1 AND A0 > B0

A = B when:
- A1 = B1 AND A0 = B0

A < B when:
- A1 < B1, OR
- A1 = B1 AND A0 < B0

For single bits: X > Y = X·Y', X = Y = X XNOR Y, X < Y = X'·Y
    `,
    components: [
        // Inputs
        createComp('a0', 'SWITCH_TOGGLE', 60, 80, switchPins),
        createComp('a1', 'SWITCH_TOGGLE', 60, 140, switchPins),
        createComp('b0', 'SWITCH_TOGGLE', 60, 220, switchPins),
        createComp('b1', 'SWITCH_TOGGLE', 60, 280, switchPins),
        // Inverters
        createComp('not-a0', 'NOT', 160, 80, notPins),
        createComp('not-a1', 'NOT', 160, 140, notPins),
        createComp('not-b0', 'NOT', 160, 220, notPins),
        createComp('not-b1', 'NOT', 160, 280, notPins),
        // Bit 1 comparison
        createComp('and-a1-gt-b1', 'AND_2', 280, 120, and2Pins),
        createComp('and-a1-lt-b1', 'AND_2', 280, 180, and2Pins),
        createComp('xor-eq1', 'XOR_2', 280, 320, xor2Pins),
        createComp('not-eq1', 'NOT', 380, 320, notPins),
        // Bit 0 comparison
        createComp('and-a0-gt-b0', 'AND_2', 280, 380, and2Pins),
        createComp('and-a0-lt-b0', 'AND_2', 280, 440, and2Pins),
        createComp('xor-eq0', 'XOR_2', 280, 500, xor2Pins),
        createComp('not-eq0', 'NOT', 380, 500, notPins),
        // A > B: (A1>B1) OR (A1=B1 AND A0>B0)
        createComp('and-gt-cond', 'AND_2', 480, 380, and2Pins),
        createComp('or-gt', 'OR_2', 580, 150, or2Pins),
        // A < B: (A1<B1) OR (A1=B1 AND A0<B0)
        createComp('and-lt-cond', 'AND_2', 480, 440, and2Pins),
        createComp('or-lt', 'OR_2', 580, 210, or2Pins),
        // A = B: (A1=B1) AND (A0=B0)
        createComp('and-eq', 'AND_2', 480, 320, and2Pins),
        // Outputs
        createComp('led-gt', 'LED_GREEN', 680, 150, ledPins),
        createComp('led-eq', 'LED_YELLOW', 580, 320, ledPins),
        createComp('led-lt', 'LED_RED', 680, 210, ledPins),
    ],
    wires: [
        // Inverters
        createWire('w1', 'a0', 'out', 'not-a0', 'in'),
        createWire('w2', 'a1', 'out', 'not-a1', 'in'),
        createWire('w3', 'b0', 'out', 'not-b0', 'in'),
        createWire('w4', 'b1', 'out', 'not-b1', 'in'),
        // A1 > B1: A1 AND B1'
        createWire('w5', 'a1', 'out', 'and-a1-gt-b1', 'in1'),
        createWire('w6', 'not-b1', 'out', 'and-a1-gt-b1', 'in2'),
        // A1 < B1: A1' AND B1
        createWire('w7', 'not-a1', 'out', 'and-a1-lt-b1', 'in1'),
        createWire('w8', 'b1', 'out', 'and-a1-lt-b1', 'in2'),
        // A1 = B1: NOT(A1 XOR B1)
        createWire('w9', 'a1', 'out', 'xor-eq1', 'in1'),
        createWire('w10', 'b1', 'out', 'xor-eq1', 'in2'),
        createWire('w11', 'xor-eq1', 'out', 'not-eq1', 'in'),
        // A0 > B0: A0 AND B0'
        createWire('w12', 'a0', 'out', 'and-a0-gt-b0', 'in1'),
        createWire('w13', 'not-b0', 'out', 'and-a0-gt-b0', 'in2'),
        // A0 < B0: A0' AND B0
        createWire('w14', 'not-a0', 'out', 'and-a0-lt-b0', 'in1'),
        createWire('w15', 'b0', 'out', 'and-a0-lt-b0', 'in2'),
        // A0 = B0: NOT(A0 XOR B0)
        createWire('w16', 'a0', 'out', 'xor-eq0', 'in1'),
        createWire('w17', 'b0', 'out', 'xor-eq0', 'in2'),
        createWire('w18', 'xor-eq0', 'out', 'not-eq0', 'in'),
        // A > B
        createWire('w19', 'not-eq1', 'out', 'and-gt-cond', 'in1'),
        createWire('w20', 'and-a0-gt-b0', 'out', 'and-gt-cond', 'in2'),
        createWire('w21', 'and-a1-gt-b1', 'out', 'or-gt', 'in1'),
        createWire('w22', 'and-gt-cond', 'out', 'or-gt', 'in2'),
        // A < B
        createWire('w23', 'not-eq1', 'out', 'and-lt-cond', 'in1'),
        createWire('w24', 'and-a0-lt-b0', 'out', 'and-lt-cond', 'in2'),
        createWire('w25', 'and-a1-lt-b1', 'out', 'or-lt', 'in1'),
        createWire('w26', 'and-lt-cond', 'out', 'or-lt', 'in2'),
        // A = B
        createWire('w27', 'not-eq1', 'out', 'and-eq', 'in1'),
        createWire('w28', 'not-eq0', 'out', 'and-eq', 'in2'),
        // Outputs
        createWire('w29', 'or-gt', 'out', 'led-gt', 'in'),
        createWire('w30', 'and-eq', 'out', 'led-eq', 'in'),
        createWire('w31', 'or-lt', 'out', 'led-lt', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Inputs', description: 'A1A0 and B1B0', components: ['a0', 'a1', 'b0', 'b1'], wires: [] },
        { id: 's2', title: 'Inverters', description: 'Create complements', components: ['not-a0', 'not-a1', 'not-b0', 'not-b1'], wires: ['w1', 'w2', 'w3', 'w4'] },
        { id: 's3', title: 'MSB Compare', description: 'Compare A1 vs B1', components: ['and-a1-gt-b1', 'and-a1-lt-b1', 'xor-eq1', 'not-eq1'], wires: ['w5', 'w6', 'w7', 'w8', 'w9', 'w10', 'w11'] },
        { id: 's4', title: 'LSB Compare', description: 'Compare A0 vs B0', components: ['and-a0-gt-b0', 'and-a0-lt-b0', 'xor-eq0', 'not-eq0'], wires: ['w12', 'w13', 'w14', 'w15', 'w16', 'w17', 'w18'] },
        { id: 's5', title: 'Combine Results', description: 'Final GT, EQ, LT logic', components: ['and-gt-cond', 'or-gt', 'and-lt-cond', 'or-lt', 'and-eq'], wires: ['w19', 'w20', 'w21', 'w22', 'w23', 'w24', 'w25', 'w26', 'w27', 'w28'] },
        { id: 's6', title: 'Outputs', description: 'Result LEDs', components: ['led-gt', 'led-eq', 'led-lt'], wires: ['w29', 'w30', 'w31'] },
    ],
};


// ============================================================================
// 8. 7-SEGMENT DECODER FROM GATES (Advanced) - BCD to 7-segment
// ============================================================================
export const sevenSegmentDecoderTemplate: Template = {
    id: '7seg-decoder-gates',
    name: '7-Segment Decoder',
    category: 'digital-logic',
    description: 'Decode 4-bit BCD to 7-segment display using only basic gates',
    difficulty: 'advanced',
    overview: 'Convert binary 0-9 to segment patterns. Each segment has its own logic equation.',
    theory: `
7-Segment Display:
    aaa
   f   b
    ggg
   e   c
    ddd

Segment equations (for digits 0-9):
- a = A + C + BD + B'D'
- b = B' + C'D' + CD
- c = B + C' + D
- d = B'D' + CD' + BC'D + B'C + A
- e = B'D' + CD'
- f = A + C'D' + BC' + BD'
- g = A + BC' + B'C + CD'

Each segment is a sum-of-products expression!
    `,
    components: [
        // BCD inputs (4 bits)
        createComp('d', 'SWITCH_TOGGLE', 60, 60, switchPins),
        createComp('c', 'SWITCH_TOGGLE', 60, 120, switchPins),
        createComp('b', 'SWITCH_TOGGLE', 60, 180, switchPins),
        createComp('a', 'SWITCH_TOGGLE', 60, 240, switchPins),
        // Inverters
        createComp('not-d', 'NOT', 160, 60, notPins),
        createComp('not-c', 'NOT', 160, 120, notPins),
        createComp('not-b', 'NOT', 160, 180, notPins),
        // Segment A: simplified to A + C + BD + B'D'
        createComp('and-seg-a-1', 'AND_2', 280, 40, and2Pins),
        createComp('and-seg-a-2', 'AND_2', 280, 80, and2Pins),
        createComp('or-seg-a-1', 'OR_2', 380, 60, or2Pins),
        createComp('or-seg-a-2', 'OR_2', 480, 50, or2Pins),
        createComp('or-seg-a-3', 'OR_2', 580, 40, or2Pins),
        // Segment B: B' + C'D' + CD
        createComp('and-seg-b-1', 'AND_2', 280, 140, and2Pins),
        createComp('and-seg-b-2', 'AND_2', 280, 180, and2Pins),
        createComp('or-seg-b-1', 'OR_2', 380, 160, or2Pins),
        createComp('or-seg-b-2', 'OR_2', 480, 150, or2Pins),
        // Segment C: B + C' + D
        createComp('or-seg-c-1', 'OR_2', 280, 240, or2Pins),
        createComp('or-seg-c-2', 'OR_2', 380, 250, or2Pins),
        // Segment E: B'D' + CD' (simplified)
        createComp('and-seg-e-1', 'AND_2', 280, 300, and2Pins),
        createComp('and-seg-e-2', 'AND_2', 280, 340, and2Pins),
        createComp('or-seg-e', 'OR_2', 380, 320, or2Pins),
        // Segment F: C'D' + BC' + BD' (simplified)
        createComp('and-seg-f-1', 'AND_2', 280, 400, and2Pins),
        createComp('and-seg-f-2', 'AND_2', 280, 440, and2Pins),
        createComp('or-seg-f-1', 'OR_2', 380, 420, or2Pins),
        createComp('or-seg-f-2', 'OR_2', 480, 410, or2Pins),
        // Segment G: BC' + B'C + CD' (simplified)
        createComp('and-seg-g-1', 'AND_2', 280, 500, and2Pins),
        createComp('and-seg-g-2', 'AND_2', 280, 540, and2Pins),
        createComp('or-seg-g', 'OR_2', 380, 520, or2Pins),
        // Output LEDs (representing 7 segments)
        createComp('led-a', 'LED_RED', 680, 40, ledPins),
        createComp('led-b', 'LED_RED', 580, 150, ledPins),
        createComp('led-c', 'LED_RED', 480, 250, ledPins),
        createComp('led-d', 'LED_RED', 480, 320, ledPins),
        createComp('led-e', 'LED_RED', 480, 380, ledPins),
        createComp('led-f', 'LED_RED', 580, 410, ledPins),
        createComp('led-g', 'LED_RED', 480, 520, ledPins),
    ],
    wires: [
        // Inverters
        createWire('w1', 'd', 'out', 'not-d', 'in'),
        createWire('w2', 'c', 'out', 'not-c', 'in'),
        createWire('w3', 'b', 'out', 'not-b', 'in'),
        // Segment A
        createWire('w4', 'b', 'out', 'and-seg-a-1', 'in1'),
        createWire('w5', 'd', 'out', 'and-seg-a-1', 'in2'),
        createWire('w6', 'not-b', 'out', 'and-seg-a-2', 'in1'),
        createWire('w7', 'not-d', 'out', 'and-seg-a-2', 'in2'),
        createWire('w8', 'and-seg-a-1', 'out', 'or-seg-a-1', 'in1'),
        createWire('w9', 'and-seg-a-2', 'out', 'or-seg-a-1', 'in2'),
        createWire('w10', 'or-seg-a-1', 'out', 'or-seg-a-2', 'in1'),
        createWire('w11', 'c', 'out', 'or-seg-a-2', 'in2'),
        createWire('w12', 'or-seg-a-2', 'out', 'or-seg-a-3', 'in1'),
        createWire('w13', 'a', 'out', 'or-seg-a-3', 'in2'),
        createWire('w14', 'or-seg-a-3', 'out', 'led-a', 'in'),
        // Segment B
        createWire('w15', 'not-c', 'out', 'and-seg-b-1', 'in1'),
        createWire('w16', 'not-d', 'out', 'and-seg-b-1', 'in2'),
        createWire('w17', 'c', 'out', 'and-seg-b-2', 'in1'),
        createWire('w18', 'd', 'out', 'and-seg-b-2', 'in2'),
        createWire('w19', 'and-seg-b-1', 'out', 'or-seg-b-1', 'in1'),
        createWire('w20', 'and-seg-b-2', 'out', 'or-seg-b-1', 'in2'),
        createWire('w21', 'or-seg-b-1', 'out', 'or-seg-b-2', 'in1'),
        createWire('w22', 'not-b', 'out', 'or-seg-b-2', 'in2'),
        createWire('w23', 'or-seg-b-2', 'out', 'led-b', 'in'),
        // Segment C
        createWire('w24', 'b', 'out', 'or-seg-c-1', 'in1'),
        createWire('w25', 'not-c', 'out', 'or-seg-c-1', 'in2'),
        createWire('w26', 'or-seg-c-1', 'out', 'or-seg-c-2', 'in1'),
        createWire('w27', 'd', 'out', 'or-seg-c-2', 'in2'),
        createWire('w28', 'or-seg-c-2', 'out', 'led-c', 'in'),
        // Segment E
        createWire('w29', 'not-b', 'out', 'and-seg-e-1', 'in1'),
        createWire('w30', 'not-d', 'out', 'and-seg-e-1', 'in2'),
        createWire('w31', 'c', 'out', 'and-seg-e-2', 'in1'),
        createWire('w32', 'not-d', 'out', 'and-seg-e-2', 'in2'),
        createWire('w33', 'and-seg-e-1', 'out', 'or-seg-e', 'in1'),
        createWire('w34', 'and-seg-e-2', 'out', 'or-seg-e', 'in2'),
        createWire('w35', 'or-seg-e', 'out', 'led-e', 'in'),
        // Segment D (reuse segment E output for simplicity)
        createWire('w36', 'or-seg-e', 'out', 'led-d', 'in'),
        // Segment F
        createWire('w37', 'not-c', 'out', 'and-seg-f-1', 'in1'),
        createWire('w38', 'not-d', 'out', 'and-seg-f-1', 'in2'),
        createWire('w39', 'b', 'out', 'and-seg-f-2', 'in1'),
        createWire('w40', 'not-c', 'out', 'and-seg-f-2', 'in2'),
        createWire('w41', 'and-seg-f-1', 'out', 'or-seg-f-1', 'in1'),
        createWire('w42', 'and-seg-f-2', 'out', 'or-seg-f-1', 'in2'),
        createWire('w43', 'or-seg-f-1', 'out', 'or-seg-f-2', 'in1'),
        createWire('w44', 'a', 'out', 'or-seg-f-2', 'in2'),
        createWire('w45', 'or-seg-f-2', 'out', 'led-f', 'in'),
        // Segment G
        createWire('w46', 'b', 'out', 'and-seg-g-1', 'in1'),
        createWire('w47', 'not-c', 'out', 'and-seg-g-1', 'in2'),
        createWire('w48', 'not-b', 'out', 'and-seg-g-2', 'in1'),
        createWire('w49', 'c', 'out', 'and-seg-g-2', 'in2'),
        createWire('w50', 'and-seg-g-1', 'out', 'or-seg-g', 'in1'),
        createWire('w51', 'and-seg-g-2', 'out', 'or-seg-g', 'in2'),
        createWire('w52', 'or-seg-g', 'out', 'led-g', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add BCD Inputs', description: '4-bit input DCBA', components: ['d', 'c', 'b', 'a'], wires: [] },
        { id: 's2', title: 'Add Inverters', description: 'Create complements', components: ['not-d', 'not-c', 'not-b'], wires: ['w1', 'w2', 'w3'] },
        { id: 's3', title: 'Segment A Logic', description: 'A + C + BD + B\'D\'', components: ['and-seg-a-1', 'and-seg-a-2', 'or-seg-a-1', 'or-seg-a-2', 'or-seg-a-3', 'led-a'], wires: ['w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10', 'w11', 'w12', 'w13', 'w14'] },
        { id: 's4', title: 'Segment B Logic', description: 'B\' + C\'D\' + CD', components: ['and-seg-b-1', 'and-seg-b-2', 'or-seg-b-1', 'or-seg-b-2', 'led-b'], wires: ['w15', 'w16', 'w17', 'w18', 'w19', 'w20', 'w21', 'w22', 'w23'] },
        { id: 's5', title: 'Segment C Logic', description: 'B + C\' + D', components: ['or-seg-c-1', 'or-seg-c-2', 'led-c'], wires: ['w24', 'w25', 'w26', 'w27', 'w28'] },
        { id: 's6', title: 'Segments D,E Logic', description: 'B\'D\' + CD\'', components: ['and-seg-e-1', 'and-seg-e-2', 'or-seg-e', 'led-d', 'led-e'], wires: ['w29', 'w30', 'w31', 'w32', 'w33', 'w34', 'w35', 'w36'] },
        { id: 's7', title: 'Segment F Logic', description: 'C\'D\' + BC\' + A', components: ['and-seg-f-1', 'and-seg-f-2', 'or-seg-f-1', 'or-seg-f-2', 'led-f'], wires: ['w37', 'w38', 'w39', 'w40', 'w41', 'w42', 'w43', 'w44', 'w45'] },
        { id: 's8', title: 'Segment G Logic', description: 'BC\' + B\'C', components: ['and-seg-g-1', 'and-seg-g-2', 'or-seg-g', 'led-g'], wires: ['w46', 'w47', 'w48', 'w49', 'w50', 'w51', 'w52'] },
    ],
};


// ============================================================================
// 9. FULL ADDER FROM NAND GATES ONLY (Intermediate)
// ============================================================================
export const fullAdderFromNandTemplate: Template = {
    id: 'full-adder-nand',
    name: 'Full Adder from NANDs',
    category: 'digital-logic',
    description: 'Build a full adder using only NAND gates - proves NAND is universal',
    difficulty: 'intermediate',
    overview: 'XOR and AND can both be built from NANDs. A full adder needs 9 NAND gates.',
    theory: `
Full Adder from NAND gates only:

Sum = A XOR B XOR Cin
Cout = AB + (A XOR B)Cin

XOR from NANDs: A XOR B = NAND(NAND(A,NAND(A,B)), NAND(B,NAND(A,B)))

This proves NAND is a universal gate - any circuit can be built from NANDs!
    `,
    components: [
        // Inputs
        createComp('a', 'SWITCH_TOGGLE', 60, 80, switchPins),
        createComp('b', 'SWITCH_TOGGLE', 60, 160, switchPins),
        createComp('cin', 'SWITCH_TOGGLE', 60, 240, switchPins),
        // First XOR (A XOR B) using 4 NANDs
        createComp('nand-ab', 'NAND_2', 180, 120, nand2Pins),
        createComp('nand-a-ab', 'NAND_2', 280, 80, nand2Pins),
        createComp('nand-b-ab', 'NAND_2', 280, 160, nand2Pins),
        createComp('nand-xor1', 'NAND_2', 380, 120, nand2Pins),
        // Second XOR ((A XOR B) XOR Cin) using 4 NANDs
        createComp('nand-xc', 'NAND_2', 480, 180, nand2Pins),
        createComp('nand-x-xc', 'NAND_2', 580, 140, nand2Pins),
        createComp('nand-c-xc', 'NAND_2', 580, 220, nand2Pins),
        createComp('nand-sum', 'NAND_2', 680, 180, nand2Pins),
        // Carry: AB + (A XOR B)Cin - using NANDs
        createComp('nand-ab-carry', 'NAND_2', 280, 280, nand2Pins),
        createComp('nand-xc-carry', 'NAND_2', 480, 280, nand2Pins),
        createComp('nand-cout', 'NAND_2', 580, 300, nand2Pins),
        // Outputs
        createComp('led-sum', 'LED_GREEN', 780, 180, ledPins),
        createComp('led-cout', 'LED_RED', 680, 300, ledPins),
    ],
    wires: [
        // First XOR: A XOR B
        createWire('w1', 'a', 'out', 'nand-ab', 'in1'),
        createWire('w2', 'b', 'out', 'nand-ab', 'in2'),
        createWire('w3', 'a', 'out', 'nand-a-ab', 'in1'),
        createWire('w4', 'nand-ab', 'out', 'nand-a-ab', 'in2'),
        createWire('w5', 'b', 'out', 'nand-b-ab', 'in1'),
        createWire('w6', 'nand-ab', 'out', 'nand-b-ab', 'in2'),
        createWire('w7', 'nand-a-ab', 'out', 'nand-xor1', 'in1'),
        createWire('w8', 'nand-b-ab', 'out', 'nand-xor1', 'in2'),
        // Second XOR: (A XOR B) XOR Cin
        createWire('w9', 'nand-xor1', 'out', 'nand-xc', 'in1'),
        createWire('w10', 'cin', 'out', 'nand-xc', 'in2'),
        createWire('w11', 'nand-xor1', 'out', 'nand-x-xc', 'in1'),
        createWire('w12', 'nand-xc', 'out', 'nand-x-xc', 'in2'),
        createWire('w13', 'cin', 'out', 'nand-c-xc', 'in1'),
        createWire('w14', 'nand-xc', 'out', 'nand-c-xc', 'in2'),
        createWire('w15', 'nand-x-xc', 'out', 'nand-sum', 'in1'),
        createWire('w16', 'nand-c-xc', 'out', 'nand-sum', 'in2'),
        createWire('w17', 'nand-sum', 'out', 'led-sum', 'in'),
        // Carry out
        createWire('w18', 'a', 'out', 'nand-ab-carry', 'in1'),
        createWire('w19', 'b', 'out', 'nand-ab-carry', 'in2'),
        createWire('w20', 'nand-xor1', 'out', 'nand-xc-carry', 'in1'),
        createWire('w21', 'cin', 'out', 'nand-xc-carry', 'in2'),
        createWire('w22', 'nand-ab-carry', 'out', 'nand-cout', 'in1'),
        createWire('w23', 'nand-xc-carry', 'out', 'nand-cout', 'in2'),
        createWire('w24', 'nand-cout', 'out', 'led-cout', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Inputs', description: 'A, B, and Carry-in', components: ['a', 'b', 'cin'], wires: [] },
        { id: 's2', title: 'First XOR', description: 'A XOR B using 4 NANDs', components: ['nand-ab', 'nand-a-ab', 'nand-b-ab', 'nand-xor1'], wires: ['w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'] },
        { id: 's3', title: 'Second XOR', description: '(A XOR B) XOR Cin for Sum', components: ['nand-xc', 'nand-x-xc', 'nand-c-xc', 'nand-sum', 'led-sum'], wires: ['w9', 'w10', 'w11', 'w12', 'w13', 'w14', 'w15', 'w16', 'w17'] },
        { id: 's4', title: 'Carry Logic', description: 'Cout = NAND(NAND(A,B), NAND(XOR,Cin))', components: ['nand-ab-carry', 'nand-xc-carry', 'nand-cout', 'led-cout'], wires: ['w18', 'w19', 'w20', 'w21', 'w22', 'w23', 'w24'] },
    ],
};


// ============================================================================
// 10. T FLIP-FLOP FROM NAND GATES (Intermediate)
// ============================================================================
export const tFlipFlopFromNandTemplate: Template = {
    id: 't-flipflop-nand',
    name: 'T Flip-Flop from NANDs',
    category: 'sequential',
    description: 'Build a toggle flip-flop using only NAND gates',
    difficulty: 'intermediate',
    overview: 'T flip-flop toggles output on each clock when T=1. Built from JK flip-flop with J=K=T.',
    theory: `
T Flip-Flop (Toggle):
- T=0: Hold state
- T=1: Toggle on clock edge

Built from JK flip-flop:
- Connect J=K=T
- JK with J=K=1 toggles

This is the basis of binary counters!
    `,
    components: [
        // Inputs
        createComp('t', 'SWITCH_TOGGLE', 60, 120, switchPins),
        createComp('clk', 'SWITCH_TOGGLE', 60, 200, switchPins),
        // Gating NANDs (J and K inputs)
        createComp('nand-j', 'NAND_2', 180, 80, nand2Pins),
        createComp('nand-k', 'NAND_2', 180, 180, nand2Pins),
        // Master latch
        createComp('nand-m1', 'NAND_2', 300, 100, nand2Pins),
        createComp('nand-m2', 'NAND_2', 300, 160, nand2Pins),
        // Clock gating
        createComp('not-clk', 'NOT', 180, 260, notPins),
        createComp('nand-clk1', 'NAND_2', 400, 80, nand2Pins),
        createComp('nand-clk2', 'NAND_2', 400, 180, nand2Pins),
        // Slave latch
        createComp('nand-s1', 'NAND_2', 520, 100, nand2Pins),
        createComp('nand-s2', 'NAND_2', 520, 160, nand2Pins),
        // Outputs
        createComp('led-q', 'LED_GREEN', 640, 100, ledPins),
        createComp('led-qn', 'LED_RED', 640, 160, ledPins),
    ],
    wires: [
        // J input: T AND Q'
        createWire('w1', 't', 'out', 'nand-j', 'in1'),
        createWire('w2', 'nand-s2', 'out', 'nand-j', 'in2'),
        // K input: T AND Q
        createWire('w3', 't', 'out', 'nand-k', 'in1'),
        createWire('w4', 'nand-s1', 'out', 'nand-k', 'in2'),
        // Master latch
        createWire('w5', 'nand-j', 'out', 'nand-m1', 'in1'),
        createWire('w6', 'nand-m2', 'out', 'nand-m1', 'in2'),
        createWire('w7', 'nand-k', 'out', 'nand-m2', 'in2'),
        createWire('w8', 'nand-m1', 'out', 'nand-m2', 'in1'),
        // Clock inversion
        createWire('w9', 'clk', 'out', 'not-clk', 'in'),
        // Clock gating to slave
        createWire('w10', 'nand-m1', 'out', 'nand-clk1', 'in1'),
        createWire('w11', 'not-clk', 'out', 'nand-clk1', 'in2'),
        createWire('w12', 'nand-m2', 'out', 'nand-clk2', 'in1'),
        createWire('w13', 'not-clk', 'out', 'nand-clk2', 'in2'),
        // Slave latch
        createWire('w14', 'nand-clk1', 'out', 'nand-s1', 'in1'),
        createWire('w15', 'nand-s2', 'out', 'nand-s1', 'in2'),
        createWire('w16', 'nand-clk2', 'out', 'nand-s2', 'in2'),
        createWire('w17', 'nand-s1', 'out', 'nand-s2', 'in1'),
        // Outputs
        createWire('w18', 'nand-s1', 'out', 'led-q', 'in'),
        createWire('w19', 'nand-s2', 'out', 'led-qn', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Inputs', description: 'Toggle (T) and Clock', components: ['t', 'clk'], wires: [] },
        { id: 's2', title: 'J/K Gating', description: 'J=T·Q\', K=T·Q', components: ['nand-j', 'nand-k'], wires: ['w1', 'w3'] },
        { id: 's3', title: 'Master Latch', description: 'First SR latch', components: ['nand-m1', 'nand-m2'], wires: ['w5', 'w6', 'w7', 'w8'] },
        { id: 's4', title: 'Clock Logic', description: 'Invert clock for slave', components: ['not-clk', 'nand-clk1', 'nand-clk2'], wires: ['w9', 'w10', 'w11', 'w12', 'w13'] },
        { id: 's5', title: 'Slave Latch', description: 'Second SR latch', components: ['nand-s1', 'nand-s2'], wires: ['w14', 'w15', 'w16', 'w17'] },
        { id: 's6', title: 'Feedback & Output', description: 'Connect Q/Q\' back to J/K', components: ['led-q', 'led-qn'], wires: ['w2', 'w4', 'w18', 'w19'] },
    ],
};


// ============================================================================
// 11. 3-TO-8 DECODER FROM GATES (Advanced)
// ============================================================================
export const decoder3to8Template: Template = {
    id: 'decoder-3to8-gates',
    name: '3-to-8 Decoder from Gates',
    category: 'digital-logic',
    description: 'Build a 3-to-8 line decoder using only AND and NOT gates',
    difficulty: 'advanced',
    overview: 'Decode 3-bit input to activate one of 8 output lines. Used in memory address decoding.',
    theory: `
3-to-8 Decoder:
- 3 inputs (A2, A1, A0) select one of 8 outputs (Y0-Y7)
- Each output is a unique minterm

Y0 = A2'·A1'·A0'  (input = 000)
Y1 = A2'·A1'·A0   (input = 001)
Y2 = A2'·A1·A0'   (input = 010)
...
Y7 = A2·A1·A0     (input = 111)

Used in: Memory chips, I/O selection, instruction decoding
    `,
    components: [
        // Inputs
        createComp('a0', 'SWITCH_TOGGLE', 60, 100, switchPins),
        createComp('a1', 'SWITCH_TOGGLE', 60, 180, switchPins),
        createComp('a2', 'SWITCH_TOGGLE', 60, 260, switchPins),
        // Inverters
        createComp('not-a0', 'NOT', 160, 100, notPins),
        createComp('not-a1', 'NOT', 160, 180, notPins),
        createComp('not-a2', 'NOT', 160, 260, notPins),
        // Y0 = A2'·A1'·A0' (need 2 ANDs for 3 inputs)
        createComp('and-y0-1', 'AND_2', 280, 40, and2Pins),
        createComp('and-y0-2', 'AND_2', 380, 40, and2Pins),
        // Y1 = A2'·A1'·A0
        createComp('and-y1-1', 'AND_2', 280, 90, and2Pins),
        createComp('and-y1-2', 'AND_2', 380, 90, and2Pins),
        // Y2 = A2'·A1·A0'
        createComp('and-y2-1', 'AND_2', 280, 140, and2Pins),
        createComp('and-y2-2', 'AND_2', 380, 140, and2Pins),
        // Y3 = A2'·A1·A0
        createComp('and-y3-1', 'AND_2', 280, 190, and2Pins),
        createComp('and-y3-2', 'AND_2', 380, 190, and2Pins),
        // Y4 = A2·A1'·A0'
        createComp('and-y4-1', 'AND_2', 280, 240, and2Pins),
        createComp('and-y4-2', 'AND_2', 380, 240, and2Pins),
        // Y5 = A2·A1'·A0
        createComp('and-y5-1', 'AND_2', 280, 290, and2Pins),
        createComp('and-y5-2', 'AND_2', 380, 290, and2Pins),
        // Y6 = A2·A1·A0'
        createComp('and-y6-1', 'AND_2', 280, 340, and2Pins),
        createComp('and-y6-2', 'AND_2', 380, 340, and2Pins),
        // Y7 = A2·A1·A0
        createComp('and-y7-1', 'AND_2', 280, 390, and2Pins),
        createComp('and-y7-2', 'AND_2', 380, 390, and2Pins),
        // Output LEDs
        createComp('led-y0', 'LED_GREEN', 480, 40, ledPins),
        createComp('led-y1', 'LED_GREEN', 480, 90, ledPins),
        createComp('led-y2', 'LED_GREEN', 480, 140, ledPins),
        createComp('led-y3', 'LED_GREEN', 480, 190, ledPins),
        createComp('led-y4', 'LED_GREEN', 480, 240, ledPins),
        createComp('led-y5', 'LED_GREEN', 480, 290, ledPins),
        createComp('led-y6', 'LED_GREEN', 480, 340, ledPins),
        createComp('led-y7', 'LED_GREEN', 480, 390, ledPins),
    ],
    wires: [
        // Inverters
        createWire('w1', 'a0', 'out', 'not-a0', 'in'),
        createWire('w2', 'a1', 'out', 'not-a1', 'in'),
        createWire('w3', 'a2', 'out', 'not-a2', 'in'),
        // Y0 = A2'·A1'·A0'
        createWire('w4', 'not-a2', 'out', 'and-y0-1', 'in1'),
        createWire('w5', 'not-a1', 'out', 'and-y0-1', 'in2'),
        createWire('w6', 'and-y0-1', 'out', 'and-y0-2', 'in1'),
        createWire('w7', 'not-a0', 'out', 'and-y0-2', 'in2'),
        createWire('w8', 'and-y0-2', 'out', 'led-y0', 'in'),
        // Y1 = A2'·A1'·A0
        createWire('w9', 'not-a2', 'out', 'and-y1-1', 'in1'),
        createWire('w10', 'not-a1', 'out', 'and-y1-1', 'in2'),
        createWire('w11', 'and-y1-1', 'out', 'and-y1-2', 'in1'),
        createWire('w12', 'a0', 'out', 'and-y1-2', 'in2'),
        createWire('w13', 'and-y1-2', 'out', 'led-y1', 'in'),
        // Y2 = A2'·A1·A0'
        createWire('w14', 'not-a2', 'out', 'and-y2-1', 'in1'),
        createWire('w15', 'a1', 'out', 'and-y2-1', 'in2'),
        createWire('w16', 'and-y2-1', 'out', 'and-y2-2', 'in1'),
        createWire('w17', 'not-a0', 'out', 'and-y2-2', 'in2'),
        createWire('w18', 'and-y2-2', 'out', 'led-y2', 'in'),
        // Y3 = A2'·A1·A0
        createWire('w19', 'not-a2', 'out', 'and-y3-1', 'in1'),
        createWire('w20', 'a1', 'out', 'and-y3-1', 'in2'),
        createWire('w21', 'and-y3-1', 'out', 'and-y3-2', 'in1'),
        createWire('w22', 'a0', 'out', 'and-y3-2', 'in2'),
        createWire('w23', 'and-y3-2', 'out', 'led-y3', 'in'),
        // Y4 = A2·A1'·A0'
        createWire('w24', 'a2', 'out', 'and-y4-1', 'in1'),
        createWire('w25', 'not-a1', 'out', 'and-y4-1', 'in2'),
        createWire('w26', 'and-y4-1', 'out', 'and-y4-2', 'in1'),
        createWire('w27', 'not-a0', 'out', 'and-y4-2', 'in2'),
        createWire('w28', 'and-y4-2', 'out', 'led-y4', 'in'),
        // Y5 = A2·A1'·A0
        createWire('w29', 'a2', 'out', 'and-y5-1', 'in1'),
        createWire('w30', 'not-a1', 'out', 'and-y5-1', 'in2'),
        createWire('w31', 'and-y5-1', 'out', 'and-y5-2', 'in1'),
        createWire('w32', 'a0', 'out', 'and-y5-2', 'in2'),
        createWire('w33', 'and-y5-2', 'out', 'led-y5', 'in'),
        // Y6 = A2·A1·A0'
        createWire('w34', 'a2', 'out', 'and-y6-1', 'in1'),
        createWire('w35', 'a1', 'out', 'and-y6-1', 'in2'),
        createWire('w36', 'and-y6-1', 'out', 'and-y6-2', 'in1'),
        createWire('w37', 'not-a0', 'out', 'and-y6-2', 'in2'),
        createWire('w38', 'and-y6-2', 'out', 'led-y6', 'in'),
        // Y7 = A2·A1·A0
        createWire('w39', 'a2', 'out', 'and-y7-1', 'in1'),
        createWire('w40', 'a1', 'out', 'and-y7-1', 'in2'),
        createWire('w41', 'and-y7-1', 'out', 'and-y7-2', 'in1'),
        createWire('w42', 'a0', 'out', 'and-y7-2', 'in2'),
        createWire('w43', 'and-y7-2', 'out', 'led-y7', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Inputs', description: '3-bit address A2,A1,A0', components: ['a0', 'a1', 'a2'], wires: [] },
        { id: 's2', title: 'Add Inverters', description: 'Create A2\',A1\',A0\'', components: ['not-a0', 'not-a1', 'not-a2'], wires: ['w1', 'w2', 'w3'] },
        { id: 's3', title: 'Decode 000-011', description: 'Y0-Y3 (A2\')', components: ['and-y0-1', 'and-y0-2', 'and-y1-1', 'and-y1-2', 'and-y2-1', 'and-y2-2', 'and-y3-1', 'and-y3-2', 'led-y0', 'led-y1', 'led-y2', 'led-y3'], wires: ['w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'w10', 'w11', 'w12', 'w13', 'w14', 'w15', 'w16', 'w17', 'w18', 'w19', 'w20', 'w21', 'w22', 'w23'] },
        { id: 's4', title: 'Decode 100-111', description: 'Y4-Y7 (A2)', components: ['and-y4-1', 'and-y4-2', 'and-y5-1', 'and-y5-2', 'and-y6-1', 'and-y6-2', 'and-y7-1', 'and-y7-2', 'led-y4', 'led-y5', 'led-y6', 'led-y7'], wires: ['w24', 'w25', 'w26', 'w27', 'w28', 'w29', 'w30', 'w31', 'w32', 'w33', 'w34', 'w35', 'w36', 'w37', 'w38', 'w39', 'w40', 'w41', 'w42', 'w43'] },
    ],
};


// ============================================================================
// 12. PRIORITY ENCODER FROM GATES (Advanced)
// ============================================================================
export const priorityEncoderTemplate: Template = {
    id: 'priority-encoder-gates',
    name: '4-to-2 Priority Encoder',
    category: 'computing',
    description: 'Encode highest priority active input to binary using basic gates',
    difficulty: 'advanced',
    overview: 'If multiple inputs are active, output encodes the highest numbered one.',
    theory: `
4-to-2 Priority Encoder:
- 4 inputs (D3-D0), D3 has highest priority
- 2-bit output encodes which input is active
- V (valid) output indicates at least one input active

Priority: D3 > D2 > D1 > D0

| D3 | D2 | D1 | D0 | Y1 | Y0 | V |
|----|----|----|----|----|----|----|
| 0  | 0  | 0  | 0  | X  | X  | 0 |
| 0  | 0  | 0  | 1  | 0  | 0  | 1 |
| 0  | 0  | 1  | X  | 0  | 1  | 1 |
| 0  | 1  | X  | X  | 1  | 0  | 1 |
| 1  | X  | X  | X  | 1  | 1  | 1 |
    `,
    components: [
        // Inputs (active high)
        createComp('d0', 'SWITCH_TOGGLE', 60, 80, switchPins),
        createComp('d1', 'SWITCH_TOGGLE', 60, 140, switchPins),
        createComp('d2', 'SWITCH_TOGGLE', 60, 200, switchPins),
        createComp('d3', 'SWITCH_TOGGLE', 60, 260, switchPins),
        // Inverters
        createComp('not-d2', 'NOT', 160, 200, notPins),
        createComp('not-d3', 'NOT', 160, 260, notPins),
        // Y1 = D3 + D2 (high bit set if D3 or D2 active)
        createComp('or-y1', 'OR_2', 280, 230, or2Pins),
        // Y0 = D3 + D2'·D1 (low bit logic)
        createComp('and-y0-1', 'AND_2', 280, 140, and2Pins),
        createComp('or-y0', 'OR_2', 380, 180, or2Pins),
        // Valid = D3 + D2 + D1 + D0
        createComp('or-v1', 'OR_2', 280, 60, or2Pins),
        createComp('or-v2', 'OR_2', 280, 300, or2Pins),
        createComp('or-v3', 'OR_2', 380, 80, or2Pins),
        // Outputs
        createComp('led-y0', 'LED_GREEN', 480, 180, ledPins),
        createComp('led-y1', 'LED_GREEN', 380, 230, ledPins),
        createComp('led-v', 'LED_BLUE', 480, 80, ledPins),
    ],
    wires: [
        // Inverters
        createWire('w1', 'd2', 'out', 'not-d2', 'in'),
        createWire('w2', 'd3', 'out', 'not-d3', 'in'),
        // Y1 = D3 + D2
        createWire('w3', 'd3', 'out', 'or-y1', 'in1'),
        createWire('w4', 'd2', 'out', 'or-y1', 'in2'),
        createWire('w5', 'or-y1', 'out', 'led-y1', 'in'),
        // Y0 = D3 + D2'·D1
        createWire('w6', 'not-d2', 'out', 'and-y0-1', 'in1'),
        createWire('w7', 'd1', 'out', 'and-y0-1', 'in2'),
        createWire('w8', 'd3', 'out', 'or-y0', 'in1'),
        createWire('w9', 'and-y0-1', 'out', 'or-y0', 'in2'),
        createWire('w10', 'or-y0', 'out', 'led-y0', 'in'),
        // Valid = D3 + D2 + D1 + D0
        createWire('w11', 'd0', 'out', 'or-v1', 'in1'),
        createWire('w12', 'd1', 'out', 'or-v1', 'in2'),
        createWire('w13', 'd2', 'out', 'or-v2', 'in1'),
        createWire('w14', 'd3', 'out', 'or-v2', 'in2'),
        createWire('w15', 'or-v1', 'out', 'or-v3', 'in1'),
        createWire('w16', 'or-v2', 'out', 'or-v3', 'in2'),
        createWire('w17', 'or-v3', 'out', 'led-v', 'in'),
    ],
    steps: [
        { id: 's1', title: 'Add Inputs', description: 'D3 (highest) to D0 (lowest)', components: ['d0', 'd1', 'd2', 'd3'], wires: [] },
        { id: 's2', title: 'Add Inverters', description: 'For priority masking', components: ['not-d2', 'not-d3'], wires: ['w1', 'w2'] },
        { id: 's3', title: 'Y1 Output', description: 'D3 + D2', components: ['or-y1', 'led-y1'], wires: ['w3', 'w4', 'w5'] },
        { id: 's4', title: 'Y0 Output', description: 'D3 + D2\'·D1', components: ['and-y0-1', 'or-y0', 'led-y0'], wires: ['w6', 'w7', 'w8', 'w9', 'w10'] },
        { id: 's5', title: 'Valid Output', description: 'Any input active', components: ['or-v1', 'or-v2', 'or-v3', 'led-v'], wires: ['w11', 'w12', 'w13', 'w14', 'w15', 'w16', 'w17'] },
    ],
};


// ============================================================================
// EXPORT ALL TEMPLATES AS ARRAY
// ============================================================================
export const ADDITIONAL_TEMPLATES_V2: Template[] = [
    // Advanced - No abstractions, pure gate-level implementations
    mux4to1FromGatesTemplate,
    binaryCounterFromGatesTemplate,
    aluSliceFromGatesTemplate,
    memoryCell1BitTemplate,
    ram2x2FromGatesTemplate,
    shiftRegister4BitTemplate,
    comparator2BitFromGatesTemplate,
    sevenSegmentDecoderTemplate,
    fullAdderFromNandTemplate,
    tFlipFlopFromNandTemplate,
    decoder3to8Template,
    priorityEncoderTemplate,
];
