# CircuitForge

A collaborative circuit design and robotics education platform with real-time multi-user collaboration, AI-powered course generation, and comprehensive circuit simulation.

## Features

### Core Features
- **Real-time Collaboration**: Multi-user circuit editing via WebSockets with session-based collaboration (no accounts required)
- **Circuit Simulation**: Real-time signal propagation with visual feedback for logic gates, flip-flops, and sequential circuits
- **AI-Powered Course Generation**: LLM integration with tool calling for generating structured educational courses with validated circuit blueprints
- **Freehand Annotations**: Drawing tools for teaching and explanations

### Components Library (40+ Components)
| Category | Components |
|----------|------------|
| **Logic Gates** | AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer |
| **Input Devices** | Toggle Switch, Push Button, Clock, DIP Switch (4-bit), Numeric Input, VCC/GND Constants |
| **Output Devices** | LEDs (Red, Green, Blue, Yellow), 7-Segment Display, DC Motor |
| **Flip-Flops** | D Flip-Flop, SR Latch, JK Flip-Flop |
| **Combinational** | 2:1 Multiplexer, 2-to-4 Decoder, 4-bit Adder, 4-bit Comparator, BCD to 7-Segment Decoder |
| **Sequential** | 4-bit Counter, 8-bit Shift Register |
| **Power** | VCC +5V, VCC +3.3V, Ground |
| **Passive** | Resistor, Capacitor, Diode |
| **Connectors** | Wire Junction, Signal Probe |

### Educational Templates (30+)
- Learning mode with step-by-step explanations
- Implementation mode for hands-on practice
- Templates covering basic gates to complex sequential circuits

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Zustand, Tailwind CSS, Vitest, fast-check |
| **Backend** | FastAPI, Python 3.11+, Pydantic v2, Motor (MongoDB async), httpx |
| **Database** | MongoDB Atlas |
| **LLM** | OpenAI-compatible API with tool calling |
| **Deployment** | Azure Container Apps / Vercel + Render |

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
│       ├── api/              # Route handlers
│       ├── models/           # Pydantic models
│       ├── services/         # Business logic
│       │   ├── llm_service.py        # LLM integration with tool calling
│       │   ├── llm_tools.py          # Tool definitions and handlers
│       │   ├── component_registry.py # Component definitions
│       │   ├── simulation_service.py # Circuit simulation engine
│       │   └── session_service.py    # Real-time collaboration
│       ├── repositories/     # Data access layer
│       └── websocket/        # Real-time collaboration
├── shared/schemas/           # JSON Schema definitions
├── docker-compose.yml        # Local development
└── docker-compose.dev.yml    # Development with hot reload
```

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (recommended)

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
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
uv venv                       # or: python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"    # or: pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## How It Works

### Circuit Simulation Engine
1. **Signal Propagation**: Signals flow from input devices through components to outputs
2. **Component Evaluation**: Each component evaluates its inputs and produces outputs based on its logic (AND, OR, flip-flop state, etc.)
3. **State Management**: Sequential components (flip-flops, counters) maintain state across clock cycles
4. **Real-time Visualization**: Signal states displayed on wires and components with color-coded states

### Real-time Collaboration
1. **Session Creation**: Host creates a session and receives a unique 6-character code
2. **Participants Join**: Others join using the session code
3. **WebSocket Sync**: All changes (component add/remove, wire connections, property updates) broadcast to participants
4. **Conflict Resolution**: Server maintains authoritative state, clients sync on reconnect

### AI Course Generation
1. **Course Planning**: LLM generates 8-15 level curriculum based on topic
2. **Content Generation**: Each level includes theory explanations and practical exercises
3. **Circuit Blueprints**: LLM uses tool calling to create validated circuit designs
4. **Component Validation**: Blueprints validated against component registry before saving

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/components` | GET | List all components by category |
| `/api/components/{type}` | GET | Get component schema with pins |
| `/api/courses` | POST | Create new AI-generated course |
| `/api/courses/{id}` | GET | Get course details |
| `/api/courses/{id}/levels/{num}` | GET | Get level content |
| `/api/sessions` | POST | Create collaboration session |
| `/api/sessions/{code}` | GET | Get session by code |
| `/api/ws` | WebSocket | Real-time collaboration |
| `/api/health` | GET | Health check |

## Environment Variables

**Backend** (`.env`):
```env
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
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Development

### Code Quality

**Frontend:**
```bash
npm run lint        # ESLint
npm run type-check  # TypeScript
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

### Testing
- **Frontend**: Vitest + fast-check for property-based testing
- **Backend**: pytest + Hypothesis for circuit serialization and schema validation

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions using:
- **Free Tier**: Vercel (frontend) + Render (backend) + MongoDB Atlas
- **Production**: Azure Container Apps

## License

MIT
