/**
 * @file LogicGateEvaluator.ts
 * @description Pure logic gate evaluation functions using truth tables
 * @module features/simulation/evaluators
 */

import type { SignalState } from '../types';

/**
 * Logic gate evaluation functions
 */
export const LogicGateEvaluator = {
    /**
     * AND gate: Output HIGH only when all inputs are HIGH
     */
    evaluateAnd(inputs: SignalState[]): SignalState {
        if (inputs.includes('UNDEFINED') || inputs.includes('ERROR')) {
            return 'UNDEFINED';
        }
        return inputs.every((s) => s === 'HIGH') ? 'HIGH' : 'LOW';
    },

    /**
     * OR gate: Output HIGH when any input is HIGH
     */
    evaluateOr(inputs: SignalState[]): SignalState {
        if (inputs.includes('UNDEFINED') || inputs.includes('ERROR')) {
            return 'UNDEFINED';
        }
        return inputs.some((s) => s === 'HIGH') ? 'HIGH' : 'LOW';
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
        const andResult = LogicGateEvaluator.evaluateAnd(inputs);
        return LogicGateEvaluator.evaluateNot(andResult);
    },

    /**
     * NOR gate: Output LOW when any input is HIGH
     */
    evaluateNor(inputs: SignalState[]): SignalState {
        const orResult = LogicGateEvaluator.evaluateOr(inputs);
        return LogicGateEvaluator.evaluateNot(orResult);
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
        const xorResult = LogicGateEvaluator.evaluateXor(inputs);
        return LogicGateEvaluator.evaluateNot(xorResult);
    },

    /**
     * Buffer: Output equals input
     */
    evaluateBuffer(input: SignalState): SignalState {
        return input;
    },
};

// Alias for backward compatibility
export const LogicGate = LogicGateEvaluator;
