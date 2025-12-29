# Technology Stack

## DET Monorepo (`det-monorepo/`)

### Frontend
- Next.js 15 (TypeScript, App Router)
- Tailwind CSS v4 + PostCSS
- Radix UI primitives (shadcn-style)
- Zustand (state), TanStack Query + axios (data fetching)
- Zod (validation), lucide-react (icons)

### Backend API
- Python 3.11, FastAPI, Pydantic v2
- Beanie ODM over MongoDB (Motor/PyMongo)
- Redis for caching

### Desktop
- Electron + Vite + React (TypeScript)

### Azure Functions
- Azure Durable Functions (Python)
- Orchestration for ingestion, upload, and processing workflows

### Workers
- CPU Worker: Python 3.11 + asyncio (PDF processing, OCR, tag extraction)
- GPU Worker: Python 3.11 + PyTorch + CUDA/ROCm (YOLO detection, LLM OCR)

### Infrastructure
- Azure Blob Storage, Service Bus, Web PubSub
- MongoDB (Azure Cosmos DB / MongoDB Atlas)
- OpenTelemetry for observability

### Package Manager
- Python: `uv` (recommended) or `pip`
- Node.js: `npm`

## Common Commands

### Local Infrastructure
```bash
docker run -d --name det-mongo -p 27017:27017 mongo:7
docker run -d --name det-redis -p 6379:6379 redis:7
```

### Backend API
```bash
cd det-monorepo/app/api
cp .env.example .env
docker compose --profile dev up --build
# Or local: uvicorn app.main:app --app-dir app/api --reload
```

### Frontend
```bash
cd det-monorepo/app/frontend
npm install && npm run dev
```

### Desktop
```bash
cd det-monorepo/app/desktop
npm install && npm run dev
```

### Azure Functions
```bash
cd det-monorepo/app/functions
func start
```

### Linting & Type Checking
```bash
# Python
cd det-monorepo/packages
ruff check .
ruff format .
mypy src

# Frontend/Desktop
npm run lint
npm run typecheck
```

## Algozenith (Competitive Programming)
- C++ for algorithm implementations
- No build system; individual `.cpp` files compiled as needed
