# Backend Testing Setup - Implementation Tasks

## Phase 1: Foundation (Fix Existing + CI/CD)

- [x] 1. Fix existing test failures
  - [x] 1.1 Remove `megallm` and `agentrouter` from `OPENAI_COMPATIBLE_PROVIDERS` list in test_llm_providers.py
  - [x] 1.2 Update `test_provider_factory_returns_correct_strategies` to only test registered providers
  - [x] 1.3 Update `test_all_providers_are_supported` to match actual supported providers
  - [x] 1.4 Run tests to verify all 111 tests pass

- [x] 2. Create GitHub Actions CI workflow
  - [x] 2.1 Create `.github/workflows/test.yml` with backend test job
  - [x] 2.2 Add frontend test job to the workflow
  - [x] 2.3 Configure dependency caching for faster runs
  - [x] 2.4 Test workflow locally or via PR

- [x] 3. Setup test infrastructure
  - [x] 3.1 Create `backend/tests/conftest.py` with shared fixtures
  - [x] 3.2 Create `backend/tests/factories.py` with test data factories
  - [x] 3.3 Create `backend/tests/unit/__init__.py`
  - [x] 3.4 Create `backend/tests/integration/__init__.py`

---

## Phase 2: Simulation Tests (Pure Logic - No DB)

- [x] 4. SimulationEngine unit tests
  - [x] 4.1 Create `backend/tests/unit/test_simulation_engine.py`
  - [x] 4.2 Test AND gate truth table (all 4 input combinations)
  - [x] 4.3 Test OR gate truth table
  - [x] 4.4 Test NOT gate (inverter)
  - [x] 4.5 Test NAND, NOR, XOR, XNOR gates
  - [x] 4.6 Test D flip-flop rising edge capture
  - [x] 4.7 Test signal propagation through wires
  - [x] 4.8 Test 4-bit counter increment

- [x] 5. SimulationService unit tests
  - [x] 5.1 Create `backend/tests/unit/test_simulation_service.py`
  - [x] 5.2 Test floating input detection
  - [x] 5.3 Test output conflict detection
  - [x] 5.4 Test topological sort for valid circuit
  - [x] 5.5 Test cycle detection raises error
  - [x] 5.6 Test input device initialization (switches, constants)

---

## Phase 3: Service Layer Tests (Mocked Repos)

- [x] 6. SessionService unit tests
  - [x] 6.1 Create `backend/tests/unit/test_session_service.py`
  - [x] 6.2 Test session creation generates valid code
  - [x] 6.3 Test join session creates participant with correct role
  - [x] 6.4 Test display name validation (valid names)
  - [x] 6.5 Test display name validation (invalid names rejected)
  - [x] 6.6 Test color assignment cycles through available colors
  - [x] 6.7 Test rejoin with existing participant ID

- [x] 7. CircuitService unit tests
  - [x] 7.1 Create `backend/tests/unit/test_circuit_service.py`
  - [x] 7.2 Test add component creates event and updates state
  - [x] 7.3 Test delete component cascades to connected wires
  - [x] 7.4 Test wire validation (output to input only)
  - [x] 7.5 Test duplicate wire rejection
  - [x] 7.6 Test input pin already connected rejection

---

## Phase 4: API Integration Tests

- [x] 8. Session API tests
  - [x] 8.1 Create `backend/tests/integration/test_sessions_api.py`
  - [x] 8.2 Test POST /sessions creates session and returns code
  - [x] 8.3 Test GET /sessions/{code} returns session info
  - [x] 8.4 Test POST /sessions/{code}/join with valid name
  - [x] 8.5 Test POST /sessions/{code}/join with invalid name returns 400

- [x] 9. Health and misc API tests
  - [x] 9.1 Create `backend/tests/integration/test_health_api.py`
  - [x] 9.2 Test GET /health returns 200

---

## Verification

- [ ] 10. Final verification
  - [ ] 10.1 Run full test suite and verify all tests pass
  - [ ] 10.2 Create a test PR to verify CI workflow runs
  - [ ] 10.3 Document branch protection setup steps for manual configuration

---

## Notes

### Running Tests Locally
```bash
cd backend
source .venv/bin/activate
pytest -v                    # Run all tests
pytest tests/unit -v         # Run only unit tests
pytest -k "simulation" -v    # Run tests matching pattern
```

### Branch Protection (Manual Step)
After CI is working, go to GitHub repo Settings > Branches > Add rule:
- Branch name pattern: `main`
- ✅ Require status checks to pass before merging
- Select: `backend-tests`, `frontend-tests`
