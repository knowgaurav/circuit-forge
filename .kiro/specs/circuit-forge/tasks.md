# Implementation Plan: CircuitForge

**Project Root:** `/Users/knowgaurav/Desktop/Projects/Algozenith/Projects/circuit-forge`

All code should be created in the project root directory with the following structure:
```
circuit-forge/
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── shared/            # Shared type definitions
├── docker-compose.yml
└── README.md
```

---

## ✅ Completed: Phase 1 - Project Setup

- [x] 1. Initialize Project Structure
  - [x] 1.1 Create Next.js frontend project with TypeScript and Tailwind CSS
  - [x] 1.2 Create FastAPI backend project with Python
  - [x] 1.3 Create shared type definitions
  - [x] 1.4 Set up Docker configurations
  - [x] 1.5 Write property test for circuit state serialization round-trip
    - **Property 9: Circuit State Serialization Round-Trip**
    - **Validates: Requirements 14.1, 14.2, 14.3**
  - [x] 1.6 Write property test for schema version inclusion
    - **Property 10: Schema Version Inclusion**
    - **Validates: Requirements 14.4**

- [x] 2. Checkpoint - Ensure all tests pass

---

## 🚀 MVP Implementation (Single Task - Full Stack)

- [x] 3. Build Complete MVP Application
  
  This task implements a fully functional MVP that can be run locally with `docker-compose up`. The implementation covers all core features needed for a working collaborative circuit design tool.

  ### Backend Implementation
  
  - [x] 3.1 Database Layer
    - Set up MongoDB connection with Motor async client
    - Implement SessionRepository, ParticipantRepository, EventRepository
    - Create database indexes for performance
    - _Requirements: 15.1, NFR 8_
  
  - [x] 3.2 Session Management Service
    - Implement session creation with unique 6-char code generation (A-Z, 0-9)
    - Implement session join and participant management
    - Assign roles (teacher for creator, student for joiners)
    - Assign unique cursor colors to participants
    - Implement session cleanup for inactive sessions (24h)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.8, 1.9, 3.1, 3.2, NFR 6_
  
  - [x] 3.3 Permission Service
    - Implement permission checking (canEdit flag)
    - Handle edit request creation, approve/deny/revoke operations
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  
  - [x] 3.4 Circuit Operations Service
    - Implement event store with version tracking and snapshots
    - Implement circuit state reconstruction from events
    - Implement component operations (add, move, delete with wire cascade)
    - Implement wire operations (add with pin validation, delete)
    - Implement undo/redo logic per participant
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 12.1, 12.2, 12.3, 14.2, 16.2_
  
  - [x] 3.5 WebSocket Server
    - Implement WebSocket connection handler with session/participant validation
    - Implement room manager and broadcaster
    - Implement message handlers for circuit operations (component/wire/annotation CRUD)
    - Implement presence handlers (cursor position, selection changes)
    - Implement permission request handlers
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 8.4, NFR 3_
  
  - [x] 3.6 REST API Endpoints
    - POST /api/sessions - create session
    - GET /api/sessions/{code} - get session info
    - POST /api/sessions/{code}/join - join session
    - GET /api/sessions/{code}/circuit - get current state
    - POST /api/sessions/{code}/export/json - export as JSON
    - POST /api/sessions/{code}/import - import circuit
    - _Requirements: 1.1, 1.3, 2.6, 13.2, 13.3, 13.4_

  ### Frontend Implementation
  
  - [x] 3.7 UI Component Library
    - Create Button, IconButton, Input, Select, Checkbox, Slider, ColorPicker
    - Create Toast, Spinner, Badge, Tooltip, Modal, Panel, Accordion
    - Create Avatar, List, EmptyState
    - All components with proper accessibility (aria-labels, keyboard nav)
    - _Requirements: NFR 4, NFR 5, NFR 8_
  
  - [x] 3.8 State Management
    - Implement circuitStore (components, wires, annotations) with Zustand
    - Implement sessionStore (session, participants)
    - Implement uiStore (selected tool, color, stroke width)
    - Implement WebSocket client with reconnection (exponential backoff)
    - Implement typed API client for REST endpoints
    - _Requirements: 16.4, NFR 3, NFR 8_
  
  - [x] 3.9 Circuit Canvas
    - Create Canvas component with HTML5 Canvas API
    - Implement coordinate transformation for pan/zoom
    - Render all component types with input/output pins
    - Render wires with automatic routing
    - Render freehand annotations with color and thickness
    - Show selection highlights and remote user selections
    - _Requirements: 4.2, 5.4, 7.3, 8.2, NFR 1_
  
  - [x] 3.10 Circuit Interactions
    - Implement component palette with categories (accordion)
    - Implement drag-and-drop component placement
    - Implement component selection, movement, and deletion
    - Implement wire creation (output to input) and deletion
    - Implement freehand drawing tool and eraser
    - _Requirements: 4.1, 4.3, 4.4, 5.1, 5.2, 5.3, 8.1, 8.2, 8.3, 10.1, 10.2, 10.3, 10.4_
  
  - [x] 3.11 Session UI
    - Create home page with "Create Session" and "Join Session"
    - Create session page layout (header, canvas, toolbar, sidebars)
    - Create display name prompt modal
    - Create participants panel with roles and edit status
    - Implement toolbar (tools, color picker, stroke width, undo/redo)
    - Implement keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete, Escape)
    - _Requirements: 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.3, 3.4, 3.5, 3.9, 8.1, 8.2, 12.1, 12.2, NFR 4_
  
  - [x] 3.12 Cursor Presence
    - Display remote cursors with user color and name
    - Throttle cursor position updates (50ms)
    - Remove cursors when users leave
    - _Requirements: 7.1, 7.2, 7.4_

  ### Property-Based Tests
  
  - [ ]* 3.13 Write property test for session code uniqueness and format
    - **Property 1: Session Code Uniqueness and Format**
    - **Validates: Requirements 1.1**
  
  - [ ]* 3.14 Write property test for role-based edit permission
    - **Property 2: Role-Based Edit Permission**
    - **Validates: Requirements 3.2, 3.6**
  
  - [ ]* 3.15 Write property test for component deletion cascades to wires
    - **Property 3: Component Deletion Cascades to Wires**
    - **Validates: Requirements 4.4**
  
  - [ ]* 3.16 Write property test for wire connection validation
    - **Property 4: Wire Connection Validation**
    - **Validates: Requirements 5.2**
  
  - [ ]* 3.17 Write property test for concurrent edit preservation
    - **Property 5: Concurrent Edit Preservation**
    - **Validates: Requirements 6.4**
  
  - [ ]* 3.18 Write property test for eraser intersection removal
    - **Property 6: Eraser Intersection Removal**
    - **Validates: Requirements 8.3**
  
  - [ ]* 3.19 Write property test for undo/redo round-trip
    - **Property 8: Undo/Redo Round-Trip**
    - **Validates: Requirements 12.1, 12.2**

- [x] 4. MVP Checkpoint - Verify Working Application
  - Run `docker-compose up` and verify application starts
  - Test session creation and joining
  - Test component placement and wire connections
  - Test real-time collaboration between two browser tabs
  - Ensure all property tests pass

---

## 🎯 Post-MVP Enhancements

- [x] 5. Circuit Simulation Engine
  - [x] 5.1 Implement logic gate evaluation with truth tables
    - _Requirements: 9.3_
  - [x] 5.2 Implement circuit graph traversal and topological sort
    - _Requirements: 9.1, 9.4_
  - [x] 5.3 Implement signal propagation and visualization
    - _Requirements: 9.1, 9.2_
  - [ ]* 5.4 Write property test for logic gate truth tables
    - **Property 7: Logic Gate Truth Tables**
    - **Validates: Requirements 9.3**

- [x] 6. Template System
  - [x] 6.1 Create template gallery page with 6 categories
    - _Requirements: 11.1_
  - [x] 6.2 Implement Learning Mode with annotations and signal flow
    - _Requirements: 11.3_
  - [x] 6.3 Implement Implementation Mode with step-by-step guidance
    - _Requirements: 11.4_
  - [x] 6.4 Implement checkpoint validation
    - _Requirements: 11.4, 11.5, 11.6_
  - [x] 6.5 Create template data files (30+ templates)
    - _Requirements: 11.7_
  - [x] 6.6 Add Playground card to template gallery
    - Add prominent "Playground" card at top of template gallery with distinct styling
    - _Requirements: 11.8_
  - [x] 6.7 Create Playground page
    - Create `/playground` route with empty canvas, full component palette, and simulation
    - Store circuit state in localStorage for persistence across refreshes
    - Add "Clear Board" functionality with confirmation
    - _Requirements: 11.9, 11.10, 11.11, 11.12_

- [x] 7. Export/Import Features
  - [x] 7.1 Implement PNG export
    - _Requirements: 13.1_
  - [x] 7.2 Implement JSON export/import (already in MVP)
    - _Requirements: 13.2, 13.3, 13.4_

- [x] 8. Deployment
  - [x] 8.1 Set up GitHub Actions CI/CD workflow
    - _Requirements: 15.6_
  - [x] 8.2 Configure Azure Container Apps deployment
    - _Requirements: 15.2, 15.3, 15.4_
  - [x] 8.3 Set up monitoring and logging
    - _Requirements: 15.4, NFR 7_

- [x] 9. Final Checkpoint - Production Ready
  - Ensure all tests pass
  - Verify deployment works
  - Test all features end-to-end
