/**
 * @file dump-engine-output.ts
 * @description Parity harness CLI used by `backend/tests/property/test_engine_parity.py`.
 *  Reads a JSON-serialized `CircuitState` from a file path or stdin, runs the
 *  frontend `SimulationEngine.run()`, and emits `{pinStates, wireStates}` as
 *  JSON to stdout. Exit code 0 on success, 1 on failure.
 *
 *  Usage:
 *    npx tsx scripts/dump-engine-output.ts <circuit.json>
 *    cat circuit.json | npx tsx scripts/dump-engine-output.ts -
 */

import { readFileSync } from 'node:fs';

import { SimulationEngine } from '../src/features/simulation/engine';

import type { CircuitState } from '../src/types';

function readInput(arg: string | undefined): string {
    if (!arg || arg === '-') {
        return readFileSync(0, 'utf8');
    }
    return readFileSync(arg, 'utf8');
}

function main(): void {
    const raw = readInput(process.argv[2]);
    const circuit = JSON.parse(raw) as CircuitState;
    const engine = new SimulationEngine();
    engine.loadCircuit(circuit);
    const out = {
        pinStates: engine.getPinStates(),
        wireStates: engine.getWireStates(),
    };
    process.stdout.write(JSON.stringify(out));
}

main();
