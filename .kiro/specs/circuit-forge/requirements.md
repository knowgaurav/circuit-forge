# Requirements Document: CircuitForge

## Introduction

This document specifies the requirements for **CircuitForge** - a collaborative circuit design and robotics education platform. The system enables real-time multi-user collaboration on electronic circuit boards using WebSockets, built with Next.js for the frontend and FastAPI for the backend. 

The platform serves two primary use cases:
1. **Basic Mode**: Teachers create collaborative sessions to teach circuit design using pre-built electronic components (gates, resistors, capacitors, sensors, actuators)
2. **Advanced Mode**: Students learn from complex templates (CPU, robotic arms, automation systems) and can modify/experiment with them

The system uses free managed services and client-side processing to minimize operational costs while maintaining professional, scalable architecture.

## Glossary

- **Circuit Board**: A shared digital canvas representing an electronic circuit where users place and connect components
- **Component**: A pre-built electronic element (AND gate, OR gate, resistor, LED, motor, sensor)
- **Wire**: A connection between component pins that carries signals
- **Pin**: A connection point on a component (input or output)
- **Session**: A collaborative workspace where a teacher and students work on circuit designs together
- **Template**: A pre-built complex circuit design (CPU, robotic arm) that users can study and modify
- **Simulation**: Running the circuit to visualize signal flow and component behavior
- **Freehand Drawing**: Annotation capability for teachers to draw explanations on the board
- **Participant ID**: A unique identifier stored in browser localStorage to track users across tabs and reconnections
- **WebSocket**: A protocol providing full-duplex communication channels over a single TCP connection
- **MongoDB Atlas**: Free-tier cloud database service for persistent storage
- **Vercel**: Free-tier hosting platform for Next.js frontend
- **Railway/Render**: Free-tier hosting platforms for FastAPI backend

## Requirements

### Requirement 1: Session Creation and Identity

**User Story:** As a teacher, I want to create collaborative sessions with shareable codes, so that students can join without needing accounts.

#### Acceptance Criteria

1.1. WHEN a user clicks "Create Session" THEN the System SHALL generate a unique 6-character uppercase alphanumeric session code (characters A-Z and 0-9 only) and redirect to the session page

1.2. WHEN a session is created THEN the System SHALL initialize an empty circuit board and store it in the database

1.3. WHEN a user enters a valid session code on the home page THEN the System SHALL redirect them to the session page

1.4. WHEN a user first enters a session page THEN the System SHALL prompt for a display name (3-20 characters, alphanumeric and spaces only)

1.5. WHEN a user submits their display name THEN the System SHALL generate a unique participant ID stored in browser localStorage and connect them to the session

1.6. WHEN the same browser opens the same session in a new tab THEN the System SHALL reuse the existing participant ID from localStorage and show the same display name

1.7. WHEN a different browser or device joins the same session THEN the System SHALL treat it as a new participant requiring a new display name

1.8. WHEN a user closes all tabs for a session THEN the System SHALL keep their participant data for 24 hours allowing rejoin with the same identity

1.9. WHEN a session has no active participants for 24 hours THEN the System SHALL automatically delete the session and its data

### Requirement 2: Session Sharing

**User Story:** As a teacher, I want to easily share the session with students, so that they can join quickly.

#### Acceptance Criteria

2.1. WHEN viewing a session THEN the System SHALL display the session code prominently in the header

2.2. WHEN a user clicks "Copy Link" THEN the System SHALL copy the full session URL to clipboard

2.3. WHEN a user clicks "Copy Code" THEN the System SHALL copy only the 6-character session code to clipboard

2.4. WHEN a user visits the home page THEN the System SHALL show two options: "Create Session" button and "Join Session" input field

2.5. WHEN a user pastes a full session URL into the join field THEN the System SHALL extract the code and join the session

2.6. WHEN a user enters an invalid or expired session code THEN the System SHALL display "Session not found or expired" error message

### Requirement 3: Roles and Permissions

**User Story:** As a teacher, I want to control who can edit the board, so that I can manage the session effectively.

#### Acceptance Criteria

3.1. WHEN a user creates a session THEN the System SHALL assign them the "Teacher" role with full edit permissions

3.2. WHEN a user joins an existing session THEN the System SHALL assign them the "Student" role with view-only permissions by default

3.3. WHEN a student wants to edit the board THEN the System SHALL display a "Request Edit Access" button in their toolbar

3.4. WHEN a student clicks "Request Edit Access" THEN the System SHALL send a notification to the teacher showing the student's display name

3.5. WHEN the teacher receives an edit request THEN the System SHALL display "Approve" and "Deny" buttons next to the student's name in the participants panel

3.6. WHEN the teacher approves an edit request THEN the System SHALL grant the student edit permissions and notify them with "Edit access granted"

3.7. WHEN the teacher denies an edit request THEN the System SHALL notify the student with "Edit access denied"

3.8. WHEN a student has edit permissions THEN the teacher SHALL be able to revoke them at any time via the participants panel

3.9. WHEN displaying the participants panel THEN the System SHALL show each participant's role (Teacher/Student) and edit status (Can Edit/View Only)

### Requirement 4: Component Placement

**User Story:** As a user with edit permissions, I want to place electronic components on the circuit board, so that I can build circuits.

#### Acceptance Criteria

4.1. WHEN a user with edit permissions drags a component from the component palette THEN the Board SHALL place the component at the drop location

4.2. WHEN a component is placed THEN the Board SHALL display the component with its input and output pins visible

4.3. WHEN a user selects a placed component THEN the Board SHALL highlight the component and show its properties panel

4.4. WHEN a user with edit permissions deletes a component THEN the Board SHALL remove the component and all connected wires

### Requirement 5: Wire Connections

**User Story:** As a user with edit permissions, I want to connect components with wires, so that I can create functional circuits.

#### Acceptance Criteria

5.1. WHEN a user with edit permissions clicks on an output pin and drags to an input pin THEN the Board SHALL create a wire connection between them

5.2. WHEN a wire is created THEN the Board SHALL validate that output connects to input (not output-to-output or input-to-input)

5.3. WHEN a user with edit permissions clicks on a wire THEN the Board SHALL allow deletion of that wire

5.4. WHEN displaying wires THEN the Board SHALL render them with automatic routing to avoid overlapping components

### Requirement 6: Real-time Collaboration

**User Story:** As a collaborator, I want to see other users' changes in real-time, so that we can work together effectively.

#### Acceptance Criteria

6.1. WHEN a user with edit permissions places, moves, or deletes a component THEN the WebSocket Server SHALL broadcast the change to all session participants within 100 milliseconds

6.2. WHEN a user with edit permissions creates or deletes a wire THEN the WebSocket Server SHALL broadcast the change to all session participants

6.3. WHEN a new user joins a session THEN the System SHALL send the current circuit state to synchronize their view

6.4. WHILE multiple users with edit permissions edit simultaneously THEN the Board SHALL apply all changes without data loss or conflicts

### Requirement 7: Cursor and Selection Presence

**User Story:** As a collaborator, I want to see other users' cursors and selections, so that I can understand where they are working.

#### Acceptance Criteria

7.1. WHEN a user moves their cursor on the board THEN the WebSocket Server SHALL broadcast cursor position to other users

7.2. WHEN displaying remote cursors THEN the Board SHALL show each user's cursor with their display name and a distinct color

7.3. WHEN a user selects a component THEN the Board SHALL show a colored border indicating who has it selected

7.4. WHEN a user closes their browser tab THEN the Board SHALL mark them as inactive and remove their cursor within 2 seconds

7.5. WHEN an inactive user reopens the session within 24 hours THEN the Board SHALL restore their display name and color automatically

### Requirement 8: Freehand Annotations

**User Story:** As a user with edit permissions, I want to draw freehand annotations on the board, so that I can explain concepts visually.

#### Acceptance Criteria

8.1. WHEN a user with edit permissions selects the drawing tool THEN the Board SHALL enable freehand drawing mode

8.2. WHEN a user draws on the board THEN the Board SHALL render strokes in real-time with the selected color (from a palette of 8 colors: black, red, blue, green, orange, purple, brown, white) and thickness (thin: 2px, medium: 4px, thick: 8px)

8.3. WHEN a user with edit permissions uses the eraser THEN the Board SHALL remove drawing strokes that intersect with the eraser path

8.4. WHEN drawing annotations are made THEN the WebSocket Server SHALL broadcast them to all session participants

### Requirement 9: Circuit Simulation

**User Story:** As a user, I want to simulate the circuit, so that I can see how signals flow through components.

#### Acceptance Criteria

9.1. WHEN any user starts simulation THEN the System SHALL evaluate the circuit logic and display signal states on wires (simulation is view-only, all users can trigger it)

9.2. WHEN simulation is running THEN the Board SHALL display signal states using the following visual indicators:
   - HIGH signal: Green colored wire
   - LOW signal: Gray colored wire
   - Undefined/Error: Red colored wire with dashed pattern

9.3. WHEN a logic gate receives inputs THEN the Simulation SHALL compute and display the correct output according to the following truth tables:
   - AND: Output HIGH only when all inputs are HIGH
   - OR: Output HIGH when any input is HIGH
   - NOT: Output is inverse of input
   - NAND: Output LOW only when all inputs are HIGH
   - NOR: Output LOW when any input is HIGH
   - XOR: Output HIGH when inputs differ

9.4. WHEN simulation encounters an error THEN the System SHALL highlight the problem area with a red indicator and display one of the following error messages:
   - "Floating Input: Input pin has no connection" when an input pin is unconnected
   - "Output Conflict: Multiple outputs connected to same wire" when two outputs drive the same wire
   - "Missing Power: Component requires VCC and Ground connections" when power connections are missing

### Requirement 10: Component Library

**User Story:** As a user, I want access to a component library with common electronic parts, so that I can build various circuits.

#### Acceptance Criteria

10.1. WHEN viewing the component palette THEN the System SHALL display components organized by category (Logic Gates, Input Devices, Output Devices, Passive Components, Sensors, Power)

10.2. WHEN a component category is expanded THEN the System SHALL show all available components with icons and names

10.3. WHEN hovering over a component THEN the System SHALL display a tooltip with component description and pin information

10.4. THE component library SHALL include the following components organized by category:
   - **Logic Gates (Basic)**: AND (2-input), OR (2-input), NOT (Inverter), NAND (2-input), NOR (2-input), XOR (2-input), XNOR (2-input), Buffer
   - **Logic Gates (Multi-input)**: AND (3-input), AND (4-input), OR (3-input), OR (4-input), NAND (3-input), NOR (3-input)
   - **Flip-Flops**: SR Latch, D Flip-Flop, JK Flip-Flop, T Flip-Flop
   - **Combinational**: 2-to-1 Multiplexer, 4-to-1 Multiplexer, 1-to-2 Demultiplexer, 2-to-4 Decoder, 4-bit Adder, 4-bit Comparator
   - **Sequential**: 4-bit Counter, 8-bit Shift Register
   - **Input Devices**: Toggle Switch, Push Button, DIP Switch (4-bit), Clock Generator (adjustable frequency), Constant High (VCC), Constant Low (GND), Numeric Input (0-255)
   - **Output Devices**: LED (red, green, yellow, blue), RGB LED, 7-Segment Display, 16x2 LCD Display, Buzzer, DC Motor, Servo Motor, Stepper Motor
   - **Passive Components**: Resistor (adjustable value), Capacitor (adjustable value), Inductor, Diode, Zener Diode, Transistor (NPN), Transistor (PNP)
   - **Sensors**: Light Sensor (LDR), Temperature Sensor, Proximity Sensor (IR), Ultrasonic Sensor, Potentiometer
   - **Power**: VCC (+5V), VCC (+3.3V), Ground, Battery (adjustable voltage)
   - **Connectors**: Wire Junction, Bus (4-bit), Bus (8-bit), Input Pin, Output Pin, Probe (for debugging)

### Requirement 11: Circuit Templates

**User Story:** As a student, I want to learn from advanced circuit templates with guided learning, so that I can understand complex electronic systems step by step.

#### Acceptance Criteria

11.1. WHEN a user opens the template gallery THEN the System SHALL display available templates organized by six categories: Digital Logic Fundamentals, Computing, Sequential Circuits, Robotics, Automation, and Communication

11.2. WHEN a user selects a template THEN the System SHALL offer two modes: "Learning Mode" and "Implementation Mode"

11.3. WHEN a user selects "Learning Mode" THEN the System SHALL load the complete pre-built circuit with the following educational content:
   - Overview section explaining the circuit's purpose and real-world applications
   - Component annotations with tooltips explaining each component's role
   - Signal flow highlights showing how data moves through the circuit
   - Theory section with relevant formulas, truth tables, or timing diagrams
   - "Explore" buttons that highlight specific sub-circuits when clicked

11.4. WHEN a user selects "Implementation Mode" THEN the System SHALL provide step-by-step guided building with:
   - Empty board with a checklist of steps in a sidebar
   - Each step showing which components to place and how to connect them
   - "Hint" button revealing the next connection if stuck
   - Checkpoint validation after each major step (System checks if circuit matches expected state)
   - Progress indicator showing completion percentage
   - "Verify Circuit" button at each checkpoint that highlights errors in red and correct parts in green

11.5. WHEN a checkpoint validation fails THEN the System SHALL display specific feedback: "Missing connection between [Component A] and [Component B]" or "Incorrect component at position [X, Y]"

11.6. WHEN a user completes all implementation steps THEN the System SHALL display a completion message and allow running the simulation

11.7. THE template library SHALL include the following templates organized by category:
   - **Digital Logic Fundamentals**: Half Adder, Full Adder, 4-bit Ripple Carry Adder, 4-bit Subtractor, 2-to-4 Decoder Demo, 4-to-1 Multiplexer Demo, SR Latch Demo, D Flip-Flop Demo
   - **Computing**: 4-bit ALU (add, subtract, AND, OR, XOR, NOT), 8-bit Register File, Program Counter, Basic CPU (fetch-decode-execute with 4 instructions), Memory Address Register
   - **Sequential Circuits**: 4-bit Binary Counter, 4-bit Ring Counter, 4-bit Johnson Counter, 8-bit Shift Register (SIPO, PISO), Frequency Divider
   - **Robotics**: DC Motor H-Bridge Controller, PWM Motor Speed Controller, Servo Motor Controller, Stepper Motor Driver, Line-Following Robot Logic, Obstacle Avoidance Logic, Robotic Arm 2-DOF Controller
   - **Automation**: Traffic Light Controller (3-way intersection), Elevator Controller (3-floor), Vending Machine FSM, Home Lighting Automation, Temperature-Based Fan Controller, Security Alarm System with Keypad
   - **Communication**: UART Transmitter, UART Receiver, SPI Master Interface, I2C Basic Demo

11.8. WHEN the template gallery is displayed THEN the System SHALL show a prominent "Playground" card at the top of the gallery with a distinct visual style (different background color, icon indicating free practice)

11.9. WHEN a user clicks the "Playground" card THEN the System SHALL open an empty circuit canvas with full edit permissions, complete component palette, and simulation capabilities

11.10. WHEN a user is in the playground THEN the System SHALL provide all circuit building tools (component placement, wire connections, annotations, simulation) without requiring a session code or network connection

11.11. WHEN a user is in the playground THEN the System SHALL store the circuit state in browser localStorage to persist work across page refreshes

11.12. WHEN a user clicks "Clear Board" in the playground THEN the System SHALL reset the canvas to an empty state after confirmation

### Requirement 12: Undo and Redo

**User Story:** As a user with edit permissions, I want to undo and redo my actions, so that I can correct mistakes easily.

#### Acceptance Criteria

12.1. WHEN a user with edit permissions triggers undo THEN the Board SHALL revert the most recent action performed by that user

12.2. WHEN a user with edit permissions triggers redo THEN the Board SHALL reapply the most recently undone action

12.3. WHEN an undo or redo occurs THEN the WebSocket Server SHALL broadcast the state change to synchronize all users

### Requirement 13: Export and Import

**User Story:** As a user, I want to export my circuit design, so that I can save and share my work.

#### Acceptance Criteria

13.1. WHEN any user requests export as PNG THEN the System SHALL generate a PNG image file of the current circuit board (for sharing as an image)

13.2. WHEN any user requests export as JSON THEN the System SHALL serialize the circuit state to a .json file containing all components, wires, positions, and annotations (for backup and re-import)

13.3. WHEN a user with edit permissions clicks "Import" and selects a valid .json file THEN the System SHALL deserialize and load the circuit state onto the board, replacing the current circuit

13.4. WHEN a user attempts to import an invalid or corrupted JSON file THEN the System SHALL display "Invalid circuit file" error and keep the current circuit unchanged

### Requirement 14: Data Serialization

**User Story:** As a developer, I want the circuit state to be serialized and deserialized reliably, so that circuit data persists correctly.

#### Acceptance Criteria

14.1. WHEN circuit state is serialized to JSON THEN the System SHALL produce valid JSON containing all components, wires, and annotations

14.2. WHEN circuit state is deserialized from JSON THEN the System SHALL reconstruct the exact circuit layout

14.3. WHEN serializing and then deserializing circuit state THEN the System SHALL produce an equivalent circuit state (round-trip consistency)

14.4. WHEN circuit state JSON is stored THEN the System SHALL include a schema version for future migration support

### Requirement 15: Infrastructure

**User Story:** As a developer, I want to use Azure Container Apps for deployment and free managed services for other infrastructure, so that I can deploy professionally while minimizing costs.

#### Acceptance Criteria

15.1. WHEN storing circuit data THEN the System SHALL use MongoDB Atlas free tier (512MB) as the primary database

15.2. WHEN deploying the frontend THEN the System SHALL use Azure Container Apps with the following configuration:
   - Containerized Next.js application
   - Auto-scaling from 0 to 2 replicas based on HTTP traffic
   - Custom domain support with managed SSL certificates

15.3. WHEN deploying the backend THEN the System SHALL use Azure Container Apps with the following configuration:
   - Containerized FastAPI application
   - WebSocket support enabled
   - Auto-scaling from 0 to 2 replicas based on concurrent connections
   - Environment variables for database connection and secrets

15.4. THE System SHALL use the following Azure Container Apps features:
   - Revision management for blue-green deployments
   - Built-in logging via Azure Monitor
   - Health probes for container readiness and liveness

15.5. THE System SHALL include Docker configurations:
   - `Dockerfile` for frontend (Next.js standalone build)
   - `Dockerfile` for backend (FastAPI with uvicorn)
   - `docker-compose.yml` for local development

15.6. THE System SHALL use GitHub Actions for CI/CD:
   - Build and push container images to Azure Container Registry
   - Deploy to Azure Container Apps on push to main branch
   - Run tests before deployment

### Requirement 16: Architecture

**User Story:** As a developer, I want the system architecture to follow industry-standard patterns, so that the project demonstrates professional software engineering practices.

#### Acceptance Criteria

16.1. WHEN structuring the codebase THEN the System SHALL follow clean separation between frontend, backend API, and WebSocket services

16.2. WHEN handling state THEN the System SHALL implement event sourcing pattern for circuit operations to enable reliable undo/redo and synchronization

16.3. WHEN designing APIs THEN the System SHALL follow RESTful conventions for CRUD operations and WebSocket for real-time events

16.4. WHEN implementing the frontend THEN the System SHALL use React component patterns with proper state management (Zustand)


---

## Non-Functional Requirements

### NFR 1: Performance

1. WHEN a user performs any action (place component, draw, connect wire) THEN the System SHALL render the change locally within 50 milliseconds

2. WHEN broadcasting changes via WebSocket THEN the System SHALL deliver updates to all participants within 100 milliseconds under normal network conditions

3. WHEN loading a session with up to 500 components THEN the System SHALL render the complete circuit within 2 seconds

4. WHEN running circuit simulation THEN the System SHALL compute and display signal states within 200 milliseconds for circuits with up to 200 components

### NFR 2: Scalability

1. THE System SHALL support up to 20 concurrent participants per session

2. THE System SHALL support up to 1000 components per circuit board

3. THE System SHALL support up to 2000 wire connections per circuit board

4. THE WebSocket Server SHALL handle up to 100 concurrent sessions within free-tier resource limits

### NFR 3: Reliability

1. WHEN a WebSocket connection drops THEN the System SHALL attempt automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)

2. WHEN reconnection succeeds THEN the System SHALL synchronize any missed updates without data loss

3. THE System SHALL persist circuit state to database within 5 seconds of any change

4. WHEN the browser tab is closed unexpectedly THEN the System SHALL preserve the last saved state for recovery

### NFR 4: Usability

1. THE System SHALL be usable on desktop browsers (Chrome, Firefox, Safari, Edge) with screen width 1024px or greater

2. THE System SHALL provide keyboard shortcuts for common actions (Ctrl+Z undo, Ctrl+Y redo, Delete to remove, Escape to deselect)

3. THE System SHALL display loading indicators for any operation taking longer than 500 milliseconds

4. THE System SHALL provide clear error messages in plain language without technical jargon

### NFR 5: Accessibility

1. THE System SHALL support keyboard navigation for all toolbar actions

2. THE System SHALL provide sufficient color contrast (WCAG AA standard) for all UI elements

3. THE System SHALL include aria-labels for interactive elements

4. THE System SHALL not rely solely on color to convey information (use icons/patterns alongside colors)

### NFR 6: Security

1. THE System SHALL generate cryptographically random session codes to prevent guessing

2. THE System SHALL validate all WebSocket messages on the server before broadcasting

3. THE System SHALL sanitize all user input (display names, annotations) to prevent XSS attacks

4. THE System SHALL implement rate limiting (max 100 actions per minute per user) to prevent abuse

### NFR 7: Maintainability

1. THE codebase SHALL maintain separation between UI components, business logic, and data access layers

2. THE System SHALL use TypeScript for frontend and Python type hints for backend to ensure type safety

3. THE System SHALL include inline documentation for all public functions and complex logic

4. THE System SHALL follow consistent code formatting enforced by ESLint (frontend) and Black/Ruff (backend)


### NFR 8: System Design and Architecture

#### SOLID Principles

1. **Single Responsibility Principle (SRP)**: Each module/class SHALL have one reason to change
   - Separate services for: SessionService, CircuitService, WebSocketService, SimulationService, ExportService
   - Separate React components for: Canvas, Toolbar, ComponentPalette, ParticipantPanel, TemplateGallery

2. **Open/Closed Principle (OCP)**: THE System SHALL be open for extension but closed for modification
   - Component library SHALL use a plugin architecture allowing new components without modifying core code
   - Template system SHALL allow adding new templates via configuration files without code changes

3. **Liskov Substitution Principle (LSP)**: Derived classes SHALL be substitutable for their base classes
   - All logic gate components SHALL implement a common GateComponent interface
   - All input/output devices SHALL implement common InputDevice/OutputDevice interfaces

4. **Interface Segregation Principle (ISP)**: THE System SHALL use specific interfaces rather than general-purpose ones
   - Separate interfaces for: Draggable, Selectable, Connectable, Simulatable
   - Components SHALL implement only the interfaces they need

5. **Dependency Inversion Principle (DIP)**: High-level modules SHALL not depend on low-level modules
   - Services SHALL depend on abstractions (interfaces) not concrete implementations
   - Database access SHALL be abstracted behind repository interfaces
   - WebSocket communication SHALL be abstracted behind a messaging interface

#### Design Patterns

1. THE System SHALL implement the following design patterns:
   - **Event Sourcing**: All circuit modifications stored as immutable events for undo/redo and sync
   - **Command Pattern**: User actions encapsulated as command objects for undo/redo stack
   - **Observer Pattern**: Real-time updates via pub/sub for WebSocket broadcasting
   - **Factory Pattern**: Component creation through factory classes for extensibility
   - **Strategy Pattern**: Different simulation strategies for different component types
   - **Repository Pattern**: Data access abstracted behind repository interfaces
   - **Adapter Pattern**: External service integrations (database, WebSocket) wrapped in adapters

#### Clean Architecture Layers

1. THE System SHALL follow clean architecture with these layers:
   - **Presentation Layer**: React components, WebSocket handlers (depends on Application)
   - **Application Layer**: Use cases, services, DTOs (depends on Domain)
   - **Domain Layer**: Entities, value objects, domain events (no dependencies)
   - **Infrastructure Layer**: Database, external APIs, WebSocket implementation (depends on Application)

2. Dependencies SHALL flow inward only (outer layers depend on inner layers, never reverse)

#### API Design Standards

1. THE REST API SHALL follow these conventions:
   - Use nouns for resources: `/api/sessions`, `/api/sessions/{id}/circuit`
   - Use HTTP methods correctly: GET (read), POST (create), PUT (update), DELETE (remove)
   - Return appropriate status codes: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found), 500 (Server Error)
   - Use consistent error response format: `{ "error": { "code": "ERROR_CODE", "message": "Human readable message" } }`

2. THE WebSocket API SHALL follow these conventions:
   - Use typed message envelopes: `{ "type": "EVENT_TYPE", "payload": {...}, "timestamp": 123456 }`
   - Include correlation IDs for request-response patterns
   - Use namespaced event types: `circuit:component:add`, `circuit:wire:delete`, `presence:cursor:move`

#### Code Organization

1. THE frontend codebase SHALL follow this structure:
   ```
   src/
     components/
       ui/           # Reusable UI components (Button, Input, Modal, etc.)
       circuit/      # Circuit-specific components (Canvas, Wire, Component)
       layout/       # Layout components (Header, Sidebar, Panel)
     hooks/          # Custom React hooks
     services/       # Business logic and API calls
     stores/         # Zustand state management
     types/          # TypeScript interfaces and types
     utils/          # Pure utility functions
     constants/      # Configuration and constants
   ```

#### Component Library and Preview Page

1. THE System SHALL maintain a UI component library in `components/ui/` containing all reusable components

2. THE System SHALL provide a `/dev/preview` route (development only) that displays:
   - All available UI components with their variants
   - Interactive examples showing different props and states
   - Component documentation with prop types and usage examples

3. ALL UI elements in the application SHALL use components from `components/ui/` only
   - No ad-hoc styled elements or inline component definitions allowed
   - New UI patterns SHALL be added to the component library first, then used in features

4. THE component library SHALL include at minimum:
   - **Inputs**: Button, IconButton, Input, Select, Checkbox, Slider, ColorPicker
   - **Feedback**: Toast, Spinner, ProgressBar, Badge, Tooltip
   - **Layout**: Card, Panel, Modal, Drawer, Tabs, Accordion
   - **Data Display**: Avatar, List, Table, EmptyState

5. WHEN adding a new UI component THEN the developer SHALL:
   - Add the component to `components/ui/`
   - Add an example to the preview page
   - Document props and usage
   - Only then use it in feature code

2. THE backend codebase SHALL follow this structure:
   ```
   app/
     api/            # FastAPI route handlers
     services/       # Business logic
     repositories/   # Data access layer
     models/         # Pydantic models and domain entities
     events/         # Event definitions for event sourcing
     websocket/      # WebSocket handlers
     core/           # Configuration, dependencies, exceptions
   ```

#### Testing Architecture

1. THE System SHALL support three levels of testing:
   - **Unit Tests**: Test individual functions/classes in isolation with mocked dependencies
   - **Integration Tests**: Test service interactions with real database (test container)
   - **E2E Tests**: Test critical user flows through the UI (Playwright)

2. THE codebase SHALL maintain minimum 80% code coverage for business logic layers


#### Type Safety and Contract Enforcement

1. THE System SHALL use a shared type definition approach:
   - Define all API request/response types in a shared `types/` directory
   - Frontend TypeScript types and backend Pydantic models SHALL be generated from the same source (JSON Schema or shared definitions)
   - No manual duplication of type definitions between frontend and backend

2. THE System SHALL enforce type contracts at boundaries only:
   - **API Entry Points**: Pydantic validation on incoming requests (FastAPI handles this automatically)
   - **WebSocket Messages**: Pydantic validation on incoming messages before processing
   - **Internal Code**: NO defensive null checks, type guards, or validation - trust the types

3. THE System SHALL NOT include defensive code patterns:
   - No `if (data !== null && data !== undefined)` checks for typed data
   - No `typeof x === 'string'` runtime checks for typed parameters
   - No try-catch blocks for type-related errors in internal code
   - No optional chaining (`?.`) for properties that are guaranteed by types

4. THE System SHALL use strict TypeScript configuration:
   ```json
   {
     "strict": true,
     "noImplicitAny": true,
     "strictNullChecks": true,
     "noUncheckedIndexedAccess": true
   }
   ```

5. THE System SHALL use Pydantic with strict mode for backend:
   - All models SHALL use `model_config = ConfigDict(strict=True)`
   - No implicit type coercion (string "123" won't become int 123)
   - Validation errors SHALL be caught at API boundaries and returned as 400 errors

6. WHEN data crosses a trust boundary (external input) THEN validation SHALL occur once at entry
   - After validation, data flows through the system as trusted typed objects
   - Internal functions SHALL assume their inputs are valid (no re-validation)

7. THE System SHALL use discriminated unions for variant types:
   - WebSocket message types SHALL use a `type` discriminator field
   - Component types SHALL use a `componentType` discriminator field
   - TypeScript SHALL narrow types automatically based on discriminators


#### Exception Handling Guidelines

1. THE System SHALL use a custom exception hierarchy:
   ```
   AppException (base)
   ├── ValidationException      # Invalid input data
   ├── NotFoundException        # Resource not found (session, component)
   ├── AuthorizationException   # Permission denied (student trying to edit)
   ├── ConflictException        # Concurrent modification conflict
   ├── ConnectionException      # WebSocket/database connection issues
   └── SimulationException      # Circuit simulation errors
   ```

2. THE System SHALL NOT use generic exceptions:
   - ❌ `raise Exception("Something went wrong")`
   - ❌ `raise ValueError("Invalid data")`
   - ✅ `raise NotFoundException(resource="session", id=session_id)`
   - ✅ `raise AuthorizationException(user_id=user_id, action="edit", reason="view_only")`

3. Custom exceptions SHALL include structured context:
   ```python
   class NotFoundException(AppException):
       def __init__(self, resource: str, id: str):
           self.resource = resource
           self.id = id
           self.code = "NOT_FOUND"
           self.message = f"{resource} with id '{id}' not found"
   ```

4. THE System SHALL handle exceptions at these levels only:
   - **API Route Handlers**: Catch AppException, convert to HTTP response
   - **WebSocket Handlers**: Catch AppException, send error message to client
   - **Background Tasks**: Catch all exceptions, log and continue
   - **Internal Functions**: SHALL NOT catch exceptions (let them propagate)

5. THE System SHALL NOT use try-catch for flow control:
   - ❌ Try to find, catch not found, create new
   - ✅ Check existence first, then create or return existing

#### Logging Guidelines

1. THE System SHALL log at these levels:
   - **ERROR**: Caught exceptions that indicate system problems
   - **WARN**: Recoverable issues (reconnection attempts, rate limiting)
   - **INFO**: Significant business events (session created, user joined)
   - **DEBUG**: Detailed flow information (disabled in production)

2. THE System SHALL log exceptions only when caught and handled:
   - ✅ Log at the catch site with full context
   - ❌ Log and re-raise (causes duplicate logs)
   - ❌ Log in internal functions that don't handle exceptions

3. Log entries SHALL include structured context:
   ```python
   logger.error(
       "Failed to save circuit state",
       extra={
           "session_id": session_id,
           "user_id": user_id,
           "component_count": len(components),
           "error_code": exception.code,
           "error_message": str(exception)
       }
   )
   ```

4. THE System SHALL NOT log:
   - Sensitive data (full circuit state, user IPs in production)
   - Expected errors (invalid session code from user input)
   - High-frequency events (cursor movements, individual strokes)

5. THE System SHALL use correlation IDs:
   - Generate unique request_id for each API/WebSocket request
   - Include request_id in all log entries for that request
   - Return request_id in error responses for debugging

6. Frontend logging SHALL:
   - Log errors to console in development
   - Send critical errors to backend `/api/logs` endpoint in production
   - Include session_id, user_id, and action context
