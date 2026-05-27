# Simulator Spec

CircuitForge has one simulator algorithm, implemented twice (Python backend and
TypeScript frontend) so that the same circuit produces the same pin states on
each side. A property-based parity test enforces this. The old discrete-event
scheduler (priority queue, per-gate `delay`, `Event` objects, `step()` /
`run_until()`) is gone.

## Three-valued logic

Signals are `0`, `1`, or `X` (unknown / cycle / floating).

| `AND` | 0 | 1 | X |   | `OR`  | 0 | 1 | X |   | `XOR` | 0 | 1 | X |
|-------|---|---|---|---|-------|---|---|---|---|-------|---|---|---|
| **0** | 0 | 0 | 0 |   | **0** | 0 | 1 | X |   | **0** | 0 | 1 | X |
| **1** | 0 | 1 | X |   | **1** | 1 | 1 | 1 |   | **1** | 1 | 0 | X |
| **X** | 0 | X | X |   | **X** | X | 1 | X |   | **X** | X | X | X |

`NOT 0 = 1`, `NOT 1 = 0`, `NOT X = X`.

Dominance rules:
- `0 AND X = 0` (a known-low input forces the AND output low).
- `1 OR X = 1` (a known-high input forces the OR output high).
- Otherwise `X` propagates.

## Combinational vs stateful nodes

**Combinational** — pure function of input pins. Re-evaluated every pass:

`AND_2/3/4`, `OR_2/3/4`, `NOT`, `BUFFER`, `NAND_2/3`, `NOR_2/3`, `XOR_2`,
`XNOR_2`, `MUX_2TO1`, `DECODER_2TO4`, `ADDER_4BIT`, `COMPARATOR_4BIT`,
`BCD_TO_7SEG`, `JUNCTION`.

**Stateful** — owns internal state (`Q`, counter, shift register, prev clock).
The output pins are *sources* in the topo graph: they reflect the *previous*
internal state and never participate in cycle detection. State advances only
when a rising edge is detected on the relevant clock pin during a `run()`
pass, or when `tick_clock(clock_id)` is called explicitly:

`SR_LATCH`, `D_FLIPFLOP`, `JK_FLIPFLOP`, `T_FLIPFLOP`, `COUNTER_4BIT`,
`SHIFT_REGISTER_8BIT`, `CLOCK`.

**Sources** — `CONST_HIGH`, `CONST_LOW`, `VCC_5V`, `VCC_3V3`, `GROUND`,
`SWITCH_TOGGLE`, `SWITCH_PUSH`. Output reflects an immediate property
(`state`, `pressed`).

## Topological-sort algorithm

One pass per `run()`:

1. Initialise output pins of sources and stateful nodes from their cached
   internal state.
2. Build a DAG of *combinational* nodes only. Edge `u -> v` when `u`'s output
   feeds an input pin of `v`.
3. Kahn topo-sort the combinational DAG. Nodes that don't appear in the result
   form a cycle.
4. Walk the topo order, pull each node's input signals from the wire driving
   the input pin (or `X` if floating), compute outputs via the type-specific
   truth table, write outputs back into the pin map.
5. Detect rising clock edges (`prev_clk == 0` and `clk == 1`) on each stateful
   node and update its internal state. Re-publish the new state to its output
   pins, then store the current clock value as `prev_clk`.

## Cycle handling

Combinational cycles are an error. Every node in a strongly connected component
of the combinational DAG returns `Signal.X` on every output pin for the rest of
the pass. We do not iterate to a fixed point. Latches that need feedback must
use the `SR_LATCH` primitive (which is stateful, so its outputs are sources and
break the cycle).

## What we deleted

The previous backend engine (394 lines) used a discrete-event simulator:

- `Event` dataclass with `time`, `seq`, `value` and `heapq` priority queue.
- `step()` popped one event, propagated, and rescheduled with a `delay=1` per
  gate. `run(max_steps)` ran the queue until empty. `run_until(end_time)`
  stopped at a wall-clock target.
- Stateful nodes detected edges via the same scheduled events.

Discrete-event simulators make sense when you actually model timing
(propagation delays, clock skew). We don't. We simulate *digital logic at
steady state*. Removing the scheduler gets us:

- One algorithm, half the code, no surprising step counts.
- Frontend and backend can match exactly because there's no event ordering
  for two implementations to disagree on.
- Cycle errors are explicit rather than "silently oscillates until
  `max_steps`".

The frontend's old `services/simulation.ts` (1193 lines) used iterative
convergence for cycles. That's gone too — same reason.
