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

## Execution Model — Parallel Lanes

Each story is split into **lanes** so multiple sub-agents can work concurrently without stepping on each other.

A lane:
- Owns a fixed file scope. No two active lanes write the same file.
- Lives on its own worktree + branch off the `system-design-improvement` integration branch.
- Closes a specific subset of tasks from the story table.
- Has a stated **entry condition** (what must already be on integration before it starts).

### Worktree & branch convention

- Integration worktree: `circuit-forge-system-design/` on branch `system-design-improvement`
- Lane worktree: `circuit-forge-<lane-id>/` on branch `<lane-id>` (e.g. `circuit-forge-storyA-snapshots/` on `storyA-snapshots`)

Create a lane:
```
git -C circuit-forge worktree add -b <lane-id> ../circuit-forge-<lane-id> system-design-improvement
```

Drop a lane after merge:
```
git -C circuit-forge worktree remove ../circuit-forge-<lane-id>
git -C circuit-forge branch -d <lane-id>
```

### Merge protocol

1. Lane finishes its checkpoint locally (commits, no push).
2. Rebase lane on `system-design-improvement`.
3. Run full backend + frontend test suite on the rebased lane.
4. Fast-forward `system-design-improvement` to the lane head.
5. Remove lane worktree + branch.

One PR per **story** (not per lane) opens against `main` once the story's checkpoints are all green on integration.

### Per-lane working agreement (read this before writing code)

- Touch only files in your lane's **Allowed files** list. If a task forces you outside it, stop and re-scope.
- Add tests with the feature. No follow-up "tests PR".
- One commit per task ID. Commit message: `<task-id>: <summary>` (e.g. `A.4: snapshot every N events`).
- Wait for your **Entry condition** to be satisfied before starting. Don't preemptively branch off stale main.
- If a lane needs a contract another lane is still defining, that contract lands as its own tiny PR first (see Story B contracts lane).

---

## Story 0 — Simulator Rewrite (Foundation) ✅ Done

Shipped in PR #6 (commit `52738b4`). Engine, parity test, and `docs/simulator.md` live on `main`. Inter-story API surface captured in `.kiro/specs/system-design-improvement/contracts.md`.

---

## Story A — Consistency Model & Determinism ✅ Done

Shipped in PR #6 (commit `52738b4`). ADR at `docs/adr/0001-collaboration-consistency.md`, event schema at `backend/app/events/schema.py`, snapshot service inside `backend/app/services/session_service.py`, reconnect protocol in `backend/app/websocket/handler.py` + `frontend/src/services/websocket.ts`, determinism + reconnect tests under `backend/tests/`.

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

### Lanes

| Lane ID | Tasks | Allowed files | Entry condition |
|---|---|---|---|
| `storyB-contracts` | B.9 (schema-only slice) | `backend/app/services/agent/schemas.py` (new) — the Pydantic args/result models for all six tools | Story A merged |
| `storyB-tools` | B.3–B.8, B.10 | `backend/app/services/agent/tools.py`, `backend/app/services/output_validator.py` (extension only), unit tests for each tool | `storyB-contracts` merged |
| `storyB-orchestrator` | B.1, B.2, B.11, B.12 | `backend/app/services/agent/orchestrator.py`, `backend/app/services/agent/context.py`, `backend/app/api/agent.py`, repository extension for trace persistence, orchestrator unit tests | `storyB-contracts` merged |
| `storyB-ui` | B.13, B.14 | `frontend/src/components/agent/AgentTrace.tsx`, `frontend/src/features/agent/AgentPanel.tsx`, their tests | `storyB-orchestrator` merged (needs the API shape locked) |

Run order: contracts → (tools ‖ orchestrator) → UI. Contracts is one small commit, then tools and orchestrator both proceed against the locked schema.

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

### Lanes

| Lane ID | Tasks | Allowed files | Entry condition |
|---|---|---|---|
| `storyC-backend` | C.1, C.2, C.6 (server side), C.7, C.8, C.9 | `backend/app/api/sessions.py`, `backend/app/services/session_service.py` (replay additions only), `backend/tests/integration/test_replay.py`, `backend/tests/property/test_replay.py`, `docs/replay.md` | Story A merged |
| `storyC-ui` | C.3, C.4, C.5, C.6 (client button) | `frontend/src/features/replay/Timeline.tsx`, `frontend/src/stores/replayStore.ts`, canvas read-only mode (call out the exact files in the lane brief), branch button component, their tests | `storyC-backend` merged (needs `GET …/events` and `POST …/branch` shapes) |

Run order: backend → UI. Story C runs in parallel with all of Story B.

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

Stories 0 and A are merged. Stories B and C run in parallel from here.

### Remaining story-level order

| Order | Story | Effort | Why this order |
|-------|-------|--------|----------------|
| ~~1~~ | ~~Story 0 — Simulator Rewrite~~ | ~~1 week~~ | ✅ Done (PR #6) |
| ~~2~~ | ~~Story A — Consistency & Determinism~~ | ~~1.5 weeks~~ | ✅ Done (PR #6) |
| 3a | Story C — Time-Travel Debugger | 1 week | Runs in parallel with B |
| 3b | Story B — ReAct Agent | 1.5 weeks | Runs in parallel with C |

Wall-clock remaining: **~1.5 weeks** with B and C overlapped.

### Concurrency view (remaining)

```
Week 1                    Week 1.5
┌──────────────────────────────────────┐
│ Story B (1.5w)                       │
│ ├ contracts                          │
│ ├ tools  ─┐                          │
│ ├ orch   ─┴──┐                       │
│ └ ui ────────┘                       │
├──────────────────────────────────────┤
│ Story C (1w)                         │
│ ├ backend ─┐                         │
│ └ ui ──────┘                         │
└──────────────────────────────────────┘
```

**Cost: $0/mo.**

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

---

## Lane Brief Template

Use this verbatim when handing a lane to a sub-agent. Fill the placeholders from the lane row.

```
You are working in worktree <worktree-path>, branch <lane-id>.

Spec: .kiro/specs/system-design-improvement/plan.md
Story: <Story 0 | A | B | C>
Tasks to close: <comma-separated task IDs>

Allowed files (touch nothing else):
- <file 1>
- <file 2>
- ...

Forbidden:
- Files outside the allowed list.
- Improving adjacent code, comments, or formatting.
- Adding TODOs.
- Speculative `Optional` fields.

Success criteria (loop until all green):
- All "Verify" entries for your task IDs are satisfied.
- Existing tests pass: `<backend cmd>` and `<frontend cmd>` as relevant.
- Story-level checkpoints your tasks contribute to are closed.

Commits:
- One commit per task ID. Message: "<task-id>: <summary>".
- Do not push. Do not open a PR.

When done:
- Print the list of commits and a one-line status per success criterion.
- Stop. The integration step is human-driven.
```
