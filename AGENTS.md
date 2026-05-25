Must-Follow Development Principles
🚫 What NOT to Do
❌ Don't over-engineer — No defensive checks, complicated methods for type checking, unnecessary field or variables
❌ Don't add unused features or extreme edge cases — Build only what's specified
❌ Don't use multiple databases — Mongodb API using Cosmos DB with Beanie ODM only
❌ Don't create complex abstractions — Keep it direct and simple
❌ Don't optimize prematurely — Make it work first
❌ Don't leave TODOs — Complete everything
❌ Don't add validators or fallback behaviours “just in case” — we own every caller, so keep schemas and services strict and fill fields correctly at the source
❌ Don't mark arguments optional unless the flow truly allows omission — every parameter should be explicit and required by default

Remember:
Working > Perfect
Simple > Complex
Complete > Partial
Clear > Clever

🏗️ Development Principles
Keep It Simple, Stupid (KISS) and Don't Repeat Yourself (DRY)
No over-architecture — Build what's needed, not what might be needed
No premature optimization — Make it work, then make it fast (only if needed)
No complex abstractions — Direct, readable code over clever or complex patterns
Minimal files — Combine related logic, split only when it improves clarity


Behavioral guidelines
## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.