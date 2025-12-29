# Project Structure

## DET Monorepo (`det-monorepo/`)

```
det-monorepo/
├── app/
│   ├── api/              # FastAPI backend (:8000)
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── api/v1/   # Versioned routes
│   │   │   ├── modules/  # Domain modules (auth, jobs, documents, tags)
│   │   │   └── models/   # Beanie ODM models
│   │   └── dockerfiles/
│   │
│   ├── frontend/         # Next.js web app (:3000)
│   │   └── src/
│   │       ├── app/      # App Router pages
│   │       ├── components/
│   │       ├── features/
│   │       ├── hooks/
│   │       └── lib/
│   │
│   ├── desktop/          # Electron app
│   │   ├── electron/     # Main process, IPC
│   │   └── src/          # Renderer (React)
│   │
│   ├── functions/        # Azure Durable Functions
│   │   ├── ingestion/    # Document/tag ingestion
│   │   ├── upload/       # Upload orchestration
│   │   ├── process/      # Job processing
│   │   └── validation/   # Trie-based validation
│   │
│   ├── workers/          # Processing workers
│   │   ├── cpu-worker/   # PDF, OCR, tag extraction
│   │   └── gpu-worker/   # YOLO, LLM OCR
│   │
│   └── collector/        # OpenTelemetry (local dev)
│
├── packages/             # Shared Python packages
│   └── src/
│       ├── det_config/      # Settings, logging
│       ├── det_contracts/   # Pydantic models (no deps)
│       ├── det_domain/      # Beanie models, repos, services
│       ├── det_clients/     # Azure SDK adapters
│       ├── det_telemetry/   # OpenTelemetry
│       ├── det_exceptions/  # Custom exceptions
│       ├── det_utils/       # Utilities
│       └── det_workers/     # Worker base classes
│
└── docs/                 # Architecture docs
```

## Package Dependency Rules
- `det_contracts` → imports nothing (pure models)
- `det_config`, `det_utils` → no imports from `det_clients` or `det_domain`
- `det_clients` → may import config, utils, exceptions, contracts
- `det_domain` → may import all above packages
- `det_telemetry` → may import `det_config` only

## Other Projects

### det-scripts/
Worker implementations and utility scripts for DET.

### Algozenith/
Competitive programming practice organized by topic:
- `DP/` — Dynamic programming (Bitmask, Digit, Tree DP)
- `Maths/` — Number theory, combinatorics
- `Strings/` — KMP, Manacher's algorithm
- `Trees/`, `Trie/` — Tree and trie problems
- `InterviewPracticeSet*/` — Interview prep problems

### Learning/
Various learning projects and templates.
