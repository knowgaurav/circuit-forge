# CircuitForge Backend

FastAPI backend for the CircuitForge collaborative circuit design tool.

## Features

- Real-time WebSocket collaboration
- Session management with unique codes
- Circuit state management with event sourcing
- Permission-based edit control
- Circuit simulation engine

## Running Locally

```bash
# Install dependencies
pip install -e .

# Run the server
uvicorn app.main:app --reload
```

## API Endpoints

- `POST /api/sessions` - Create a new session
- `GET /api/sessions/{code}` - Get session info
- `POST /api/sessions/{code}/join` - Join a session
- `GET /api/sessions/{code}/circuit` - Get circuit state
- `POST /api/sessions/{code}/export/json` - Export circuit as JSON
- `POST /api/sessions/{code}/import` - Import circuit from JSON

## WebSocket

Connect to `/ws/{session_code}/{participant_id}` for real-time collaboration.
