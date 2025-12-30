# Implementation Plan: LLM Tool Functions

## Overview

This plan implements OpenAI-compatible tool functions for the LLM to query component specifications and validate circuit blueprints, ensuring accurate circuit generation.

## Tasks

- [x] 1. Create Component Registry (Backend)
  - [x] 1.1 Create `backend/app/services/component_registry.py` with Pydantic models
    - Define `PinDefinition`, `ConnectionRule`, `ComponentDefinition` models
    - Include all fields: type, name, category, description, pins, connection_rules, example_connections
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Implement `ComponentRegistry` class with all component definitions
    - Mirror all components from `frontend/src/constants/components.ts`
    - Add connection rules for each component type
    - Add example connection patterns
    - _Requirements: 1.4, 9.1, 9.7_
  
  - [ ] 1.3 Write property test for component registry completeness
    - **Property 1: Component API Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2**

- [x] 2. Create Tool Function Definitions
  - [x] 2.1 Create `backend/app/services/llm_tools.py` with tool definitions
    - Define `TOOL_DEFINITIONS` list with OpenAI function schema format
    - Include all 4 tools: get_available_components, get_component_schema, validate_blueprint, get_circuit_state
    - _Requirements: 2.1, 3.1, 4.1, 5.1_
  
  - [x] 2.2 Implement `ToolHandler` class with `handle_tool_call` router
    - Route tool calls to appropriate handler methods
    - Return consistent JSON response format
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [ ] 2.3 Write property test for tool response format consistency
    - **Property 7: Tool Response Format Consistency**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 3. Implement Tool Handlers
  - [x] 3.1 Implement `_handle_get_components` handler
    - Return all components grouped by category
    - Include type, name, description for each
    - _Requirements: 2.1, 2.2_
  
  - [x] 3.2 Implement `_handle_get_schema` handler
    - Return detailed schema for valid component types
    - Return error with suggestions for invalid types
    - Include pins, connection_rules, example_connections
    - _Requirements: 3.2, 3.3, 9.1, 9.7_
  
  - [ ] 3.3 Write property tests for component schema
    - **Property 2: Component Schema Validity**
    - **Property 3: Invalid Component Handling**
    - **Validates: Requirements 3.2, 3.3, 9.1, 9.7**
  
  - [x] 3.4 Implement `_handle_validate` handler
    - Validate component types exist
    - Validate pin names are correct
    - Check for output-to-output connections
    - Check for multiple drivers to same input
    - Return errors and warnings
    - _Requirements: 4.2, 4.3, 4.4, 9.2, 9.3, 9.4_
  
  - [ ] 3.5 Write property tests for blueprint validation
    - **Property 4: Blueprint Validation - Error Detection**
    - **Property 5: Blueprint Validation - Multiple Driver Detection**
    - **Property 6: Blueprint Validation - Success Case**
    - **Validates: Requirements 4.2, 4.3, 4.4, 9.2, 9.3, 9.4**
  
  - [x] 3.6 Implement `_handle_get_state` handler
    - Return current circuit state from session
    - Include components, wires, simulation result
    - _Requirements: 5.2, 5.3_
  
  - [ ] 3.7 Write property test for circuit state completeness
    - **Property 9: Circuit State Completeness**
    - **Validates: Requirements 5.2, 5.3**

- [ ] 4. Checkpoint - Ensure all tool handlers work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update LLM Service with Tool Calling
  - [x] 5.1 Add tool definitions to LLM service
    - Import TOOL_DEFINITIONS from llm_tools
    - Initialize ToolHandler with ComponentRegistry
    - _Requirements: 6.1_
  
  - [x] 5.2 Implement `_call_with_tools` method
    - Add tools parameter to OpenAI API call
    - Handle tool_calls in response
    - Execute tools and add results to messages
    - Continue conversation until LLM finishes
    - _Requirements: 6.2, 6.3_
  
  - [x] 5.3 Add tool call limit enforcement
    - Track tool call count per request
    - Stop after MAX_TOOL_CALLS (10)
    - Return partial result with warning
    - _Requirements: 6.4_
  
  - [ ] 5.4 Write property test for tool call limit
    - **Property 8: Tool Call Limit Enforcement**
    - **Validates: Requirements 6.4**

- [x] 6. Update Course Generation to Use Tools
  - [x] 6.1 Update `generate_course_plan` to use tool calling
    - Use simplified system prompt (remove component list)
    - Let LLM call get_available_components
    - _Requirements: 2.4, 8.1_
  
  - [x] 6.2 Update `generate_level_content` to use tool calling
    - Let LLM call get_component_schema for each component
    - Let LLM call validate_blueprint before returning
    - _Requirements: 3.4, 8.2, 8.3, 8.4_

- [x] 7. Create Component API Endpoints
  - [x] 7.1 Create `/api/components` endpoint
    - Return all components grouped by category
    - Use ComponentRegistry as source
    - _Requirements: 1.1_
  
  - [x] 7.2 Create `/api/components/{type}` endpoint
    - Return detailed schema for component type
    - Return 404 with suggestions for invalid type
    - _Requirements: 1.2_

- [ ] 8. Checkpoint - Integration Testing
  - Ensure all tests pass, ask the user if questions arise.
  - Test full flow: generate course → load blueprint → run simulation

- [ ] 9. Final Integration
  - [ ] 9.1 Test course generation with new tool-based approach
    - Generate a new course and verify blueprints are valid
    - Verify simulation runs without errors
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.6_

## Notes

- Tasks marked with `*` are optional property-based tests
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
