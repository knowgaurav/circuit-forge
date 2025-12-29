# CircuitForge

A collaborative circuit design and robotics education platform built with Next.js and FastAPI.

## Features

- Real-time multi-user collaboration via WebSockets
- 60+ electronic components across 11 categories
- 30+ educational templates with Learning and Implementation modes
- Circuit simulation with signal visualization
- Freehand annotations for teaching
- Session-based collaboration (no accounts required)

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Zustand, Tailwind CSS
- **Backend**: FastAPI, Python 3.11+, Pydantic v2
- **Database**: MongoDB Atlas
- **Deployment**: Azure Container Apps

## Project Structure

```
circuit-forge/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── shared/            # Shared type definitions (JSON Schema)
├── docker-compose.yml # Local development setup
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose (for local development)

### Local Development with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Manual Setup

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Development

### Code Quality

**Frontend:**
```bash
npm run lint
npm run type-check
```

**Backend:**
```bash
black app tests
ruff check app tests --fix
mypy app
```

### Testing

**Frontend:**
```bash
npm test
```

**Backend:**
```bash
pytest
pytest --cov=app
```

## License

MIT
