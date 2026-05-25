# Backend Testing Setup - Design Document

## Architecture Overview

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Shared fixtures, async setup
│   ├── factories.py             # Test data factories
│   │
│   ├── unit/                    # Unit tests (mocked dependencies)
│   │   ├── __init__.py
│   │   ├── test_simulation_engine.py
│   │   ├── test_simulation_service.py
│   │   ├── test_session_service.py
│   │   └── test_circuit_service.py
│   │
│   ├── integration/             # Integration tests (real components)
│   │   ├── __init__.py
│   │   ├── test_sessions_api.py
│   │   ├── test_courses_api.py
│   │   └── test_health_api.py
│   │
│   └── (existing files)
│       ├── test_circuit_serialization.py
│       ├── test_llm_providers.py
│       ├── test_prompt_guard.py
│       └── test_schema_version.py
│
.github/
└── workflows/
    └── test.yml                 # CI workflow for PR testing
```

---

## Component Design

### 1. Test Configuration (conftest.py)

```python
# Key fixtures needed:
- mock_database: AsyncMock of AsyncIOMotorDatabase
- mock_session_repo: Mocked SessionRepository
- mock_event_repo: Mocked EventRepository
- test_client: FastAPI TestClient for API tests
- sample_circuit_state: Pre-built CircuitState for testing
- sample_session: Pre-built Session for testing
```

### 2. CI/CD Workflow Design

```yaml
# .github/workflows/test.yml
name: Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Python 3.11
      - Install uv
      - Cache dependencies
      - Install dependencies
      - Run pytest with coverage

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Node 20
      - Cache npm
      - Install dependencies
      - Run vitest
```

### 3. SimulationEngine Test Design

The SimulationEngine is pure logic with no external dependencies - ideal for unit testing.

**Test Categories:**
1. Logic gate truth tables (AND, OR, NOT, NAND, NOR, XOR, XNOR)
2. Sequential element behavior (D flip-flop, SR latch, JK flip-flop)
3. Signal propagation through wires
4. Clock tick behavior
5. Counter and shift register operations

**Example Test Structure:**
```python
class TestLogicGates:
    def test_and_gate_truth_table(self):
        # Test all input combinations for AND gate
        
    def test_or_gate_truth_table(self):
        # Test all input combinations for OR gate
        
class TestSequentialElements:
    def test_d_flipflop_rising_edge(self):
        # Test D flip-flop captures on rising edge
        
class TestSignalPropagation:
    def test_signal_propagates_through_wire(self):
        # Test that output changes propagate to connected inputs
```

### 4. SimulationService Test Design

**Test Categories:**
1. Circuit validation (floating inputs, output conflicts)
2. Topological sorting (cycle detection)
3. Gate evaluation order
4. Input device initialization

### 5. SessionService Test Design

**Test Categories:**
1. Session creation (unique code generation)
2. Session joining (participant creation, color assignment)
3. Participant management (active/inactive status)
4. Display name validation

**Mocking Strategy:**
- Mock repositories to isolate service logic
- Use AsyncMock for async repository methods

### 6. API Test Design

**Using FastAPI TestClient:**
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_session():
    response = client.post("/api/sessions")
    assert response.status_code == 200
    assert "code" in response.json()
```

---

## Test Data Factories

```python
# factories.py
class CircuitFactory:
    @staticmethod
    def create_component(type: str, id: str = None) -> CircuitComponent:
        ...
    
    @staticmethod
    def create_wire(from_comp: str, to_comp: str) -> Wire:
        ...
    
    @staticmethod
    def create_simple_circuit() -> CircuitState:
        """Creates a basic circuit: Switch -> AND -> LED"""
        ...

class SessionFactory:
    @staticmethod
    def create_session(code: str = None) -> Session:
        ...
    
    @staticmethod
    def create_participant(session_code: str) -> Participant:
        ...
```

---

## Correctness Properties

### Property 1: Logic Gate Truth Tables
For any logic gate, the output SHALL match the expected truth table for all input combinations.

### Property 2: Signal Propagation Consistency
For any circuit, after simulation stabilizes, wire states SHALL be consistent with their source component outputs.

### Property 3: Session Code Uniqueness
For any session creation, the generated code SHALL be unique across all existing sessions.

### Property 4: Topological Sort Validity
For any acyclic circuit, topological sort SHALL produce an ordering where all inputs are evaluated before their dependent outputs.

### Property 5: Display Name Validation
For any display name, validation SHALL accept only alphanumeric characters and spaces, length 3-20.

---

## Dependencies

### New Dev Dependencies (already in pyproject.toml)
- pytest >= 7.4.0
- pytest-asyncio >= 0.23.0
- hypothesis >= 6.92.0

### Additional Recommended
- pytest-cov (coverage reporting)
- httpx (for async API testing if needed)

---

## Implementation Phases

### Phase 1: Foundation (Fix + CI)
1. Fix failing tests (remove megallm/agentrouter references)
2. Create GitHub Actions workflow
3. Create conftest.py with basic fixtures

### Phase 2: Simulation Tests
1. SimulationEngine unit tests (logic gates)
2. SimulationService unit tests (validation, sorting)

### Phase 3: Service Tests
1. SessionService unit tests
2. CircuitService unit tests (with mocked repos)

### Phase 4: API Tests
1. Session API integration tests
2. Course API integration tests
3. Health endpoint test

---

## Branch Protection Setup (Manual)

After CI is working, configure in GitHub:
1. Go to Settings > Branches > Branch protection rules
2. Add rule for `main`
3. Enable "Require status checks to pass before merging"
4. Select the test jobs as required checks
