/**
 * @file engine.ts
 * @description Topological-sort circuit simulation engine. See docs/simulator.md.
 * @module features/simulation
 */

import { HIGH as H, LOW as L, X } from './types';

import type { Signal } from './types';
import type { CircuitComponent, CircuitState, Wire, ComponentType, Pin } from '@/types';

const SOURCE = new Set<ComponentType>([
    'CONST_HIGH',
    'CONST_LOW',
    'VCC_5V',
    'VCC_3V3',
    'GROUND',
    'SWITCH_TOGGLE',
    'SWITCH_PUSH',
]);
const STATEFUL = new Set<ComponentType>([
    'SR_LATCH',
    'D_FLIPFLOP',
    'JK_FLIPFLOP',
    'T_FLIPFLOP',
    'COUNTER_4BIT',
    'SHIFT_REGISTER_8BIT',
    'CLOCK',
]);
const SEG: Record<number, string> = {
    0: 'ABCDEF',
    1: 'BC',
    2: 'ABDEG',
    3: 'ABCDG',
    4: 'BCFG',
    5: 'ACDFG',
    6: 'ACDEFG',
    7: 'ABC',
    8: 'ABCDEFG',
    9: 'ABCDFG',
};

const _and = (vs: Signal[]): Signal => (vs.includes(L) ? L : vs.includes(X) ? X : H);
const _or = (vs: Signal[]): Signal => (vs.includes(H) ? H : vs.includes(X) ? X : L);
const _not = (s: Signal): Signal => (s === H ? L : s === L ? H : X);
const _xor = (a: Signal, b: Signal): Signal => (a === X || b === X ? X : a !== b ? H : L);
const outsX = (c: CircuitComponent): Record<string, Signal> => {
    const out: Record<string, Signal> = {};
    for (const p of c.pins) if (p.type === 'output') out[p.id] = X;
    return out;
};

function bits(inp: Record<string, Signal>, pre: string, n: number): number | null {
    let out = 0;
    for (let i = 0; i < n; i++) {
        const v = inp[`${pre}${i}`] ?? X;
        if (v === X) return null;
        if (v === H) out |= 1 << i;
    }
    return out;
}

interface ComponentState {
    outputs: Record<string, Signal>;
    internal: Record<string, unknown>;
}

export class SimulationEngine {
    private components: Map<string, CircuitComponent> = new Map();
    private wires: Wire[] = [];
    private states: Map<string, ComponentState> = new Map();
    private pinValues: Map<string, Signal> = new Map();
    private driver: Map<string, string> = new Map();

    loadCircuit(circuit: CircuitState): void {
        this.components = new Map(circuit.components.map((c) => [c.id, c]));
        this.wires = [...circuit.wires];
        this.states = new Map(circuit.components.map((c) => [c.id, { outputs: {}, internal: {} }]));
        this.pinValues = new Map();
        this.driver = new Map(
            this.wires.map((w) => [
                `${w.toComponentId}:${w.toPinId}`,
                `${w.fromComponentId}:${w.fromPinId}`,
            ])
        );
        this.run();
    }

    run(): void {
        this.refreshSources();
        const { order, inCycle } = this.topo();
        for (const cid of order) {
            const c = this.components.get(cid)!;
            this.publish(cid, this.computeOutputs(c, this.inputs(c), this.states.get(cid)!));
        }
        for (const cid of inCycle) {
            this.publish(cid, outsX(this.components.get(cid)!));
        }
        this.components.forEach((c, cid) => {
            if (STATEFUL.has(c.type) && c.type !== 'CLOCK') {
                const st = this.states.get(cid)!;
                this.tick(c, this.inputs(c), st);
                this.publish(cid, this.statefulOuts(c, st));
            }
        });
    }

    evaluate(): void {
        this.run();
    }
    toggleSwitch(componentId: string): void {
        const c = this.components.get(componentId);
        if (c && c.type === 'SWITCH_TOGGLE') {
            (c.properties as Record<string, unknown>).state = !c.properties.state;
            this.run();
        }
    }

    setInput(componentId: string, value: boolean): void {
        const c = this.components.get(componentId);
        if (!c) return;
        const props = c.properties as Record<string, unknown>;
        if (c.type === 'SWITCH_TOGGLE') props.state = value;
        else if (c.type === 'SWITCH_PUSH') {
            props.pressed = value;
            props.state = value;
        }
        this.run();
    }

    tickClock(componentId: string): void {
        const c = this.components.get(componentId);
        if (!c || c.type !== 'CLOCK') return;
        const st = this.states.get(componentId)!;
        const cur = (st.internal.CLK as Signal) ?? L;
        st.internal.CLK = cur === L ? H : L;
        this.run();
    }

    getWireStates(): Record<string, Signal> {
        const out: Record<string, Signal> = {};
        for (const w of this.wires) {
            out[w.id] = this.pinValues.get(`${w.fromComponentId}:${w.fromPinId}`) ?? X;
        }
        return out;
    }

    getPinStates(): Record<string, Record<string, Signal>> {
        const out: Record<string, Record<string, Signal>> = {};
        this.pinValues.forEach((s, k) => {
            const idx = k.indexOf(':');
            const cid = k.substring(0, idx);
            const pid = k.substring(idx + 1);
            (out[cid] ??= {})[pid] = s;
        });
        return out;
    }

    private publish(cid: string, outs: Record<string, Signal>): void {
        const st = this.states.get(cid)!;
        for (const pid in outs) {
            const sig = outs[pid]!;
            st.outputs[pid] = sig;
            this.pinValues.set(`${cid}:${pid}`, sig);
        }
    }

    private inputs(c: CircuitComponent): Record<string, Signal> {
        const out: Record<string, Signal> = {};
        for (const p of c.pins) {
            if (p.type !== 'input') continue;
            const src = this.driver.get(`${c.id}:${p.id}`);
            out[p.id] = src ? (this.pinValues.get(src) ?? X) : X;
        }
        return out;
    }

    private refreshSources(): void {
        this.components.forEach((c, cid) => {
            const t = c.type;
            const st = this.states.get(cid)!;
            const pr = c.properties as Record<string, unknown>;
            if (t === 'CONST_HIGH' || t === 'VCC_5V' || t === 'VCC_3V3')
                this.publish(cid, { OUT: H });
            else if (t === 'CONST_LOW' || t === 'GROUND') this.publish(cid, { OUT: L });
            else if (t === 'SWITCH_TOGGLE') this.publish(cid, { OUT: pr.state ? H : L });
            else if (t === 'SWITCH_PUSH')
                this.publish(cid, { OUT: pr.pressed || pr.state ? H : L });
            else if (t === 'CLOCK') {
                if (st.internal.CLK === undefined) st.internal.CLK = L;
                this.publish(cid, { CLK: st.internal.CLK as Signal });
            } else if (STATEFUL.has(t)) {
                this.publish(cid, this.statefulOuts(c, st));
            }
        });
    }

    private statefulOuts(c: CircuitComponent, st: ComponentState): Record<string, Signal> {
        const t = c.type;
        if (t === 'SR_LATCH' || t === 'D_FLIPFLOP' || t === 'JK_FLIPFLOP' || t === 'T_FLIPFLOP') {
            const q = (st.internal.Q as Signal) ?? L;
            return { Q: q, "Q'": _not(q) };
        }
        if (t === 'COUNTER_4BIT') {
            const n = (st.internal.count as number) ?? 0;
            const r: Record<string, Signal> = {};
            for (let i = 0; i < 4; i++) r[`Q${i}`] = (n >> i) & 1 ? H : L;
            return r;
        }
        if (t === 'SHIFT_REGISTER_8BIT') {
            const reg = (st.internal.reg as number) ?? 0;
            const r: Record<string, Signal> = {};
            for (let i = 0; i < 8; i++) r[`Q${i}`] = (reg >> i) & 1 ? H : L;
            return r;
        }
        return {};
    }

    private topo(): { order: string[]; inCycle: string[] } {
        const comb = new Set<string>();
        this.components.forEach((c, cid) => {
            if (!SOURCE.has(c.type) && !STATEFUL.has(c.type)) comb.add(cid);
        });
        const adj = new Map<string, string[]>();
        const indeg = new Map<string, number>();
        comb.forEach((cid) => {
            adj.set(cid, []);
            indeg.set(cid, 0);
        });
        for (const w of this.wires) {
            if (comb.has(w.fromComponentId) && comb.has(w.toComponentId)) {
                adj.get(w.fromComponentId)!.push(w.toComponentId);
                indeg.set(w.toComponentId, indeg.get(w.toComponentId)! + 1);
            }
        }
        const q: string[] = [];
        indeg.forEach((d, cid) => {
            if (d === 0) q.push(cid);
        });
        const order: string[] = [];
        while (q.length) {
            const cur = q.shift()!;
            order.push(cur);
            for (const nxt of adj.get(cur)!) {
                indeg.set(nxt, indeg.get(nxt)! - 1);
                if (indeg.get(nxt) === 0) q.push(nxt);
            }
        }
        const ordered = new Set(order);
        const inCycle: string[] = [];
        comb.forEach((cid) => {
            if (!ordered.has(cid)) inCycle.push(cid);
        });
        return { order, inCycle };
    }

    private tick(c: CircuitComponent, inp: Record<string, Signal>, st: ComponentState): void {
        const t = c.type;
        if (t === 'SR_LATCH') {
            const s = inp.S ?? L;
            const r = inp.R ?? L;
            st.internal.Q =
                s === H && r === H
                    ? X
                    : s === H
                      ? H
                      : r === H
                        ? L
                        : ((st.internal.Q as Signal) ?? L);
            return;
        }
        const clk = inp.CLK ?? L;
        const prev = (st.internal.prev_clk as Signal) ?? L;
        const rising = prev === L && clk === H;
        st.internal.prev_clk = clk;
        if (!rising) return;
        const q = (st.internal.Q as Signal) ?? L;
        if (t === 'D_FLIPFLOP') st.internal.Q = inp.D ?? L;
        else if (t === 'JK_FLIPFLOP') {
            const j = inp.J ?? L;
            const k = inp.K ?? L;
            st.internal.Q = j === H && k === H ? _not(q) : j === H ? H : k === H ? L : q;
        } else if (t === 'T_FLIPFLOP') {
            if ((inp.T ?? L) === H) st.internal.Q = _not(q);
        } else if (t === 'COUNTER_4BIT') {
            st.internal.count = (((st.internal.count as number) ?? 0) + 1) % 16;
        } else if (t === 'SHIFT_REGISTER_8BIT') {
            const si = (inp.SI ?? L) === H ? 1 : 0;
            st.internal.reg = ((((st.internal.reg as number) ?? 0) << 1) | si) & 0xff;
        }
    }

    private computeOutputs(
        comp: CircuitComponent,
        inputs: Record<string, Signal>,
        _state: ComponentState
    ): Record<string, Signal> {
        const t = comp.type;
        const vs = comp.pins.filter((p: Pin) => p.type === 'input').map((p) => inputs[p.id] ?? X);
        const a = inputs.A ?? X;
        const b = inputs.B ?? X;
        if (t.startsWith('AND_')) return { Y: _and(vs) };
        if (t.startsWith('OR_')) return { Y: _or(vs) };
        if (t.startsWith('NAND_')) return { Y: _not(_and(vs)) };
        if (t.startsWith('NOR_')) return { Y: _not(_or(vs)) };
        if (t === 'NOT') return { Y: _not(a) };
        if (t === 'BUFFER') return { Y: a };
        if (t === 'XOR_2') return { Y: _xor(a, b) };
        if (t === 'XNOR_2') return { Y: _not(_xor(a, b)) };
        if (t === 'MUX_2TO1') {
            const sel = inputs.S ?? X;
            return { Y: sel === X ? X : sel === L ? a : b };
        }
        if (t === 'DECODER_2TO4') {
            const n = bits(inputs, 'A', 2);
            const r: Record<string, Signal> = {};
            for (let i = 0; i < 4; i++) r[`Y${i}`] = n === null ? X : i === n ? H : L;
            return r;
        }
        if (t === 'JUNCTION') {
            const v = inputs.IN ?? X;
            const r: Record<string, Signal> = {};
            for (const p of comp.pins) if (p.type === 'output') r[p.id] = v;
            return r;
        }
        if (t === 'ADDER_4BIT') {
            const ai = bits(inputs, 'A', 4);
            const bi = bits(inputs, 'B', 4);
            if (ai === null || bi === null) return outsX(comp);
            const s = ai + bi;
            const r: Record<string, Signal> = { Cout: s > 15 ? H : L };
            for (let i = 0; i < 4; i++) r[`S${i}`] = (s >> i) & 1 ? H : L;
            return r;
        }
        if (t === 'COMPARATOR_4BIT') {
            const ai = bits(inputs, 'A', 4);
            const bi = bits(inputs, 'B', 4);
            if (ai === null || bi === null) return outsX(comp);
            return { 'A>B': ai > bi ? H : L, 'A=B': ai === bi ? H : L, 'A<B': ai < bi ? H : L };
        }
        if (t === 'BCD_TO_7SEG') {
            const n = bits(inputs, 'D', 4);
            if (n === null) return outsX(comp);
            const segs = SEG[n % 10] ?? '';
            const r: Record<string, Signal> = {};
            for (const p of comp.pins)
                if (p.type === 'output') r[p.id] = segs.includes(p.id.toUpperCase()) ? H : L;
            return r;
        }
        const r: Record<string, Signal> = {};
        for (const p of comp.pins) if (p.type === 'output') r[p.id] = inputs[p.id] ?? X;
        return r;
    }
}

export const simulationEngine = new SimulationEngine();
