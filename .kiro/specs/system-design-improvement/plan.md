# CircuitForge — System Design Improvement Plan

## Goal

Differentiate CircuitForge from the DET monorepo by going *deep* on the things DET doesn't do: a verified consistency model for real-time collaboration, a visible-trace agentic AI feature, and a novel feature built on top of the event log (replay/time-travel debugger).

Four stories, ~5 weeks total, ~$0/mo hosting. Each story is independently shippable, has explicit checkpoints, and ends with a defensible interview talking point.

### Anti-goals (explicitly out of scope)
- Rewriting the working frontend, component registry, templates, or canvas renderer
- Duplicating the DET monorepo's Azure stack (Durable Functions, Service Bus, Web PubSub, KEDA)
- Dual-mode "free vs showcase" deploy toggle
- Vector stores, semantic compression, adaptive tutoring, NL-to-circuit, pattern recognition
- Circuit breakers / DLQ / canary deploys for problems we don't have
- Going back to node-to-node wires (the existing pin model stays)

---

## Current State (grounded)

What exists and stays:
- 40+ components, 30+ templates, canvas renderer, wire routing, properties panel
- Pin-based component model
- `backend/app/services/llm_service.py` + `llm_tools.py` + `prompt_guard.py` + `output_validator.py`
- `backend/app/repositories/event_repository.py` (event log already in place)
- `backend/app/services/session_service.py` + `app/websocket/` (host-authoritative WS sync)
- pytest + Hypothesis (backend), Vitest + fast-check (frontend)
- Vercel + Render + Atlas free-tier deployment

The actual gaps:
- Two simulators (backend `simulation_engine.py` 394 lines, frontend `simulation.ts` 1193 lines) implement different algorithms and can silently disagree
- Backend uses a discrete-event simulator with priority queue and per-gate delays — features we never use
- Consistency model for collaboration is not written down
- Simulation determinism is not property-tested
- LLM is single-shot, no agentic loop, no visible tool trace
- Event log exists but is never replayed for the user's benefit (no time-travel UI)
- Course generation blocks the request — no progress, no retry semantics

---

## Story 0 — Simulator Rewrite (Foundation)

**Why:** Two simulators that can disagree make every other property test untrustworthy. The backend's discrete-event model is unused complexity. Topological sort over a graph where stateful primitives are sources is the right algorithm for an educational simulator.

### Algorithm spec

- **Combinational nodes** (AND/OR/NOT/NAND/NOR/XOR/XNOR/BUFFER, MUX, decoders, adders, comparators) are pure functions of their input pins
- **Stateful nodes** (D/JK/T flip-flops, SR_LATCH, counter, shift register, clock) hold internal state. Their *outputs* are sources in the topo graph (reflect previous state). Their `tick()` runs separately on clock edge
- **Three-valued logic** stays: `0 | 1 | X`. Correct dominance: `0 AND X = 0`, `1 OR X = 1`
- **One pass per evaluation:** topo-sort combinational nodes once, evaluate in order, write pin states
- **Combinational cycle detected** = error, return `X` for the cycle nodes

### Tasks

| # | Task | File | Verify |
|---|------|------|--------|
| 0.1 | Write simulator spec | `docs/simulator.md` | One page, includes 3-valued truth tables and combinational vs stateful component list |
| 0.2 | Rewrite backend engine | `backend/app/services/simulation_engine.py` | <= 200 LOC; existing `tests/unit/test_simulation_engine.py` passes; all gate truth tables match |
| 0.3 | Update `simulation_service.py` to call new engine API | `backend/app/services/simulation_service.py` | `tests/unit/test_simulation_service.py` passes |
| 0.4 | Rewrite frontend engine | `frontend/src/features/simulation/engine.ts` (new) + slim existing evaluators | Frontend simulation tests pass |
| 0.5 | Migrate `services/simulation.ts` consumers, then delete the file | grep usages across `frontend/src/` | No broken imports; `npm run typecheck` clean |
| 0.6 | Cross-engine parity test | `backend/tests/property/test_engine_parity.py` | 500 Hypothesis examples; backend and frontend produce identical pin states for the same circuit + inputs |
| 0.7 | Frontend parity harness | `frontend/scripts/dump-engine-output.ts` (CLI) | Backend test invokes via subprocess and compares JSON output |

### Checkpoints
- ✅ **C0.A** All existing simulation unit tests still pass against the new backend engine
- ✅ **C0.B** Backend engine LOC reduced to <= 200, frontend simulation module total <= 500 LOC
- ✅ **C0.C** Parity test green at 500 examples, deadline=None
- ✅ **C0.D** No remaining references to the old discrete-event API (`Event`, `heapq`, `step()`, `run_until()`, per-gate delays)

### Effort: ~1 week

---

## Story A — Consistency Model & Determinism

**Why:** Event-sourced collaborative state with live simulation is the unique part of CircuitForge. Specifying and verifying it is more impressive than wrapping it in cloud services. DET has no equivalent.

### Tasks

| # | Task | File | Verify |
|---|------|------|--------|
| A.1 | Write consistency ADR | `docs/adr/0001-collaboration-consistency.md` | One page covering: host-authoritative ordering, monotonic seq per session, reconnect protocol, why not CRDT, why not LWW-only, what we give up |
| A.2 | Lock event schema | `backend/app/events/schema.py` | Discriminated `CircuitEvent` union; required `seq`, `session_id`, `actor_id`, `timestamp`; no speculative `Optional` fields |
| A.3 | Add `seq` enforcement at write path | `backend/app/repositories/event_repository.py` | Append rejects out-of-order or duplicate seq; unit test covers both |
| A.4 | Define snapshot policy | `backend/app/services/session_service.py` (or new `snapshot_service.py`) | Snapshot every N events (config, default 50); unit test: snapshot + replay delta == full replay |
| A.5 | Reconnect protocol implementation | `backend/app/websocket/handler.py` | Client sends `last_seen_seq`; server replies with delta or fresh snapshot; integration test |
| A.6 | Frontend reconnect handling | `frontend/src/services/websocket.ts` + relevant store | On reconnect, applies delta or replaces state from snapshot; Vitest covers both branches |
| A.7 | Hypothesis determinism test | `backend/tests/property/test_determinism.py` | Strategy generates random valid event sequences; property: simulating the same log twice yields identical pin states; 1000 examples |
| A.8 | Order-invariance property | same file | Property: applying events as one batch vs one-by-one yields identical final state |
| A.9 | Integration test: kill + reconnect | `backend/tests/integration/test_reconnect.py` | Apply N events, drop WS, reconnect with `last_seq=K`, assert state matches |

### Out of scope
- CRDTs (we document why not, we don't build one)
- Multi-region / cross-host failover (separate story below if you pick it)

### Checkpoints
- ✅ **CA.A** ADR merged, reviewed against an actual reconnect scenario
- ✅ **CA.B** Event schema is the single source of truth (delete any duplicated event types in services)
- ✅ **CA.C** Determinism property green at 1000 examples
- ✅ **CA.D** Reconnect integration test green
- ✅ **CA.E** Snapshot reconstruction is O(snapshot_size + delta), benchmarked once and noted in the ADR

### Effort: ~1.5 weeks

---

## Story B — Lean ReAct Agent with Visible Trace

**Why:** A visible ReAct loop with grounded tool calls is more impressive than a vector store you'll never fill. The trace UI is the demo. DET has no equivalent.

### Tasks

| # | Task | File | Verify |
|---|------|------|--------|
| B.1 | ReAct orchestrator | `backend/app/services/agent/orchestrator.py` | Single loop, max 6 iterations, hard token budget (4k in / 1k out), aborts with structured error when exceeded |
| B.2 | Sliding-window context | `backend/app/services/agent/context.py` | Keeps system prompt + last K=8 turns within budget; drops oldest turn whole when over budget; no embeddings |
| B.3 | Tool: `get_circuit_state` | `backend/app/services/agent/tools.py` | Returns components + wires from `circuit_service`; unit test |
| B.4 | Tool: `simulate(steps: int)` | same file | Calls `simulation_engine.evaluate()` (and `tick_clocks` if steps > 0); returns pin map |
| B.5 | Tool: `add_component(type, position)` | same file | Validates against `component_registry`, emits `component_added` event via existing event path |
| B.6 | Tool: `remove_component(id)` | same file | Emits `component_removed` event |
| B.7 | Tool: `validate_circuit` | same file | Reports unconnected pins, short circuits, combinational cycles |
| B.8 | Tool: `explain_signal_path(from_id, to_id)` | same file | BFS over wire graph; returns ordered node list with intermediate values |
| B.9 | Strict tool schemas | same file | Every tool: Pydantic args, no `Optional` unless flow truly omits, typed exceptions |
| B.10 | Output validation against registry | extend `backend/app/services/output_validator.py` | LLM-generated component types must exist; pin names must match schema; failures return structured error to the agent (counts against iteration budget) |
| B.11 | Agent endpoint | `backend/app/api/agent.py` | `POST /api/agent/turn` returns `{ trace: [...], final_message }` |
| B.12 | Trace persistence | extend `backend/app/repositories/` | Per-session conversation log in Mongo (just for replay/debug; no embeddings) |
| B.13 | Frontend trace UI | `frontend/src/components/agent/AgentTrace.tsx` | Renders thought → tool call (collapsible JSON) → result → next thought; matches API shape |
| B.14 | Frontend agent panel | `frontend/src/features/agent/AgentPanel.tsx` | Input + send; renders `AgentTrace` for the current turn |

### Out of scope
- Vector store, RAG, semantic memory, FAISS
- Pattern recognition with hardcoded patterns dict
- Adaptive tutoring, "build me a 4-bit counter" NL generation
- Multi-agent / planner-executor split

### Checkpoints
- ✅ **CB.A** Six tools, each with Pydantic schemas and unit tests
- ✅ **CB.B** Orchestrator unit tests cover: budget exhaustion, validation-failure retry, max-iteration abort
- ✅ **CB.C** Trace UI renders a real ReAct turn end-to-end (record a 30s screencap)
- ✅ **CB.D** Output validator catches a hallucinated pin name in a unit test (regression for the demo)

### Effort: ~1.5 weeks

---

## Story C — Time-Travel Debugger (the differentiator)

**Why:** This is the one DET cannot copy. We already have the event log from Story A. Adding a UI to replay any session forward/backward turns the event-sourcing investment into a visible product feature. It's the kind of thing that lives in the demo video.

### What it does (user view)
- Open a session you've previously been in
- Scrub a timeline: every event becomes a tick on the slider
- At any point, see the canvas + pin states *as they were at that moment*
- "Branch from here" creates a new session pre-seeded with the prefix, so a teacher can show a student "what if we'd added an OR instead of an AND?"

### Tasks

| # | Task | File | Verify |
|---|------|------|--------|
| C.1 | API: list events for a session | `backend/app/api/sessions.py` (extend) | `GET /api/sessions/{id}/events?from_seq&to_seq` returns event slice + nearest snapshot |
| C.2 | Service: state-at-seq | `backend/app/services/session_service.py` | `get_state_at(session_id, seq) -> CircuitState`; uses nearest snapshot + delta replay |
| C.3 | Frontend timeline component | `frontend/src/features/replay/Timeline.tsx` | Slider + ticks per event; current scrub position highlighted |
| C.4 | Frontend replay store | `frontend/src/stores/replayStore.ts` | Zustand store: `seq`, `state`, `setSeq(n)` (debounced fetch) |
| C.5 | Read-only canvas mode | extend canvas store/components | When in replay mode, canvas is non-interactive, shows simulator output computed locally from the replayed state |
| C.6 | "Branch from here" action | `backend/app/api/sessions.py` (new endpoint) + frontend button | `POST /api/sessions/{id}/branch?from_seq=N` creates a new session whose initial state is the replayed state at seq N |
| C.7 | Performance: snapshot acceleration | `session_service.py` | Replaying any seq must be O(snapshot_interval). Bench it once, write the number in `docs/replay.md` |
| C.8 | Integration test | `backend/tests/integration/test_replay.py` | Apply 100 events, scrub to seq=50, assert state matches what we'd get if we replayed 50 events from scratch |
| C.9 | Property test | `backend/tests/property/test_replay.py` | For random event logs, `get_state_at(N)` followed by replaying remaining events == replaying the full log |

### Out of scope
- Multi-user concurrent replay (one viewer scrubs, others edit) — single-user replay only
- Event editing / undo of historical events — read-only and branch-only

### Checkpoints
- ✅ **CC.A** Scrub to any point in a 100-event session in <100ms
- ✅ **CC.B** Branch creates a new session that visually matches the source at seq N
- ✅ **CC.C** Property test green: replay correctness across random logs
- ✅ **CC.D** Demo recorded: scrub through a session, branch from a midpoint, edit the branch (60s screencap)

### Effort: ~1 week

---

## Deployment

**Decision:** Keep the existing Vercel + Render + Atlas setup. No dual-mode toggle, no Bicep, no adapter pattern.

Reasons:
- It already works. Free tier is fine for a portfolio link.
- DET is the place for the full Azure story. CircuitForge's story is depth on collab + agent + time travel.
- Maintaining a dual-mode codebase isn't worth it for a side project.

`DEPLOYMENT.md` stays as-is. The `azure/` folder gets archived (move to `docs/archive/azure/` rather than deleted, in case we want to reference the Bicep we already wrote).

---

## Implementation Order & Timeline

| Order | Story | Effort | Why this order |
|-------|-------|--------|----------------|
| 1 | Story 0 — Simulator Rewrite | 1 week | Without a clean engine, every later property test tests the wrong thing |
| 2 | Story A — Consistency & Determinism | 1.5 weeks | Locks the event-sourcing foundation; Story B and C both depend on it |
| 3 | Story C — Time-Travel Debugger | 1 week | Fast win on top of A. Builds momentum and gives an immediate differentiator |
| 4 | Story B — ReAct Agent | 1.5 weeks | Last because it's the most variable in scope; if time runs short, ship a subset of tools |

**Total: ~5 weeks. Cost: $0/mo.**

Each story ends with: green tests, a one-page doc/ADR, and a recordable demo.

---

## Resume Talking Points (after all four stories)

- "Replaced a 394-line discrete-event circuit simulator with a 200-line topological-sort engine. Same semantics, half the bugs. Backend and frontend simulators now match exactly, verified by a Hypothesis property test that runs 500 random circuits through both and asserts identical pin states."
- "Specified and property-tested the consistency model for a real-time collaborative editor. Host-authoritative event log with snapshot-every-N replay, deterministic across 1000+ Hypothesis-generated event sequences. Wrote the trade-offs against CRDTs in an ADR."
- "Built a time-travel debugger over the event log: scrub any session to any prior moment in <100ms, branch a new session from any historical point. Property-tested for replay correctness."
- "Built a ReAct agent with six grounded tools over the circuit registry. The full reasoning trace renders in the UI. Strict Pydantic tool schemas with output validation against the component registry caught hallucinated pin names before they hit the canvas."

Each bullet is something you can defend against a follow-up question, because you actually built it and wrote down the trade-offs.

---

## How this differs from DET

| Capability | DET | CircuitForge (after this plan) |
|------------|-----|----------------------------------|
| Async pipeline on Azure | ✅ Durable Functions, Service Bus, Web PubSub | ❌ Out of scope |
| Document/tag extraction | ✅ Core domain | ❌ Different domain |
| Specified consistency model with property tests | ❌ | ✅ Story A |
| Replay / time-travel UI over event log | ❌ | ✅ Story C |
| Visible-trace ReAct agent grounded in a typed tool registry | ❌ | ✅ Story B |
| Cross-engine parity test for a stateful simulator | ❌ | ✅ Story 0 |

Different story, same kind of stack. That's the differentiation.

---

## Working Agreements

Per `AGENTS.md`:
- No defensive `Optional` fields "just in case." If a field is required, mark it required.
- No fallback behaviors invented for callers we own. We own every caller; fix the source.
- No new abstractions until the second concrete need appears.
- Every commit ties to one task ID above. Every PR closes one or more checkpoints.
- Tests get added with the feature, not as a separate phase.
