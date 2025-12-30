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