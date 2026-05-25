# Backend Testing Setup - Requirements

## Overview
Establish comprehensive testing infrastructure for the CircuitForge backend, including unit tests, integration tests, property-based tests, and CI/CD pipeline for automated test execution on PRs.

---

## User Stories

### 1. Test Infrastructure Setup
**As a** developer  
**I want** a well-organized test structure with proper fixtures and utilities  
**So that** I can write tests efficiently and consistently

#### Acceptance Criteria
- 1.1 Test directory structure follows Python best practices (conftest.py, fixtures, etc.)
- 1.2 Async test support is properly configured with pytest-asyncio
- 1.3 Database mocking/fixtures are available for repository tests
- 1.4 Common test utilities and factories are available for creating test data

---

### 2. CI/CD Pipeline for PR Testing
**As a** team lead  
**I want** automated tests to run on every PR and block merging if tests fail  
**So that** code quality is maintained and bugs don't reach main branch

#### Acceptance Criteria
- 2.1 GitHub Actions workflow runs backend tests on every PR to main
- 2.2 GitHub Actions workflow runs frontend tests on every PR to main
- 2.3 PR cannot be merged if tests fail (branch protection)
- 2.4 Test results are visible in PR checks
- 2.5 Workflow uses caching for faster execution

---

### 3. Critical Service Tests
**As a** developer  
**I want** comprehensive tests for critical business logic services  
**So that** core functionality is verified and regressions are caught

#### Acceptance Criteria
- 3.1 SessionService has unit tests for session creation, joining, and participant management
- 3.2 CircuitService has tests for event sourcing operations (add/move/delete components, wires)
- 3.3 SimulationEngine has tests for logic gate evaluation (AND, OR, NOT, NAND, NOR, XOR)
- 3.4 SimulationService has tests for circuit validation and topological sorting
- 3.5 CourseService has tests for course plan operations and enrollment

---

### 4. API Endpoint Tests
**As a** developer  
**I want** integration tests for API endpoints  
**So that** HTTP interface contracts are verified

#### Acceptance Criteria
- 4.1 Session API endpoints have tests (create, join, get session info)
- 4.2 Course API endpoints have tests (suggestions, generate plan, enroll)
- 4.3 Health endpoint has a basic test
- 4.4 Error responses are tested for invalid inputs

---

### 5. Fix Existing Test Failures
**As a** developer  
**I want** all existing tests to pass  
**So that** the test suite is reliable

#### Acceptance Criteria
- 5.1 Remove references to non-existent providers (megallm, agentrouter) from tests
- 5.2 All 111 tests pass without failures

---

## Critical Components Analysis

### High Priority (Core Business Logic)
| Component | File | Criticality | Current Coverage |
|-----------|------|-------------|------------------|
| SessionService | `session_service.py` | HIGH | ❌ None |
| CircuitService | `circuit_service.py` | HIGH | ❌ None |
| SimulationEngine | `simulation_engine.py` | HIGH | ❌ None |
| SimulationService | `simulation_service.py` | HIGH | ❌ None |
| CourseService | `course_service.py` | MEDIUM | ❌ None |

### Medium Priority (Data Layer)
| Component | File | Criticality | Current Coverage |
|-----------|------|-------------|------------------|
| SessionRepository | `session_repository.py` | MEDIUM | ❌ None |
| EventRepository | `event_repository.py` | MEDIUM | ❌ None |
| CourseRepository | `course_repository.py` | MEDIUM | ❌ None |

### Already Tested
| Component | File | Coverage |
|-----------|------|----------|
| PromptGuard | `prompt_guard.py` | ✅ Comprehensive |
| LLMProviders | `llm_providers.py` | ✅ Good (2 failures to fix) |
| CircuitSerialization | `circuit.py` | ✅ Property-based tests |
| SchemaVersion | `circuit.py` | ✅ Basic tests |

---

## Testing Strategy

### Test Types
1. **Unit Tests**: Isolated tests for individual functions/methods with mocked dependencies
2. **Integration Tests**: Tests that verify component interactions (API + Service + Repository)
3. **Property-Based Tests**: Hypothesis tests for invariants (already used for serialization)

### Test Priorities
1. **Phase 1**: Fix existing failures + CI/CD setup
2. **Phase 2**: SimulationEngine/SimulationService tests (pure logic, no DB)
3. **Phase 3**: Service layer tests with mocked repositories
4. **Phase 4**: API integration tests with TestClient

---

## Out of Scope
- Frontend testing (separate concern)
- Load/performance testing
- End-to-end browser testing
- WebSocket testing (complex, lower priority)
