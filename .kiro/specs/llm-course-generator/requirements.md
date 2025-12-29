# Requirements Document: LLM Course Generator

## Introduction

An AI-powered feature for CircuitForge that generates step-by-step circuit design courses on demand. Students pick a topic (like "4-bit calculator"), the LLM creates a course plan, and content is generated incrementally as students progress.

## Glossary

- **Course**: A learning path with multiple levels to build a circuit project
- **Course_Plan**: The outline of all levels (titles + descriptions) - generated first
- **Level_Content**: Detailed content for one level (theory + practical instructions)
- **Generation_State**: Status of level content (not_queued, queued, generating, generated, failed)
- **Circuit_Snapshot**: Saved circuit state when student completes a level

## Implementation Phases

### Phase 1: Basic Course Generation (MVP)
Get a working end-to-end flow with a single LLM call.

### Phase 2: Celery Queue Integration
Add background processing with priority/background queues.

### Phase 3: Progress Tracking & Validation
Save student progress and validate circuits.

### Phase 4: Course Library & Polish
Add course browsing, ratings, and community features.

---

## Phase 1 Requirements: Basic Course Generation

### Requirement 1: Topic Selection

**User Story:** As a student, I want to enter a topic and get a course plan.

#### Acceptance Criteria

1.1. WHEN a student opens the course page THEN the System SHALL display:
   - Input field for custom topic
   - Grid of suggested topics (Calculator, Digital Clock, Traffic Light, etc.)

1.2. WHEN a student selects/enters a topic THEN the System SHALL call the LLM to generate a Course_Plan

1.3. WHEN Course_Plan is ready THEN the System SHALL display all level titles with "Start Course" button

### Requirement 2: Course Plan Generation

**User Story:** As a student, I want to see the full course outline before starting.

#### Acceptance Criteria

2.1. WHEN generating a Course_Plan THEN the LLM SHALL return:
   - Course title and description
   - Difficulty level (Beginner/Intermediate/Advanced)
   - List of 8-15 levels with titles and brief descriptions

2.2. WHEN Course_Plan is displayed THEN the System SHALL show:
   - Visual list of all levels
   - Only Level 1 marked as "unlocked"
   - "Start Course" button

### Requirement 3: Level Content Generation

**User Story:** As a student, I want each level to have theory and practical instructions.

#### Acceptance Criteria

3.1. WHEN a student starts Level 1 THEN the System SHALL generate Level_Content containing:
   - **Theory**: Learning objectives, concept explanation, real-world examples
   - **Practical**: Components needed, step-by-step instructions, expected behavior

3.2. WHEN Level_Content is ready THEN the System SHALL display it with the circuit canvas

3.3. WHEN student clicks "Complete Level" THEN the System SHALL unlock the next level and generate its content

### Requirement 4: LLM Integration

**User Story:** As a developer, I want to call an LLM API to generate content.

#### Acceptance Criteria

4.1. THE System SHALL support OpenAI API (GPT-4) as the initial LLM provider

4.2. WHEN calling the LLM THEN the System SHALL send:
   - System prompt with CircuitForge component library
   - Course topic and level number
   - JSON schema for expected output

4.3. WHEN LLM response is received THEN the System SHALL validate JSON structure before storing

---

## Phase 2 Requirements: Celery Queue Integration

### Requirement 5: Dual Queue System

**User Story:** As a system operator, I want background generation to optimize resources.

#### Acceptance Criteria

5.1. THE System SHALL use Celery with Redis as broker

5.2. THE System SHALL maintain two queues:
   - **priority**: For levels student is waiting for
   - **background**: For pre-generating upcoming levels

5.3. WHEN student starts a course THEN the System SHALL:
   - Generate Level 1 content immediately (priority queue)
   - Queue Level 2 and 3 for background generation

5.4. WHEN student completes a level THEN the System SHALL:
   - Queue next 2 ungenerated levels to background

### Requirement 6: Generation State Tracking

**User Story:** As a student, I want to know when content is ready.

#### Acceptance Criteria

6.1. THE System SHALL track each level's Generation_State in MongoDB:
   - not_queued, queued, generating, generated, failed

6.2. WHEN student reaches an ungenerated level THEN the System SHALL:
   - Show "Generating..." with spinner
   - Notify via WebSocket when ready

---

## Phase 3 Requirements: Progress & Validation

### Requirement 7: Progress Persistence

**User Story:** As a student, I want my progress saved.

#### Acceptance Criteria

7.1. THE System SHALL store in MongoDB:
   - Course enrollment (participant_id, course_plan_id, current_level)
   - Level progress (completed/skipped status, circuit_snapshot)

7.2. WHEN student returns THEN the System SHALL restore their progress

### Requirement 8: Circuit Validation

**User Story:** As a student, I want to know if I built the circuit correctly.

#### Acceptance Criteria

8.1. WHEN student clicks "Validate" THEN the System SHALL compare circuit to expected state

8.2. WHEN validation fails THEN the System SHALL show what's missing/wrong

8.3. WHEN validation passes THEN the System SHALL save snapshot and unlock next level

---

## Phase 4 Requirements: Course Library

### Requirement 9: Course Discovery

**User Story:** As a student, I want to browse existing courses.

#### Acceptance Criteria

9.1. THE System SHALL display:
   - Featured courses (pre-generated)
   - My courses (enrolled/completed)
   - Create custom course option

9.2. WHEN browsing THEN the System SHALL show title, difficulty, level count, ratings

