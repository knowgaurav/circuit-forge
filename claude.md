# CircuitForge

Collaborative circuit design and robotics education platform with real-time multi-user collaboration and AI-powered course generation.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Zustand, Tailwind CSS, Vitest, fast-check (PBT)
- **Backend**: FastAPI, Python 3.11+, Pydantic v2, Motor (MongoDB async), httpx
- **Database**: MongoDB Atlas
- **LLM**: OpenAI-compatible API with tool calling for course generation
- **Testing**: Vitest (frontend), pytest + Hypothesis (backend)

## Project Structure

```
circuit-forge/
├── frontend/                 # Next.js 14 application
│   └── src/
│       ├── app/              # App Router pages
│       │   ├── courses/      # Course creation and level pages
│       │   ├── playground/   # Circuit playground
│       │   ├── session/      # Collaborative sessions
│       │   └── templates/    # Circuit templates
│       ├── components/
│       │   ├── circuit/      # Canvas, ComponentPalette, SimulationOverlay
│       │   └── ui/           # Reusable UI components
│       ├── constants/        # Component definitions, templates
│       ├── services/         # API client, WebSocket, simulation
│       ├── stores/           # Zustand state (circuit, session, ui)
│       └── hooks/            # Custom React hooks
├── backend/                  # FastAPI application
│   └── app/
│       ├── api/              # Route handlers (components, courses, sessions, health)
│       ├── models/           # Pydantic models (circuit, course, session, events)
│       ├── services/
│       │   ├── llm_service.py        # LLM integration with tool calling
│       │   ├── llm_tools.py          # Tool definitions and handlers
│       │   ├── component_registry.py # 40+ component definitions
│       │   ├── simulation_service.py # Circuit simulation engine
│       │   ├── circuit_service.py    # Circuit CRUD operations
│       │   ├── course_service.py     # Course management
│       │   └── session_service.py    # Real-time collaboration
│       ├── repositories/     # Data access layer
│       └── websocket/        # Real-time collaboration (broadcaster, handler, messages)
├── shared/schemas/           # JSON Schema definitions
├── .kiro/specs/              # Feature specifications
└── docker-compose.yml        # Local development
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
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Code Quality

**Frontend:**
```bash
npm run lint        # ESLint
npm test            # Vitest (single run)
npm run test:watch  # Vitest (watch mode)
```

**Backend:**
```bash
black app tests             # Format
ruff check app tests --fix  # Lint
mypy app                    # Type check
pytest                      # Test
pytest --cov=app            # Coverage
```

## Key Features

### LLM Tool Functions
The LLM service uses OpenAI-compatible tool calling for accurate circuit generation:
- `get_available_components` - Lists all 40+ components by category
- `get_component_schema` - Returns pin names, types, and connection rules
- `validate_blueprint` - Validates circuits before generation
- `get_circuit_state` - Gets current playground state for debugging

### Component Registry
Backend mirror of frontend components with:
- Pin definitions (name, type, position)
- Connection rules (what can connect to what)
- Example connection patterns
- Fuzzy search for suggestions

### Circuit Simulation
Real-time simulation engine supporting:
- Logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer)
- Input devices (switches, buttons, clock, DIP switches)
- Output devices (LEDs, 7-segment displays, motors)
- Flip-flops (D, SR, JK)
- Combinational circuits (MUX, decoder, adder, comparator)
- Sequential circuits (counter, shift register)

### Course Generation
AI-powered course creation:
- Generates 8-15 level course plans
- Creates theory and practical content per level
- Produces validated circuit blueprints
- Supports fallback mode for APIs without tool calling

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/components` | GET | List all components by category |
| `/api/components/{type}` | GET | Get component schema |
| `/api/courses` | POST | Create new course |
| `/api/courses/{id}` | GET | Get course details |
| `/api/courses/{id}/levels/{num}` | GET | Get level content |
| `/api/sessions` | POST | Create collaboration session |
| `/api/sessions/{code}` | GET | Get session by code |
| `/api/ws` | WS | WebSocket for real-time collaboration |
| `/api/health` | GET | Health check |

## Environment Variables

**Backend** (`.env`):
```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=circuitforge
CORS_ORIGINS=http://localhost:3000
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1/chat/completions
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7
```

**Frontend** (`.env`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Conventions

- Python: black formatting (88 line length), ruff linting, mypy strict mode
- TypeScript: ESLint with Next.js config
- API routes prefixed with `/api`
- WebSocket endpoint at `/api/ws`
- Async/await throughout backend codebase
- Pydantic v2 models with field aliases (snake_case ↔ camelCase)

## Feature Specs

Specs are located in `.kiro/specs/` and follow the requirements → design → tasks workflow:
- `circuit-forge/` - Core circuit editor
- `llm-course-generator/` - AI course generation
- `llm-tool-functions/` - LLM tool calling integration
- `session-management/` - Real-time collaboration
- `homepage-redesign/` - Landing page updates

## Testing

**Property-Based Testing:**
- Backend: Hypothesis for circuit serialization, schema validation
- Frontend: fast-check for component interactions

**Test Files:**
- `backend/tests/test_circuit_serialization.py` - Circuit round-trip tests
- `backend/tests/test_schema_version.py` - Schema version validation
- `frontend/src/services/*.test.ts` - Service unit tests
