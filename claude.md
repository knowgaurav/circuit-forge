# CircuitForge

Collaborative circuit design and robotics education platform with real-time multi-user collaboration.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Zustand, Tailwind CSS, Vitest
- **Backend**: FastAPI, Python 3.11+, Pydantic v2, Motor (MongoDB async)
- **Database**: MongoDB Atlas
- **LLM**: OpenAI-compatible API for course generation

## Project Structure

```
circuit-forge/
├── frontend/           # Next.js 14 application
│   └── src/
│       ├── app/        # App Router pages
│       ├── components/ # React components
│       ├── services/   # API client services
│       ├── stores/     # Zustand state stores
│       └── hooks/      # Custom React hooks
├── backend/            # FastAPI application
│   └── app/
│       ├── api/        # Route handlers
│       ├── models/     # Pydantic models
│       ├── services/   # Business logic
│       ├── repositories/ # Data access
│       └── websocket/  # Real-time collaboration
├── shared/schemas/     # JSON Schema definitions
└── docker-compose.yml  # Local development
```

## Development

### Quick Start (Docker)

```bash
docker-compose up -d
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Code Quality

**Frontend:**
```bash
npm run lint        # ESLint
npm test            # Vitest
```

**Backend:**
```bash
black app tests             # Format
ruff check app tests --fix  # Lint
mypy app                    # Type check
pytest                      # Test
pytest --cov=app            # Coverage
```

## Key Services

| Service | Purpose |
|---------|---------|
| `circuit_service.py` | Circuit CRUD and operations |
| `llm_service.py` | LLM-powered course generation with tool functions |
| `component_registry.py` | 60+ electronic components across 11 categories |
| `session_service.py` | Real-time collaboration sessions |
| `simulation_service.py` | Circuit simulation engine |
| `course_service.py` | Course management and level progression |

## Environment Variables

**Backend** (`.env`):
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DATABASE` - Database name
- `CORS_ORIGINS` - Allowed origins
- `OPENAI_API_KEY` - LLM API key
- `OPENAI_BASE_URL` - LLM endpoint
- `OPENAI_MODEL` - Model name (e.g., gpt-4o)

**Frontend** (`.env`):
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL

## Conventions

- Python: black formatting (88 line length), ruff linting, mypy strict mode
- TypeScript: ESLint with Next.js config
- API routes prefixed with `/api`
- WebSocket endpoint at `/api/ws`
- Async/await throughout backend codebase
