/**
 * @file types.ts
 * @description Type definitions for simulation module
 * @module features/simulation
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

export interface FlipFlopOutput {
    q: SignalState;
    qBar: SignalState;
}
