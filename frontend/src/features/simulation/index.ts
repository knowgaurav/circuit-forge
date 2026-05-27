/**
 * @file index.ts
 * @description Barrel export for the simulation module.
 * @module features/simulation
 */

export type { Signal, SignalState, SimulationError, SimulationResult } from './types';
export { HIGH, LOW, X, toLegacy } from './types';
export { SimulationEngine, simulationEngine } from './engine';
export { simulate } from './simulate';
