/**
 * @file CombinationalEvaluator.ts
 * @description Combinational logic evaluation (MUX, decoders, adders, etc.)
 * @module features/simulation/evaluators
 */

import type { SignalState } from '../types';

/**
 * Combinational logic evaluation functions
 */
export const CombinationalEvaluator = {
    /**
     * 2:1 Multiplexer: Output A when S=LOW, B when S=HIGH
     */
    evaluateMux2to1(a: SignalState, b: SignalState, sel: SignalState): SignalState {
        if (sel === 'UNDEFINED' || sel === 'ERROR') return 'UNDEFINED';
        return sel === 'LOW' ? a : b;
    },

    /**
     * 4:1 Multiplexer: Select one of 4 inputs based on 2-bit select
     */
    evaluateMux4to1(
        inputs: SignalState[],
        s0: SignalState,
        s1: SignalState
    ): SignalState {
        if (s0 === 'UNDEFINED' || s1 === 'UNDEFINED') return 'UNDEFINED';
        const sel = (s1 === 'HIGH' ? 2 : 0) + (s0 === 'HIGH' ? 1 : 0);
        return inputs[sel] ?? 'UNDEFINED';
    },

    /**
     * 2-to-4 Decoder: Only one output HIGH based on binary input
     */
    evaluateDecoder2to4(a0: SignalState, a1: SignalState): SignalState[] {
        if (a0 === 'UNDEFINED' || a1 === 'UNDEFINED') {
            return ['UNDEFINED', 'UNDEFINED', 'UNDEFINED', 'UNDEFINED'];
        }
        const sel = (a1 === 'HIGH' ? 2 : 0) + (a0 === 'HIGH' ? 1 : 0);
        return [
            sel === 0 ? 'HIGH' : 'LOW',
            sel === 1 ? 'HIGH' : 'LOW',
            sel === 2 ? 'HIGH' : 'LOW',
            sel === 3 ? 'HIGH' : 'LOW',
        ];
    },

    /**
     * 1-to-2 Demultiplexer: Route data to one of 2 outputs
     */
    evaluateDemux1to2(
        data: SignalState,
        sel: SignalState
    ): { y0: SignalState; y1: SignalState } {
        if (sel === 'UNDEFINED' || data === 'UNDEFINED') {
            return { y0: 'UNDEFINED', y1: 'UNDEFINED' };
        }
        if (sel === 'LOW') {
            return { y0: data, y1: 'LOW' };
        }
        return { y0: 'LOW', y1: data };
    },

    /**
     * 4-bit Adder: Add two 4-bit numbers
     */
    evaluateAdder4bit(
        a: number,
        b: number
    ): { sum: number[]; cout: SignalState } {
        const result = a + b;
        const sum = [
            ((result >> 0) & 1) === 1,
            ((result >> 1) & 1) === 1,
            ((result >> 2) & 1) === 1,
            ((result >> 3) & 1) === 1,
        ].map((v) => (v ? 'HIGH' : 'LOW') as SignalState);
        return {
            sum: sum.map((s) => (s === 'HIGH' ? 1 : 0)),
            cout: result > 15 ? 'HIGH' : 'LOW',
        };
    },

    /**
     * 4-bit Comparator: Compare two 4-bit numbers
     */
    evaluateComparator4bit(
        a: number,
        b: number
    ): { aGreater: SignalState; aEqual: SignalState; aLess: SignalState } {
        return {
            aGreater: a > b ? 'HIGH' : 'LOW',
            aEqual: a === b ? 'HIGH' : 'LOW',
            aLess: a < b ? 'HIGH' : 'LOW',
        };
    },

    /**
     * Parse binary input pins to number
     */
    parseBinaryInputs(
        inputs: SignalState[],
        pinNames: string[],
        prefix: string
    ): number {
        let value = 0;
        for (let i = 0; i < pinNames.length; i++) {
            const pin = pinNames[i];
            if (!pin) continue;
            const match = pin.match(new RegExp(`${prefix}(\\d)`, 'i'));
            if (match && match[1]) {
                const bit = parseInt(match[1], 10);
                if (inputs[i] === 'HIGH') {
                    value |= 1 << bit;
                }
            }
        }
        return value;
    },
};
