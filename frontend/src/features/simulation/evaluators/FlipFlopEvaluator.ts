/**
 * @file FlipFlopEvaluator.ts
 * @description Sequential logic evaluation for flip-flops and latches
 * @module features/simulation/evaluators
 */

import type { SignalState, FlipFlopOutput } from '../types';

/**
 * Flip-flop and latch evaluation functions
 */
export const FlipFlopEvaluator = {
    /**
     * SR Latch: Set-Reset latch
     * S=1, R=0 -> Q=1
     * S=0, R=1 -> Q=0
     * S=0, R=0 -> Q holds previous state
     * S=1, R=1 -> Invalid (both outputs LOW in this implementation)
     */
    evaluateSRLatch(s: SignalState, r: SignalState, prevQ: SignalState): FlipFlopOutput {
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
    evaluateDFlipFlop(
        d: SignalState,
        clk: SignalState,
        prevClk: SignalState,
        prevQ: SignalState
    ): FlipFlopOutput {
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
    evaluateJKFlipFlop(
        j: SignalState,
        k: SignalState,
        clk: SignalState,
        prevClk: SignalState,
        prevQ: SignalState
    ): FlipFlopOutput {
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

    /**
     * T Flip-Flop: On rising edge of CLK, toggle if T=1
     */
    evaluateTFlipFlop(
        t: SignalState,
        clk: SignalState,
        prevClk: SignalState,
        prevQ: SignalState
    ): FlipFlopOutput {
        if (t === 'UNDEFINED' || clk === 'UNDEFINED') {
            return { q: 'UNDEFINED', qBar: 'UNDEFINED' };
        }
        const q = prevQ === 'UNDEFINED' ? 'LOW' : prevQ;
        // Rising edge detection
        if (prevClk === 'LOW' && clk === 'HIGH') {
            if (t === 'HIGH') {
                // Toggle
                const newQ = q === 'HIGH' ? 'LOW' : 'HIGH';
                return { q: newQ, qBar: newQ === 'HIGH' ? 'LOW' : 'HIGH' };
            }
        }
        // Hold state
        return { q, qBar: q === 'HIGH' ? 'LOW' : 'HIGH' };
    },
};
