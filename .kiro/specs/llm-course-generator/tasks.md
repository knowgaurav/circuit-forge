# Implementation Plan: LLM Course Generator

**Project Location:** Extends CircuitForge at `/Users/knowgaurav/Desktop/Projects/Algozenith/Projects/circuit-forge`

---

## Phase 1: Basic Course Generation (MVP)

- [x] 1. Backend Setup
  - [x] 1.1 Create course models and schemas
    - Create Pydantic models for CoursePlan, LevelContent, LevelOutline
    - Create MongoDB document models using Beanie ODM
    - _Requirements: 2.1, 3.1_
  
  - [x] 1.2 Implement LLM Service
    - Create OpenAI client wrapper with retry logic
    - Create prompt templates for course plan generation
    - Create prompt templates for level content generation
    - Implement JSON schema validation for LLM responses
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 1.3 Write property test for course plan schema validation
    - **Property 1: Course Plan Schema Validation**
    - **Validates: Requirements 2.1, 4.3**
  
  - [x] 1.4 Implement Course Service
    - Create course plan generation logic
    - Create level content generation logic
    - Implement course enrollment
    - _Requirements: 1.2, 2.1, 3.1_
  
  - [ ]* 1.5 Write property test for level content structure
    - **Property 2: Level Content Structure**
    - **Validates: Requirements 3.1**

  - [x] 1.6 Create REST API endpoints
    - GET /api/courses/suggestions - return hardcoded topic suggestions
    - POST /api/courses/generate-plan - generate course plan from topic
    - GET /api/courses/{id} - get course plan
    - GET /api/courses/{id}/levels/{num} - get level content
    - _Requirements: 1.1, 1.3, 2.2_

- [x] 2. Frontend Setup
  - [x] 2.1 Create topic selection page
    - Build TopicSelector component with input field
    - Display suggested topics grid
    - Handle topic submission
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 Create course plan view
    - Build CoursePlan component showing all levels
    - Show level titles with locked/unlocked status
    - Add "Start Course" button
    - _Requirements: 1.3, 2.2_
  
  - [x] 2.3 Create level content view
    - Build LevelContent component with theory and practical tabs
    - Display learning objectives and concept explanation
    - Display components needed and step-by-step instructions
    - Integrate with CircuitForge canvas (placeholder added)
    - _Requirements: 3.1, 3.2_
  
  - [x] 2.4 Implement level completion flow
    - Add "Complete Level" button
    - Call API to unlock next level
    - Navigate to next level
    - _Requirements: 3.3_

- [x] 3. Phase 1 Checkpoint
  - Test end-to-end flow: select topic → generate plan → view levels → complete
  - Ensure LLM generates valid course plans and level content
  - ✅ All frontend and backend code implemented and passing type checks

---

## Phase 2: Celery Queue Integration

- [ ] 4. Celery Setup
  - [ ] 4.1 Configure Celery with Redis
    - Add Celery and Redis dependencies
    - Create celery_app.py with queue configuration
    - Configure priority and background queues
    - _Requirements: 5.1, 5.2_
  
  - [ ] 4.2 Create generation tasks
    - Create task for level content generation
    - Implement task state tracking in MongoDB
    - Add retry logic with exponential backoff
    - _Requirements: 5.3, 6.1_
  
  - [ ] 4.3 Implement queue logic
    - Queue Level 1 to priority on course start
    - Queue Levels 2-3 to background on course start
    - Queue next 2 levels on level completion
    - _Requirements: 5.3, 5.4_
  
  - [ ]* 4.4 Write property test for queue behavior on completion
    - **Property 6: Queue Behavior on Completion**
    - **Validates: Requirements 5.4**

- [ ] 5. Real-time Updates
  - [ ] 5.1 Add WebSocket events for generation status
    - Emit 'level:generating' when task starts
    - Emit 'level:ready' when content is generated
    - Emit 'level:failed' on error
    - _Requirements: 6.2_
  
  - [ ] 5.2 Update frontend for async generation
    - Show loading spinner when level is generating
    - Listen for WebSocket events
    - Auto-refresh when content ready
    - _Requirements: 6.2_

- [ ] 6. Phase 2 Checkpoint
  - Test background generation works
  - Verify priority queue processes first
  - Test WebSocket notifications

---

## Phase 3: Progress Tracking & Validation

- [ ] 7. Progress Persistence
  - [x] 7.1 Implement enrollment repository
    - Create/update course enrollment records
    - Track current level
    - _Requirements: 7.1_
  
  - [x] 7.2 Implement level progress repository
    - Save level completion status
    - Store circuit snapshots
    - Track time spent and validation attempts
    - _Requirements: 7.1_
  
  - [ ]* 7.3 Write property test for progress persistence
    - **Property 4: Progress Persistence Round-Trip**
    - **Validates: Requirements 7.1, 7.2**
  
  - [ ] 7.4 Add progress restoration
    - Load enrollment on course page
    - Restore current level and status
    - Offer to load last circuit snapshot
    - _Requirements: 7.2_

- [ ] 8. Circuit Validation
  - [x] 8.1 Implement validation service
    - Compare circuit state to validation criteria
    - Check required components are present
    - Check required connections exist
    - _Requirements: 8.1_
  
  - [x] 8.2 Implement validation feedback
    - Generate specific error messages for missing components
    - Generate specific error messages for missing connections
    - _Requirements: 8.2_
  
  - [ ]* 8.3 Write property test for circuit validation
    - **Property 5: Circuit Validation Correctness**
    - **Validates: Requirements 8.1, 8.2**
  
  - [x] 8.4 Add validation API endpoint
    - POST /api/courses/{id}/levels/{num}/validate
    - Return validation result with feedback
    - _Requirements: 8.1, 8.2_
  
  - [ ] 8.5 Implement level completion with validation
    - Validate circuit before marking complete
    - Save circuit snapshot on success
    - Unlock next level
    - _Requirements: 8.3_
  
  - [ ]* 8.6 Write property test for level completion
    - **Property 3: Level Completion Unlocks Next**
    - **Validates: Requirements 3.3, 8.3**

- [ ] 9. Frontend Validation UI
  - [ ] 9.1 Add validation button and feedback
    - Add "Validate Circuit" button
    - Display validation results
    - Show specific feedback for failures
    - _Requirements: 8.1, 8.2_

- [ ] 10. Phase 3 Checkpoint
  - Test progress saves and restores correctly
  - Test validation catches missing components/connections
  - Test level completion flow with validation

---

## Phase 4: Course Library & Polish

- [ ] 11. Course Library
  - [ ] 11.1 Create course library page
    - Display featured courses (hardcoded initially)
    - Display "My Courses" section
    - Add "Create Custom Course" button
    - _Requirements: 9.1_
  
  - [ ] 11.2 Add course cards
    - Show title, difficulty, level count
    - Show "Start" or "Continue" button
    - _Requirements: 9.2_
  
  - [x] 11.3 Add my courses API
    - GET /api/courses/my-courses
    - Return enrolled courses with progress
    - _Requirements: 9.1_

- [ ] 12. Final Checkpoint
  - Full end-to-end testing
  - Verify all phases work together
  - Performance testing with multiple courses

---

## Notes

- Tasks marked with `*` are optional property-based tests
- Each phase builds on the previous one
- Phase 1 delivers a working MVP
- Phases 2-4 add robustness and features
