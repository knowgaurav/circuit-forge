# ADR 0001: Collaboration consistency model

Status: Accepted
Date: 2025-W21

## Context

CircuitForge is a real-time collaborative circuit editor. Multiple
participants in a session can add, move, delete, and wire components on
a shared canvas while a live simulation runs. The session also produces
an event log that downstream features (Story B's agent, Story C's
time-travel debugger) need to consume.

We need a consistency model that:

- Lets two participants edit at the same time without permanently
  diverging.
- Survives a brief WebSocket drop so the client can catch up without a
  hard reload.
- Produces an event log that is replayable, deterministic, and cheap to
  reconstruct from.

This ADR records the trade-offs we accepted and the wire format Stories A,
B, and C share.

## Decision

We use a **host-authoritative event log** with **monotonic per-session
sequence numbers** and a **snapshot-every-N replay strategy**.

### Ordering: host-authoritative, monotonic seq

Every state-mutating action becomes a `CircuitEvent` (see
`backend/app/events/schema.py`). The server is the single arbiter of
ordering. When it accepts an event it stamps it with the next `seq` for
that session — strictly greater than the latest stored seq. The repository
enforces this with two layers:

- **App-level pre-check**: `EventRepository.append_event` reads
  `get_latest_seq(session_id)` and raises `EventOrderError` (seq <
  latest) or `EventDuplicateError` (seq == latest) before insert.
- **MongoDB unique compound index** on `(sessionId, seq)`. A racing
  insert of the same seq surfaces as `DuplicateKeyError` and is
  re-raised as `EventDuplicateError`.

`CircuitState.version` is set to the latest applied `event.seq`. The
field is named `version` because it describes the *rebuilt state*, not
the events; events use `seq`.

### Reconnect protocol: delta or snapshot

A reconnecting client passes its last-applied seq as a query parameter:

```
ws://.../api/ws/{code}/{participant_id}?last_seen_seq=N
```

The server picks one of two replies:

- `sync:delta` — when the latest snapshot's seq is `<= N`, so the gap is
  reconstructable from the event log alone:
  ```
  { "type": "sync:delta", "payload": { "fromSeq": N, "events": [...] } }
  ```
  The client folds these events into its local state in seq order.

- `sync:state` — full snapshot fallback. Sent when no `last_seen_seq` is
  provided, or when the latest snapshot is newer than the client's seq
  (so the events alone wouldn't carry the lost prefix).

This is the only place we trade a round-trip's worth of bytes for
correctness on reconnect, and it's the simplest protocol that gets us
the deal we want: a transient drop never forces the client to re-fetch
the whole circuit.

### Snapshots

`SNAPSHOT_INTERVAL = 50`. Every 50th event triggers a snapshot of the
rebuilt state (`backend/app/services/session_service.py`,
`CircuitService._maybe_create_snapshot`). `get_circuit_state` always
starts from the latest snapshot and replays only events after that
snapshot's seq. Branching (Story C) and reconnect deltas use the same
machinery.

### Determinism

`CircuitService._apply_event` is a pure function of `(state, event)` —
no clock reads, no random sources, no IO. Two replays of the same log
produce byte-identical state (modulo `state.updated_at`, which is
intentionally kept as wallclock metadata and is ignored in determinism
comparisons). The Hypothesis property test
(`backend/tests/property/test_determinism.py`) exercises this at 1000
random examples per property:

- **A.7**: replay(log) == replay(log).
- **A.8**: folding events one-by-one through a serialization round-trip
  matches folding them in a single batch — i.e. `_apply_event` carries
  no hidden state outside its inputs.

## Why not CRDTs

CRDTs (Yjs, Automerge) buy you offline edits and partition tolerance at
a non-trivial cost:

- The state model has to become commutative. Wire connections, pin
  validation, and component ids stop being simple "remove this id"
  operations and become tombstone graphs. The simple `state.wires =
  [w for w in state.wires if w.id != wire_id]` we have today doesn't
  exist in CRDT-land.
- We'd have to debug merge conflicts that look correct in isolation but
  produce nonsensical circuits (two adders merged into one, an output
  pin with two wires to the same input).
- We give up the linear event log — the thing Story C builds the
  time-travel UI on top of, and the thing the agent in Story B reads
  to summarize a session.

CRDTs make sense for free-text documents and Figma-style designs where
the "correct" merge is "show both contributions." Circuits aren't like
that — there's a right answer to "what does this gate output?" and
host-authoritative ordering gives it to us. The cost we pay is no offline
edits and no multi-master partition tolerance, neither of which our
educational use case needs.

## Why not LWW-only

Last-writer-wins on a per-field basis would be cheap but loses ordering
information that Story B and C depend on. With LWW you can answer "what
does the canvas look like now" but not "what did Alice change between
seq 17 and seq 24" or "rewind to before Bob deleted that wire."
Snapshot+log is more memory than LWW but it's the prerequisite for
replay/branching.

## What we give up

- **Offline edits.** A client that loses connectivity can buffer
  intent, but cannot apply edits to its own copy and resync them later.
  Edit attempts during a disconnect surface as transport errors. The
  reconnect protocol catches up *received* state, not *outgoing* edits.
- **Multi-region / partition tolerance.** Single host owns the seq.
  Hosting it twice would mean reconciling two seq streams; we don't.
- **Sub-100ms cross-tab convergence on conflicts.** When two clients
  edit the same component at the same instant, both events get a seq
  but we don't synthesize a "merged" intermediate. The latter event
  wins on the field it touches. For our use case this is the desired
  behavior.

## Snapshot reconstruction cost

Measured on a quiet local Apple Silicon machine using
`backend/scripts/bench_replay.py`. The benchmark uses an in-memory
Mongo fake so the numbers are *replay logic only*, not network round
trips.

| Scenario                                              | Median  | p95     |
| ----------------------------------------------------- | ------- | ------- |
| 100 events, no snapshot (full replay from zero)       | 0.46 ms | 0.54 ms |
| Snapshot at seq=50, 49 events to replay (steady)      | 0.42 ms | 0.48 ms |
| Snapshot at seq=100, 0 events (right after snapshot)  | 0.36 ms | 0.44 ms |

The take-away is that with `SNAPSHOT_INTERVAL = 50`, replay is bounded
to at most ~50 events of work per `get_circuit_state` call and runs
well under one millisecond at this scale. Mongo round-trips dominate in
practice; that's the right thing for the snapshot policy to optimize
for.

## Consequences

- Stories B and C can rely on `seq` being a stable, gap-free integer
  per session that uniquely identifies a state version.
- Reconnect logic on the client is a `switch` over the
  `'sync:state' | 'sync:delta'` discriminator. No diff/patch library
  needed.
- Renaming `version → seq`, `session_code → session_id`,
  `user_id → actor_id` in the event schema is a one-way rip (we own
  every caller). The old fields are gone from the codebase entirely.

## See also

- `backend/app/events/schema.py` — event schema, single source of truth.
- `backend/app/repositories/event_repository.py` — write-path
  enforcement and snapshot storage.
- `backend/app/services/circuit_service.py` —
  `_apply_event`, `_maybe_create_snapshot`, `get_circuit_state`.
- `backend/app/websocket/handler.py` — `_send_initial_sync` picks the
  delta vs snapshot reply.
- `backend/tests/property/test_determinism.py` — A.7 and A.8 properties.
- `backend/tests/integration/test_reconnect.py` — A.9 end-to-end
  reconnect scenario.
