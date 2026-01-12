/**
 * @file index.ts
 * @description Barrel export for simulation module
 * @module features/simulation
 */

// Types
export type { SignalState, SimulationError, SimulationResult, FlipFlopOutput } from './types';

// Evaluators
export {
    LogicGateEvaluator,
    LogicGate,
    FlipFlopEvaluator,
    CombinationalEvaluator,
} from './evaluators';
