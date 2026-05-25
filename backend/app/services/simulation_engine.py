"""Topological-sort circuit simulation engine. See docs/simulator.md."""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from app.models.circuit import CircuitComponent, CircuitState, Wire


class Signal(str, Enum):
    HIGH, LOW, X = "1", "0", "X"
H, L, X = Signal.HIGH, Signal.LOW, Signal.X


@dataclass
class ComponentState:
    outputs: dict[str, Signal] = field(default_factory=dict)
    internal: dict[str, Any] = field(default_factory=dict)


_SOURCE = {"CONST_HIGH", "CONST_LOW", "VCC_5V", "VCC_3V3", "GROUND", "SWITCH_TOGGLE", "SWITCH_PUSH"}
_STATEFUL = {"SR_LATCH", "D_FLIPFLOP", "JK_FLIPFLOP", "T_FLIPFLOP", "COUNTER_4BIT", "SHIFT_REGISTER_8BIT", "CLOCK"}
_SEG = {0: "ABCDEF", 1: "BC", 2: "ABDEG", 3: "ABCDG", 4: "BCFG", 5: "ACDFG", 6: "ACDEFG", 7: "ABC", 8: "ABCDEFG", 9: "ABCDFG"}
def _and(vs): return L if L in vs else (X if X in vs else H)
def _or(vs): return H if H in vs else (X if X in vs else L)
def _not(s): return L if s == H else H if s == L else X
def _xor(a, b): return X if X in (a, b) else (H if a != b else L)
def _outs_x(c): return {p.id: X for p in c.pins if p.type.value == "output"}


def _bits(inp, pre, n):
    out = 0
    for i in range(n):
        v = inp.get(f"{pre}{i}", X)
        if v == X: return None
        if v == H: out |= 1 << i
    return out


class SimulationEngine:
    def __init__(self) -> None:
        self.components: dict[str, CircuitComponent] = {}
        self.wires: list[Wire] = []
        self.states: dict[str, ComponentState] = {}
        self.pin_values: dict[str, Signal] = {}
        self._driver: dict[str, str] = {}
    def load_circuit(self, circuit: CircuitState) -> None:
        self.components = {c.id: c for c in circuit.components}
        self.wires = list(circuit.wires)
        self.states = {c.id: ComponentState() for c in circuit.components}
        self.pin_values = {}
        self._driver = {f"{w.to_component_id}:{w.to_pin_id}": f"{w.from_component_id}:{w.from_pin_id}" for w in self.wires}
        self.run()

    def run(self) -> None:
        self._refresh_sources()
        order, in_cycle = self._topo()
        for cid in order:
            c = self.components[cid]
            self._publish(cid, self._compute_outputs(c, self._inputs(c), self.states[cid]))
        for cid in in_cycle:
            self._publish(cid, _outs_x(self.components[cid]))
        for cid, c in self.components.items():
            if c.type.value in _STATEFUL and c.type.value != "CLOCK":
                st = self.states[cid]
                self._tick(c, self._inputs(c), st)
                self._publish(cid, self._stateful_outs(c, st))
    evaluate = run

    def toggle_switch(self, component_id: str) -> None:
        c = self.components.get(component_id)
        if c and c.type.value == "SWITCH_TOGGLE":
            c.properties["state"] = not bool(c.properties.get("state"))
            self.run()

    def set_input(self, component_id: str, value: bool) -> None:
        c = self.components.get(component_id)
        if c is None: return
        if c.type.value == "SWITCH_TOGGLE": c.properties["state"] = bool(value)
        elif c.type.value == "SWITCH_PUSH": c.properties["pressed"] = c.properties["state"] = bool(value)
        self.run()

    def tick_clock(self, component_id: str) -> None:
        c = self.components.get(component_id)
        if c is None or c.type.value != "CLOCK": return
        st = self.states[component_id]
        st.internal["CLK"] = H if st.internal.get("CLK", L) == L else L
        self.run()

    def get_wire_states(self) -> dict[str, str]:
        return {w.id: self.pin_values.get(f"{w.from_component_id}:{w.from_pin_id}", X).value for w in self.wires}

    def get_pin_states(self) -> dict[str, dict[str, str]]:
        out: dict[str, dict[str, str]] = {}
        for k, s in self.pin_values.items():
            cid, pid = k.split(":", 1)
            out.setdefault(cid, {})[pid] = s.value
        return out
    def _publish(self, cid, outs):
        st = self.states[cid]
        for pid, sig in outs.items():
            st.outputs[pid] = sig
            self.pin_values[f"{cid}:{pid}"] = sig

    def _inputs(self, c):
        return {p.id: self.pin_values.get(self._driver.get(f"{c.id}:{p.id}", ""), X) for p in c.pins if p.type.value == "input"}

    def _refresh_sources(self) -> None:
        for cid, c in self.components.items():
            t, st, pr = c.type.value, self.states[cid], c.properties
            if t in ("CONST_HIGH", "VCC_5V", "VCC_3V3"): self._publish(cid, {"OUT": H})
            elif t in ("CONST_LOW", "GROUND"): self._publish(cid, {"OUT": L})
            elif t == "SWITCH_TOGGLE": self._publish(cid, {"OUT": H if pr.get("state") else L})
            elif t == "SWITCH_PUSH": self._publish(cid, {"OUT": H if (pr.get("pressed") or pr.get("state")) else L})
            elif t == "CLOCK": self._publish(cid, {"CLK": st.internal.setdefault("CLK", L)})
            elif t in _STATEFUL: self._publish(cid, self._stateful_outs(c, st))

    def _stateful_outs(self, c, st):
        t = c.type.value
        if t in ("SR_LATCH", "D_FLIPFLOP", "JK_FLIPFLOP", "T_FLIPFLOP"):
            q = st.internal.get("Q", L); return {"Q": q, "Q'": _not(q)}
        if t == "COUNTER_4BIT":
            n = st.internal.get("count", 0); return {f"Q{i}": H if (n >> i) & 1 else L for i in range(4)}
        if t == "SHIFT_REGISTER_8BIT":
            r = st.internal.get("reg", 0); return {f"Q{i}": H if (r >> i) & 1 else L for i in range(8)}
        return {}

    def _topo(self):
        comb = {c.id for c in self.components.values() if c.type.value not in _SOURCE and c.type.value not in _STATEFUL}
        adj: dict[str, list[str]] = {cid: [] for cid in comb}
        indeg = {cid: 0 for cid in comb}
        for w in self.wires:
            if w.from_component_id in comb and w.to_component_id in comb:
                adj[w.from_component_id].append(w.to_component_id)
                indeg[w.to_component_id] += 1
        q = [cid for cid, d in indeg.items() if d == 0]
        order: list[str] = []
        while q:
            cur = q.pop(0); order.append(cur)
            for nxt in adj[cur]:
                indeg[nxt] -= 1
                if indeg[nxt] == 0: q.append(nxt)
        return order, [cid for cid in comb if cid not in order]

    def _tick(self, c, inp, st):
        t = c.type.value
        if t == "SR_LATCH":
            s, r = inp.get("S", L), inp.get("R", L)
            st.internal["Q"] = X if s == H and r == H else H if s == H else L if r == H else st.internal.get("Q", L)
            return
        clk = inp.get("CLK", L)
        rising = st.internal.get("prev_clk", L) == L and clk == H
        st.internal["prev_clk"] = clk
        if not rising: return
        q = st.internal.get("Q", L)
        if t == "D_FLIPFLOP": st.internal["Q"] = inp.get("D", L)
        elif t == "JK_FLIPFLOP":
            j, k = inp.get("J", L), inp.get("K", L)
            st.internal["Q"] = _not(q) if j == H and k == H else H if j == H else L if k == H else q
        elif t == "T_FLIPFLOP":
            if inp.get("T", L) == H: st.internal["Q"] = _not(q)
        elif t == "COUNTER_4BIT":
            st.internal["count"] = (st.internal.get("count", 0) + 1) % 16
        elif t == "SHIFT_REGISTER_8BIT":
            si = 1 if inp.get("SI", L) == H else 0
            st.internal["reg"] = ((st.internal.get("reg", 0) << 1) | si) & 0xFF

    def _compute_outputs(self, comp, inputs, state):
        t, vs = comp.type.value, list(inputs.values())
        a, b = inputs.get("A", X), inputs.get("B", X)
        if t.startswith("AND_"): return {"Y": _and(vs)}
        if t.startswith("OR_"): return {"Y": _or(vs)}
        if t.startswith("NAND_"): return {"Y": _not(_and(vs))}
        if t.startswith("NOR_"): return {"Y": _not(_or(vs))}
        if t == "NOT": return {"Y": _not(a)}
        if t == "BUFFER": return {"Y": a}
        if t == "XOR_2": return {"Y": _xor(a, b)}
        if t == "XNOR_2": return {"Y": _not(_xor(a, b))}
        if t == "MUX_2TO1":
            sel = inputs.get("S", X)
            return {"Y": X if sel == X else (a if sel == L else b)}
        if t == "DECODER_2TO4":
            n = _bits(inputs, "A", 2)
            return {f"Y{i}": X if n is None else (H if i == n else L) for i in range(4)}
        if t == "JUNCTION":
            v = inputs.get("IN", X)
            return {p.id: v for p in comp.pins if p.type.value == "output"}
        if t == "ADDER_4BIT":
            ai, bi = _bits(inputs, "A", 4), _bits(inputs, "B", 4)
            if ai is None or bi is None: return _outs_x(comp)
            s = ai + bi
            return {**{f"S{i}": H if (s >> i) & 1 else L for i in range(4)}, "Cout": H if s > 15 else L}
        if t == "COMPARATOR_4BIT":
            ai, bi = _bits(inputs, "A", 4), _bits(inputs, "B", 4)
            if ai is None or bi is None: return _outs_x(comp)
            return {"A>B": H if ai > bi else L, "A=B": H if ai == bi else L, "A<B": H if ai < bi else L}
        if t == "BCD_TO_7SEG":
            n = _bits(inputs, "D", 4)
            if n is None: return _outs_x(comp)
            segs = _SEG.get(n % 10, "")
            return {p.id: H if p.id.upper() in segs else L for p in comp.pins if p.type.value == "output"}
        return {p.id: inputs.get(p.id, X) for p in comp.pins if p.type.value == "output"}
