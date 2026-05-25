# Inter-story contracts

These are the API surfaces sub-agents agree on so Stories 0/A/B/C compose without
bikeshedding. **If you are a sub-agent and need to deviate, stop and surface the
deviation in your report instead of silently changing the contract.**

---

## Story 0 — Simulator engine surface

File: `backend/app/services/simulation_engine.py` (≤ 200 LOC)

```python
class Signal(str, Enum):
    HIGH = "1"
    LOW  = "0"
    X    = "X"   # unknown / cycle / floating

@dataclass
class ComponentState:
    outputs: dict[str, Signal]          # pin_id -> signal
    internal: dict[str, Any]            # FF Q, counter count, prev_clk, etc.

class SimulationEngine:
    pin_values: dict[str, Signal]       # "comp_id:pin_id" -> signal
    states: dict[str, ComponentState]   # comp_id -> state

    def load_circuit(self, circuit: CircuitState) -> None: ...
    def run(self) -> None: ...                                # one full evaluation pass (topo-sort)
    def evaluate(self) -> None: ...                           # alias of run(); preferred name for new callers
    def toggle_switch(self, component_id: str) -> None: ...   # flips SWITCH_TOGGLE then re-evaluates
    def set_input(self, component_id: str, value: bool) -> None: ...  # sets SWITCH_*/PUSH and re-evaluates
    def tick_clock(self, component_id: str) -> None: ...      # advances CLOCK by one half-period and re-evaluates
    def get_wire_states(self) -> dict[str, str]: ...          # wire_id -> signal.value
    def get_pin_states(self) -> dict[str, dict[str, str]]: ... # comp_id -> pin_id -> signal.value
    def _compute_outputs(self, comp: CircuitComponent, inputs: dict[str, Signal], state: ComponentState) -> dict[str, Signal]: ...
```

- Combinational: AND/OR/NOT/NAND/NOR/XOR/XNOR/BUFFER, MUX, decoders, adders,
  comparators, BCD_TO_7SEG. Pure functions of inputs.
- Stateful: D/JK/T flip-flop, SR_LATCH, COUNTER_4BIT, SHIFT_REGISTER_8BIT, CLOCK.
  Outputs reflect previous internal state; `tick_clock`/clock-edge updates state.
- Three-valued logic: `0 AND X = 0`, `1 OR X = 1`, otherwise `X` propagates.
- Combinational cycle = error. Affected nodes return `Signal.X`. No iterative
  convergence. (Latches via gate feedback are out of scope; use `SR_LATCH`.)
- Banned identifiers in the new file: `Event`, `heapq`, `step()`, `run_until()`,
  per-gate `delay`. Do not re-introduce a discrete-event scheduler.
- The frontend has the same surface but expressed in TS:

File: `frontend/src/features/simulation/engine.ts`

```ts
export type Signal = '0' | '1' | 'X';

export class SimulationEngine {
  loadCircuit(circuit: CircuitState): void;
  run(): void;
  toggleSwitch(componentId: string): void;
  setInput(componentId: string, value: boolean): void;
  tickClock(componentId: string): void;
  getWireStates(): Record<string, Signal>;
  getPinStates(): Record<string, Record<string, Signal>>;
}
```

- Frontend total simulation module (engine + evaluator helpers + types) must be
  ≤ 500 LOC across `frontend/src/features/simulation/`.
- `frontend/src/services/simulation.ts` is **deleted** at the end of Story 0.
  All consumers re-import from `@/features/simulation`.
- For backwards compatibility with consumers that still expect `'HIGH' | 'LOW' |
  'UNDEFINED' | 'ERROR'`, expose a thin `toLegacySignalState(s: Signal): 'HIGH' |
  'LOW' | 'UNDEFINED'` only if needed inside `features/simulation`. **Prefer
  migrating consumers to the `'0' | '1' | 'X'` representation.** The wire color
  helpers (`getWireColor`, `getLedColor`) move with the consumer file
  `SimulationOverlay.tsx`; update them to take `Signal`.

---

## Story 0 — Cross-engine parity test

File: `backend/tests/property/test_engine_parity.py`
Harness: `frontend/scripts/dump-engine-output.ts` (CLI: `tsx scripts/dump-engine-output.ts <circuit.json>` → stdout JSON `{pinStates, wireStates}`).

- Hypothesis strategy generates valid `CircuitState` with up to 8 components,
  acyclic wiring, only combinational gates + LEDs + CONST_HIGH/LOW/SWITCH_TOGGLE.
- Property: backend `SimulationEngine.run()` and frontend
  `SimulationEngine.run()` produce identical `pin_states`/`wire_states` when run
  on the same circuit + same switch toggles.
- Test runs the frontend harness via `subprocess.run([npx, tsx, ...])` and
  compares JSON output. Skip with `pytest.skip()` if `npx`/`node` is unavailable
  in CI; do **not** silently pass.
- 500 examples, `deadline=None`, `max_examples=500`,
  `suppress_health_check=[HealthCheck.too_slow]`.

---

## Story A — Event schema (single source of truth)

File: `backend/app/events/schema.py` (new module under existing
`backend/app/events/` package; current `backend/app/models/events.py` is
deleted, with all imports updated to point to the new module).

```python
class CircuitEventType(str, Enum):
    COMPONENT_ADDED = "COMPONENT_ADDED"
    COMPONENT_MOVED = "COMPONENT_MOVED"
    COMPONENT_DELETED = "COMPONENT_DELETED"
    WIRE_ADDED = "WIRE_ADDED"
    WIRE_DELETED = "WIRE_DELETED"
    ANNOTATION_ADDED = "ANNOTATION_ADDED"
    ANNOTATION_DELETED = "ANNOTATION_DELETED"

class BaseEvent(BaseModel):
    seq: int = Field(ge=1)                        # monotonic per session_id
    session_id: str = Field(alias="sessionId")    # identifies the session (the 6-char code; aliased)
    actor_id: str = Field(alias="actorId")        # who emitted the event
    timestamp: datetime
    model_config = {"populate_by_name": True}

# Discriminated union over .type, with strict payload models per event.
CircuitEvent = Annotated[
    Union[ComponentAddedEvent, ComponentMovedEvent, ComponentDeletedEvent,
          WireAddedEvent, WireDeletedEvent,
          AnnotationAddedEvent, AnnotationDeletedEvent],
    Field(discriminator="type"),
]
```

- **Renames** vs. the old schema: `version → seq`, `session_code → session_id`
  (alias `sessionId`), `user_id → actor_id` (alias `actorId`).
- All payload sub-models keep their existing fields. No new optional fields.
- `CircuitState.version` (in `app/models/circuit.py`) **stays named `version`**
  — that's a property of the rebuilt state, not a property of an event. Service
  code does `state.version = event.seq` when applying.
- The frontend mirror (`frontend/src/types/index.ts`) is updated to match.
  Existing TS event consumers must compile clean.

### Event repository

File: `backend/app/repositories/event_repository.py`

```python
class EventOrderError(Exception): ...
class EventDuplicateError(Exception): ...

class EventRepository:
    async def append_event(self, event: CircuitEvent) -> None: ...
    # Rejects: seq <= last seq for that session_id (raises EventOrderError),
    # OR duplicate seq for that session_id (raises EventDuplicateError).
    # Ensure a unique compound index on (sessionId, seq) at startup.

    async def get_events_since_seq(self, session_id: str, seq: int) -> list[dict[str, Any]]: ...
    async def get_all_events(self, session_id: str) -> list[dict[str, Any]]: ...
    async def get_latest_seq(self, session_id: str) -> int: ...    # 0 if none
    async def get_events_in_range(self, session_id: str, from_seq: int, to_seq: int) -> list[dict[str, Any]]: ...
    async def save_snapshot(self, session_id: str, seq: int, state: CircuitState) -> None: ...
    async def get_latest_snapshot(self, session_id: str) -> dict[str, Any] | None: ...
    async def get_snapshot_at_or_before_seq(self, session_id: str, seq: int) -> dict[str, Any] | None: ...
    async def delete_events_by_session(self, session_id: str) -> int: ...
    async def delete_snapshots_by_session(self, session_id: str) -> int: ...
```

The persisted document field name is `seq` (not `version`); existing
collections in dev are wiped — no migration tooling.

### Snapshot policy

`SNAPSHOT_INTERVAL = 50` lives in
`backend/app/services/session_service.py` (snapshot is created when the latest
seq is a multiple of 50). The trigger stays inside `circuit_service.py`'s
`_maybe_create_snapshot` for now — A.4 wires it through `session_service`
without ripping out `circuit_service`.

### Reconnect protocol (server side, A.5)

WS handler accepts an optional `last_seen_seq` query parameter on the WS path:

```
ws://.../api/ws/{code}/{participant_id}?trace_id=X&last_seen_seq=N
```

If `last_seen_seq` is provided AND the latest snapshot seq ≤ `last_seen_seq`,
server replies with a delta:

```jsonc
{
  "type": "sync:delta",
  "payload": { "fromSeq": N, "events": [/* events with seq > N */] }
}
```

Otherwise (snapshot newer than `last_seen_seq`, or no `last_seen_seq` given),
server replies with the existing `sync:state` carrying the full circuit and
participants. The client is responsible for reading `circuit.version` as the
seq it has caught up to.

### Frontend reconnect handling (A.6)

`frontend/src/services/websocket.ts` accepts a `lastSeenSeq?: number` on
`connect()` and passes it as the `last_seen_seq` query parameter. The
`@/types` `ServerMessage` union gains:

```ts
| { type: 'sync:delta'; payload: { fromSeq: number; events: CircuitEvent[] } }
```

The session store applies events sequentially and bumps `circuit.version`.

---

## Story B — Agent surface

File layout:
- `backend/app/services/agent/__init__.py`
- `backend/app/services/agent/orchestrator.py`  — ReAct loop
- `backend/app/services/agent/context.py`       — sliding-window context
- `backend/app/services/agent/tools.py`         — six tools, Pydantic args
- `backend/app/api/agent.py`                    — `POST /api/agent/turn`
- `backend/app/repositories/agent_trace_repository.py` — trace persistence

Endpoint:

```
POST /api/agent/turn
{
  "session_id": "ABC123",
  "actor_id": "<participant_id>",
  "message": "...",
  "provider_id": "openai",
  "api_key": "...",
  "model": "gpt-4o-mini"
}
->
{
  "trace": [
    { "kind": "thought", "text": "..." },
    { "kind": "tool_call", "tool": "...", "args": {...} },
    { "kind": "tool_result", "tool": "...", "result": {...}, "is_error": false },
    ...
  ],
  "final_message": "...",
  "tokens_in": 0,
  "tokens_out": 0,
  "iterations": 0,
  "aborted": false,
  "abort_reason": null
}
```

Tool surface (Pydantic args, all required unless noted; no `Optional`):

| Tool | Args | Returns |
|---|---|---|
| `get_circuit_state` | `session_id: str` | `{components, wires}` |
| `simulate` | `session_id: str, ticks: int` (ticks=0 means evaluate only) | `{pin_states, wire_states, errors}` |
| `add_component` | `session_id: str, actor_id: str, component_type: str, label: str, position: {x,y}` | `{component_id, seq}` |
| `remove_component` | `session_id: str, actor_id: str, component_id: str` | `{seq}` |
| `validate_circuit` | `session_id: str` | `{floating_inputs, output_conflicts, combinational_cycles}` |
| `explain_signal_path` | `session_id: str, from_id: str, to_id: str` | `{path: [{component_id, pin_id, signal}], reachable: bool}` |

- `simulate` uses `SimulationEngine.run()` from Story 0.
- `add_component`/`remove_component` route through `CircuitService` so a real
  event hits the event log (Story A). They emit `seq` from the event's `seq`.
- Output validator (`output_validator.py`) gains `validate_component_against_registry`
  and `validate_pin_names_against_registry`. Failing returns a **structured
  error** dict that the orchestrator feeds back into the next iteration:
  ```python
  {"error": "INVALID_PIN", "tool": "...", "details": "..."}
  ```
  This counts against the iteration budget.
- Hard caps: max 6 iterations, 4k input tokens, 1k output tokens. Abort with
  structured error in `final_message="<aborted>"`, `aborted=true`.

---

## Story C — Time-travel surface

Endpoints (added to `backend/app/api/sessions.py`):

```
GET  /api/sessions/{code}/events?from_seq=&to_seq=
  -> { events: [...], snapshot: { seq, state } | null }

POST /api/sessions/{code}/branch?from_seq=N
  -> { code, participantId }   # new session pre-seeded with state-at-seq N
```

Service:

```python
class SessionService:
    async def get_state_at(self, session_id: str, seq: int) -> CircuitState: ...
    async def branch_session(self, source_session_id: str, from_seq: int) -> tuple[Session, str]: ...
```

`get_state_at` MUST use `event_repository.get_snapshot_at_or_before_seq` plus
`get_events_in_range` to be O(SNAPSHOT_INTERVAL + delta). No full replay from
seq 0.

Frontend:
- `frontend/src/stores/replayStore.ts` — Zustand: `seq`, `state`, `setSeq(n)` (debounced 100 ms fetch).
- `frontend/src/features/replay/Timeline.tsx` — slider, ticks per event.
- Read-only canvas mode: an explicit `replay: boolean` flag in the canvas
  store; the existing canvas refuses interactions when true and renders the
  replayed state. Local simulation runs against the replayed state via the new
  Story 0 engine.

---

## Working agreements echoed

- Use the shared `Signal` enum names. Don't reintroduce
  `'HIGH' | 'LOW' | 'UNDEFINED' | 'ERROR'` strings into new code.
- Use the shared event field names (`seq`, `session_id`, `actor_id`).
  Don't use `version`, `session_code`, `user_id` in new event-related code.
- No defensive `Optional` fields. No backwards-compat shims for callers we own.
- Tests are added with the feature, not after.
