/**
 * @file simulate.ts
 * @description Validate a circuit, run the engine, return a `SimulationResult`
 *  in the legacy 4-valued `SignalState` representation expected by the
 *  current UI consumers.
 * @module features/simulation
 */

import { SimulationEngine } from './engine';
import { toLegacy } from './types';

import type { SignalState, SimulationError, SimulationResult } from './types';
import type { CircuitState, ComponentType } from '@/types';

const INPUT_DEVICES = new Set<ComponentType>([
    'SWITCH_TOGGLE',
    'SWITCH_PUSH',
    'CONST_HIGH',
    'CONST_LOW',
    'CLOCK',
    'DIP_SWITCH_4',
    'NUMERIC_INPUT',
    'VCC_5V',
    'VCC_3V3',
]);
const OUTPUT_DEVICES = new Set<ComponentType>([
    'LED_RED',
    'LED_GREEN',
    'LED_YELLOW',
    'LED_BLUE',
    'LED_RGB',
    'DISPLAY_7SEG',
    'BUZZER',
    'MOTOR_DC',
    'PROBE',
    'GROUND',
]);

function validate(circuit: CircuitState): SimulationError[] {
    const errors: SimulationError[] = [];
    const connected = new Set<string>();
    const drivers = new Map<string, string[]>();
    for (const w of circuit.wires) {
        const k = `${w.toComponentId}:${w.toPinId}`;
        connected.add(k);
        const list = drivers.get(k) ?? [];
        list.push(w.fromComponentId);
        drivers.set(k, list);
    }
    for (const c of circuit.components) {
        if (INPUT_DEVICES.has(c.type) || OUTPUT_DEVICES.has(c.type)) continue;
        for (const p of c.pins) {
            if (p.type === 'input' && !connected.has(`${c.id}:${p.id}`)) {
                errors.push({
                    errorType: 'FLOATING_INPUT',
                    message: `Floating Input: ${c.label || c.type} pin '${p.name}' has no connection`,
                    componentId: c.id,
                    pinId: p.id,
                });
            }
        }
    }
    drivers.forEach((srcs, k) => {
        const unique = new Set(srcs);
        if (unique.size > 1) {
            const [cid, pid] = k.split(':') as [string, string];
            const comp = circuit.components.find((c) => c.id === cid);
            const pinName = comp?.pins.find((p) => p.id === pid)?.name ?? pid;
            errors.push({
                errorType: 'OUTPUT_CONFLICT',
                message: `Output Conflict: ${comp?.label || cid} pin '${pinName}' has multiple drivers`,
                componentId: cid,
                pinId: pid,
            });
        }
    });
    return errors;
}

function detectCycle(circuit: CircuitState): boolean {
    const adj = new Map<string, string[]>();
    const indeg = new Map<string, number>();
    for (const c of circuit.components) {
        adj.set(c.id, []);
        indeg.set(c.id, 0);
    }
    const seen = new Set<string>();
    for (const w of circuit.wires) {
        const e = `${w.fromComponentId}>${w.toComponentId}`;
        if (seen.has(e)) continue;
        seen.add(e);
        adj.get(w.fromComponentId)?.push(w.toComponentId);
        indeg.set(w.toComponentId, (indeg.get(w.toComponentId) ?? 0) + 1);
    }
    const q: string[] = [];
    indeg.forEach((d, cid) => {
        if (d === 0) q.push(cid);
    });
    let visited = 0;
    while (q.length) {
        const cur = q.shift()!;
        visited++;
        for (const nxt of adj.get(cur) ?? []) {
            indeg.set(nxt, indeg.get(nxt)! - 1);
            if (indeg.get(nxt) === 0) q.push(nxt);
        }
    }
    return visited !== circuit.components.length;
}

export function simulate(circuit: CircuitState): SimulationResult {
    const errors = validate(circuit);
    if (errors.length) return { success: false, wireStates: {}, pinStates: {}, errors };
    if (detectCycle(circuit)) {
        return {
            success: false,
            wireStates: {},
            pinStates: {},
            errors: [
                {
                    errorType: 'CYCLE_DETECTED',
                    message: 'Circuit feedback loop did not stabilize - possible oscillation',
                },
            ],
        };
    }
    const engine = new SimulationEngine();
    engine.loadCircuit(circuit);
    const wireStates: Record<string, SignalState> = {};
    for (const [wid, sig] of Object.entries(engine.getWireStates())) {
        wireStates[wid] = toLegacy(sig);
    }
    const pinStates: Record<string, Record<string, SignalState>> = {};
    for (const c of circuit.components) pinStates[c.id] = {};
    for (const [cid, pins] of Object.entries(engine.getPinStates())) {
        const map: Record<string, SignalState> = {};
        for (const [pid, sig] of Object.entries(pins)) map[pid] = toLegacy(sig);
        pinStates[cid] = map;
    }
    return { success: true, wireStates, pinStates, errors: [] };
}
