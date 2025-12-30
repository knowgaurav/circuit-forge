# Requirements Document

## Introduction

This document specifies the requirements for implementing LLM Tool Functions in CircuitForge. The tool functions will allow the LLM to dynamically query available components, their specifications, and current circuit state to generate accurate circuit blueprints and provide interactive assistance.

## Glossary

- **Tool_Function**: An OpenAI-compatible function that the LLM can call to retrieve information or perform actions
- **Component_Registry**: A centralized source of truth for all available circuit components and their specifications
- **Circuit_State**: The current state of components, wires, and simulation results in the playground
- **Blueprint**: A JSON structure describing components and their connections that can be rendered in the playground
- **Function_Calling**: The OpenAI API feature that allows LLMs to call predefined functions with structured arguments

## Requirements

### Requirement 1: Component Registry API

**User Story:** As a system, I want a centralized component registry so that the LLM can query accurate component information.

#### Acceptance Criteria

1. THE System SHALL provide an API endpoint `/api/components` that returns all available component types
2. THE System SHALL provide an API endpoint `/api/components/{type}` that returns detailed specifications for a specific component
3. WHEN returning component details, THE System SHALL include: type, name, category, description, pins (with names and types), and default properties
4. THE Component_Registry SHALL be the single source of truth used by both frontend and LLM

### Requirement 2: Get Available Components Tool

**User Story:** As an LLM, I want to query available components so that I can design circuits using only valid component types.

#### Acceptance Criteria

1. THE System SHALL define a tool function `get_available_components` that returns a list of all component types grouped by category
2. WHEN called, THE tool SHALL return component type, name, and category for each available component
3. THE tool response SHALL be concise to minimize token usage
4. THE LLM SHALL call this tool before generating any circuit blueprint

### Requirement 3: Get Component Schema Tool

**User Story:** As an LLM, I want to query component specifications so that I can use correct pin names and properties.

#### Acceptance Criteria

1. THE System SHALL define a tool function `get_component_schema` that accepts a component type parameter
2. WHEN called with a valid type, THE tool SHALL return: pin names, pin types (input/output), pin positions, and configurable properties
3. IF called with an invalid type, THEN THE tool SHALL return an error message listing similar valid types
4. THE LLM SHALL call this tool for each component type before using it in a blueprint

### Requirement 4: Validate Blueprint Tool

**User Story:** As an LLM, I want to validate blueprints before submission so that I can fix errors proactively.

#### Acceptance Criteria

1. THE System SHALL define a tool function `validate_blueprint` that accepts a circuit blueprint
2. WHEN validating, THE tool SHALL check: valid component types, valid pin names, wire connection validity, and position bounds
3. THE tool SHALL return a list of errors and warnings with specific details about what needs to be fixed
4. IF validation passes, THEN THE tool SHALL return success with the validated blueprint

### Requirement 5: Get Circuit State Tool

**User Story:** As an LLM, I want to see the current circuit state so that I can provide contextual assistance.

#### Acceptance Criteria

1. THE System SHALL define a tool function `get_circuit_state` that returns the current playground state
2. WHEN called, THE tool SHALL return: list of components with positions, list of wires with connections, and current simulation result if running
3. THE tool SHALL include component labels and IDs for reference
4. THE LLM SHALL use this tool when helping users debug or modify existing circuits

### Requirement 6: LLM Service Tool Integration

**User Story:** As a developer, I want the LLM service to use tool functions so that circuit generation is accurate.

#### Acceptance Criteria

1. THE LLM_Service SHALL register all tool functions with the OpenAI API using the functions parameter
2. WHEN generating course content, THE LLM_Service SHALL enable tool calling mode
3. THE LLM_Service SHALL handle tool call responses and continue the conversation with tool results
4. THE LLM_Service SHALL limit tool calls to a maximum of 10 per request to prevent infinite loops

### Requirement 7: Tool Response Formatting

**User Story:** As a system, I want consistent tool response formats so that the LLM can parse them reliably.

#### Acceptance Criteria

1. THE System SHALL return all tool responses as JSON objects
2. WHEN successful, THE response SHALL include a `success: true` field and the requested data
3. WHEN failed, THE response SHALL include a `success: false` field and an `error` message
4. THE System SHALL include usage hints in error responses to guide the LLM

### Requirement 8: Circuit Generation with Tools

**User Story:** As a user, I want the LLM to generate accurate circuits so that they work correctly in the playground.

#### Acceptance Criteria

1. WHEN generating a circuit blueprint, THE LLM SHALL first call `get_available_components` to see available types
2. WHEN using a component, THE LLM SHALL call `get_component_schema` to get exact pin names
3. BEFORE returning the blueprint, THE LLM SHALL call `validate_blueprint` to check for errors
4. IF validation fails, THEN THE LLM SHALL fix the errors and re-validate

### Requirement 9: Connection Rules and Simulation Compatibility

**User Story:** As a user, I want generated circuits to be simulation-compatible so that they run without errors.

#### Acceptance Criteria

1. THE `get_component_schema` tool SHALL include connection rules: which pin types can connect to which
2. THE System SHALL enforce that output pins connect to input pins only (not output-to-output)
3. THE System SHALL enforce that each input pin has at most one driver (no multiple outputs to same input)
4. THE `validate_blueprint` tool SHALL check for simulation compatibility: no floating inputs on logic gates, no output conflicts
5. THE tool response SHALL include simulation-specific warnings (e.g., "Ground pins can accept multiple connections")
6. WHEN generating circuits, THE LLM SHALL ensure each LED has a current-limiting path and proper ground connection
7. THE System SHALL provide example valid connection patterns in the component schema response
