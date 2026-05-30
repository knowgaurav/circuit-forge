# Requirements Document

## Introduction
Add a per-step AI tutor chatbot to the course level player so a learner building a circuit can ask the LLM for help ("I can't connect two items", "the circuit isn't working as expected"). The tutor can see the learner's current playground state, answer questions about the circuit and the lesson, and make changes to the board through tool calls.

This feature extends the existing agent harness under `backend/app/services/agent/` (ReAct orchestrator, sliding-window `AgentContext`, strict Pydantic `TOOL_SCHEMAS`, six tools routed through `CircuitService`). It does not rebuild it. Source of truth for the design is `.kiro/specs/in-course-ai-tutor/design.md`.

## Glossary
- **Harness**: the existing agent infrastructure (orchestrator ReAct loop, `AgentContext`, tool dispatch, `TOOLS`/`TOOL_SCHEMAS` registries) that drives an LLM through reason→act→observe cycles.
- **Tool**: a strict-Pydantic-typed function the LLM can call (e.g. `add_wire`) that reads or mutates the circuit via `CircuitService`.
- **Mode**: the active lesson tab — `theory` (read-only) or `practical` (build/edit).
- **Ephemeral session**: a throwaway, server-generated `tutor-<uuid>` `CircuitService` session seeded from the client snapshot for the duration of one turn, then discarded.
- **Snapshot**: the learner's current circuit (`CircuitState`: components + wires) sent from the browser `circuitStore` with each turn.
- **Mutation**: a structural circuit change (`COMPONENT_ADDED`/`MOVED`/`DELETED`, `WIRE_ADDED`/`DELETED`) emitted server-side and applied back into the local `circuitStore`.
- **Framing**: the compact, label-based text rendering of the board injected into the user turn so the LLM can "see" the circuit.
- **LevelContext**: the bounded projection of `LevelContent`/`PracticalSection` fed into the system prompt.

## Requirements

### Requirement 1: Circuit Connection & Movement Tools (R1)
**User Story:** As a learner building a circuit, I want the tutor to connect, disconnect, and reposition components for me, so that I can get unstuck when I can't wire two items together myself.

#### Acceptance Criteria
- 1.1 WHEN the LLM calls `add_wire` with a source label+pin and target label+pin, THEN the system SHALL connect them only if the resolved source pin is an OUTPUT and the resolved target pin is an INPUT, otherwise raise `ToolError("INVALID_WIRE_DIRECTION", ...)`.
- 1.2 WHEN the LLM calls `add_wire` targeting an input pin that already has an incoming wire, THEN the system SHALL reject the call with a structured `ToolError` (`INPUT_ALREADY_CONNECTED` / `DUPLICATE_WIRE`) and SHALL NOT create a second driver for that input.
- 1.3 WHEN the LLM references a component label or pin name that does not exist on the current board, THEN the system SHALL raise `ToolError("COMPONENT_NOT_FOUND" | "INVALID_PIN", ...)` instead of returning a 5xx.
- 1.4 WHEN the LLM calls `remove_wire` with an existing wire id, THEN the system SHALL delete the wire and return the resulting event `seq`.
- 1.5 WHEN the LLM calls `move_component` with an existing component id and a position, THEN the system SHALL reposition the component, return the event `seq`, and leave wiring topology unchanged.
- 1.6 The three new tools (`add_wire`, `remove_wire`, `move_component`) SHALL be registered in both `TOOL_SCHEMAS` and the `TOOLS` registry with strict Pydantic Args/Result schemas (no `Optional` fields), and SHALL route mutations through the existing `CircuitService`.
- 1.7 The new tools SHALL address pins by component label + registry pin name (not internal UUIDs), resolved server-side via a `_resolve_pin` helper.

---

### Requirement 2: Per-Step Chat Interface (R2)
**User Story:** As a learner working through a course level, I want a chat panel embedded in the level player that knows which step I'm on, so that I can ask context-aware questions at each point of the lesson.

#### Acceptance Criteria
- 2.1 The level player SHALL embed a `TutorChat` panel that is aware of the active lesson tab (`theory` or `practical`).
- 2.2 WHEN the learner sends a message, THEN the chat SHALL read the current circuit snapshot from `circuitStore` at send time and include it in the request.
- 2.3 WHEN the LLM provider is not configured at send time, THEN the chat SHALL open the existing `APIKeyModal` and SHALL NOT call the API.
- 2.4 WHILE a turn is pending, the chat SHALL disable the input and indicate the pending state.
- 2.5 The chat SHALL keep separate conversation threads per `(courseId, levelNumber, mode)` so switching tabs or levels does not mix conversations.
- 2.6 WHEN a turn returns `aborted=true`, THEN the chat SHALL surface a soft notice and retain the conversation, and SHALL still apply any mutations emitted during that turn.
- 2.7 The chat SHALL render the assistant `finalMessage` after each completed turn.

---

### Requirement 3: State Bridge — See & Change the Board (R3)
**User Story:** As a learner, I want the tutor to see exactly the circuit I have on screen and apply its edits back to my board, so that its help is grounded in my actual work and its changes appear in my playground.

#### Acceptance Criteria
- 3.1 WHEN a course turn is requested, THEN the backend SHALL seed an ephemeral server session (`tutor-<uuid>`) from the client snapshot such that reading the seeded state back reconstructs an equal board up to ids (same component types+labels, same connection set by label:pin).
- 3.2 WHEN the turn completes, THEN the response `mutations` SHALL exactly equal the seeded session's events with `seq > base_seq`, filtered to client-applicable structural types (`COMPONENT_ADDED`, `COMPONENT_MOVED`, `COMPONENT_DELETED`, `WIRE_ADDED`, `WIRE_DELETED`), in seq order.
- 3.3 WHEN the client receives `mutations`, THEN `TutorChat` SHALL apply each one to `circuitStore` using the existing store actions (`addComponent`, `moveComponent`, `deleteComponent`, `addWire`, `deleteWire`) with no new store mutators.
- 3.4 The `session_id` SHALL be server-generated, never client-supplied, so a request cannot point the agent at another session's event log.
- 3.5 WHEN a turn raises after seeding, THEN the ephemeral session SHALL be discarded (events + snapshots deleted, in-memory stacks cleaned) in a `finally` so no session leaks.
- 3.6 Seeding SHALL preserve client component ids and pins verbatim and store the client label in `properties["label"]`, so emitted wire/component events reference the same ids/pins the client already holds.
- 3.7 The `add_component` tool SHALL set `component.properties["label"] = args.label` so a `COMPONENT_ADDED` mutation the client applies carries its label.

---

### Requirement 4: Efficient LLM Use — Context, Tool Selection, System Prompt (R4)
**User Story:** As a product owner, I want the tutor to use the LLM efficiently with a bounded context, scoped tools, and a course-aware system prompt, so that responses are on-task, cheap, and reliable.

#### Acceptance Criteria
- 4.1 The tools offered to the LLM SHALL always be a subset of `select_tools(mode)`; on `theory` mode no mutation tool SHALL ever be offered (read-only set: `get_circuit_state`, `simulate`, `validate_circuit`, `explain_signal_path`), and on `practical` mode the full set SHALL be offered.
- 4.2 AFTER context windowing, `messages[0]` SHALL always be the system prompt, and the newest user turn (which carries the circuit framing) SHALL be retained whenever it fits the budget alone.
- 4.3 A turn SHALL never exceed the existing caps (6 iterations / 4000 input tokens / 1000 output tokens) before aborting with `aborted=true`, `final_message="<aborted>"`, and an `abort_reason`.
- 4.4 The system prompt SHALL be rebuilt each turn by `build_tutor_system_prompt(level, mode)` and SHALL include, in order: tutor role + harness description; level framing (title, objectives; on `practical` also components-needed, build steps, expected behavior, common mistakes); the names + one-line purpose of the tools available in this mode; and behavioral rules (don't invent component/pin names, address pins by label+pin name, prefer the smallest tool sequence, explain edits in plain language).
- 4.5 The circuit state SHALL be rendered into the newest user turn as a compact, deterministic text view using labels + pin names (never UUIDs) via `renderCircuitFraming`.
- 4.6 `Orchestrator.run_turn` SHALL accept a required `allowed_tools: set[str]` parameter used to scope `_tools_for_llm`; the existing `/agent/turn` caller SHALL pass `set(TOOL_SCHEMAS)` to preserve current behavior.
- 4.7 The `LevelContext` projected for the prompt SHALL include only the bounded fields the prompt needs (title, objectives, expected_behavior, components_needed, build_steps, common_mistakes) sourced from `LevelContent`/`PracticalSection`.

---

### Requirement 5: Course-Turn API & Client (R5)
**User Story:** As a frontend developer, I want a dedicated course-turn endpoint and a typed client method, so that the chat panel can run a tutor turn without disturbing the existing `/agent/turn` surface.

#### Acceptance Criteria
- 5.1 The backend SHALL expose `POST /api/agent/course-turn` accepting `CourseTurnRequest` (`actorId`, `message`, `courseId`, `levelNumber`, `mode`, `circuit`, `providerId`, `apiKey`, `model`) with camelCase aliases matching the existing `agent.py` convention.
- 5.2 The endpoint SHALL return `CourseTurnResponse` (`finalMessage`, `mutations`, `trace`, `tokensIn`, `tokensOut`, `iterations`, `aborted`, `abortReason`).
- 5.3 The existing `POST /api/agent/turn` endpoint and the six existing tool shapes SHALL remain unchanged.
- 5.4 The frontend SHALL add `api.agentCourseTurn(...)` and the corresponding response/message TypeScript types in `frontend/src/types/index.ts`.
- 5.5 The LLM provider/apiKey/model SHALL arrive per request and SHALL NOT be stored or logged server-side.

---

## Non-Functional Requirements

### Performance
- Snapshot send + seed is `O(components + wires)`; course circuits are small, so seeding is negligible next to the LLM round-trip.
- The snapshot interval (50) is never reached by a course circuit, so no snapshot writes occur.

### Security
- No server-side key storage; provider/apiKey/model passed straight to the provider strategy.
- Tools only operate on the ephemeral session seeded from the caller's own snapshot; they cannot read or mutate any real collaborative session.
- Untrusted model output is never executed; tool args are Pydantic-validated and client mutations are mapped through a fixed switch.

### Code Standards (per AGENTS.md)
- KISS/DRY, no over-engineering, no defensive fallbacks "just in case".
- MongoDB via Beanie/Cosmos only; no new databases.
- Strict schemas, no `Optional` shims, no TODOs; every parameter explicit and required unless the flow truly allows omission.
- Surgical changes — touch only what the feature requires.

---

## Testing Requirements

### Unit
- New tools (`add_wire`, `remove_wire`, `move_component`): happy path event+seq; failure paths raise correct `ToolError` codes.
- `_resolve_pin`, `build_tutor_system_prompt`, `select_tools`, `renderCircuitFraming`, and the course-turn handler ordering (seed → run → collect → discard).
- Frontend (`vitest`): `applyMutations` dispatch per event type; `tutorChatStore` thread keying; `TutorChat` opens `APIKeyModal` when unconfigured.

### Property-Based
- PBT-1 Seed/snapshot round-trip (Hypothesis).
- PBT-2 Wire-tool invariants — direction + single-driver (Hypothesis).
- PBT-3 Tool scoping (Hypothesis).
- PBT-4 Mutation mapping incl. idempotent re-apply (fast-check).
- PBT-5 Context windowing — system prompt retained, budget respected (Hypothesis).

### Integration
- End-to-end course-turn against a stubbed LLM provider emitting a scripted `add_wire`: response `mutations` contain `WIRE_ADDED` and the ephemeral session is gone afterward.

---

## Out of Scope
- Streaming responses (turns are request/response; the ReAct loop completes server-side).
- Converting the course playground into a collaborative websocket session (Option B in the design).
- Persisting tutor edits to a durable event store (the client store remains source of truth).
- Changes to the existing `/agent/turn` endpoint or the six existing tool shapes.

---

## Contract Note
Per `.kiro/specs/system-design-improvement/contracts.md` (Story B), this feature deliberately extends the documented Agent surface by adding three tools (`add_wire`, `remove_wire`, `move_component`), a second endpoint (`POST /api/agent/course-turn`), and a required `allowed_tools` parameter to `Orchestrator.run_turn`. The existing `/agent/turn` surface and the six tools' shapes are unchanged. This extension is flagged explicitly rather than changed silently.
