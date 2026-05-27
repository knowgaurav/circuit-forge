/**
 * @file types.ts
 * @description Type definitions for the topo-sort simulation engine.
 * @module features/simulation
 */

export type Signal = '0' | '1' | 'X';

export const HIGH: Signal = '1';
export const LOW: Signal = '0';
export const X: Signal = 'X';

/**
 * Legacy 4-valued signal kept for the validation/result layer that older
 * UI consumers still expect. New code should use `Signal` directly.
 */
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

export function toLegacy(s: Signal): SignalState {
    if (s === '1') return 'HIGH';
    if (s === '0') return 'LOW';
    return 'UNDEFINED';
}
