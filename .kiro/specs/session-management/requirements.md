# Requirements Document: Session Management Improvements

## Introduction

This document specifies the requirements for improving session management in CircuitForge. The enhancements focus on three key areas: preventing accidental session closure when students are actively participating, synchronizing session state across multiple browser tabs, and ensuring a seamless user experience when navigating between pages or opening the application in new tabs.

Currently, users can accidentally close or navigate away from an active session, losing their connection. Additionally, opening the same session in a new tab creates a separate connection rather than sharing the existing session state. These improvements will provide a more robust and user-friendly collaborative experience.

## Glossary

- **Session**: A collaborative workspace identified by a 6-character code where a teacher and students work on circuit designs together
- **Participant**: A user connected to a session, either as a teacher or student
- **Active Session**: A session with at least one connected participant (teacher or student)
- **Session Close Protection**: A mechanism that warns users before they accidentally close or navigate away from an active session
- **Cross-Tab Synchronization**: The ability to share session state and connection across multiple browser tabs
- **BroadcastChannel**: A Web API that allows communication between browsing contexts (tabs, windows) of the same origin
- **Leader Tab**: The primary tab that maintains the WebSocket connection in a multi-tab scenario
- **Follower Tab**: Secondary tabs that receive session updates from the leader tab
- **Session Lock**: A mechanism using localStorage to coordinate which tab owns the WebSocket connection

## Requirements

### Requirement 1: Session Close Protection

**User Story:** As a teacher, I want to be warned before accidentally closing a session with active students, so that I don't disrupt the learning experience.

#### Acceptance Criteria

1.1. WHILE a session has one or more students connected THEN the System SHALL register a `beforeunload` event handler that displays a browser confirmation dialog when the teacher attempts to close the tab or navigate away

1.2. WHILE a session has one or more students connected THEN the System SHALL display a custom in-app confirmation modal when the teacher clicks the "Leave" button, showing the number of connected students

1.3. WHEN a teacher confirms leaving a session with active students THEN the System SHALL gracefully disconnect and redirect to the homepage

1.4. WHEN a teacher cancels the leave action THEN the System SHALL keep the session active and maintain all connections

1.5. WHILE a student is connected to a session THEN the System SHALL register a `beforeunload` event handler that displays a browser confirmation dialog when the student attempts to close the tab or navigate away

1.6. WHEN a user navigates to the homepage using the browser's back button while in an active session THEN the System SHALL display a confirmation dialog before leaving

### Requirement 2: Cross-Tab Session Synchronization

**User Story:** As a user, I want my session to be synchronized across multiple browser tabs, so that I can open the same session in a new tab without creating duplicate connections.

#### Acceptance Criteria

2.1. WHEN a user opens the same session URL in a new browser tab THEN the System SHALL detect the existing session and synchronize state from the active tab

2.2. WHEN multiple tabs are open for the same session THEN the System SHALL designate one tab as the "leader" that maintains the WebSocket connection

2.3. WHEN the leader tab is closed THEN the System SHALL promote another open tab to become the new leader and establish a WebSocket connection

2.4. WHEN circuit state changes occur THEN the System SHALL broadcast updates to all tabs via BroadcastChannel API

2.5. WHEN a new tab joins an existing session THEN the System SHALL receive the current circuit state, participant list, and connection status from the leader tab

2.6. WHEN displaying connection status THEN follower tabs SHALL show "Connected (synced)" to indicate they are receiving updates from the leader tab

2.7. WHEN the leader tab loses WebSocket connection THEN all follower tabs SHALL display "Reconnecting..." status until connection is restored

### Requirement 3: Session State Persistence

**User Story:** As a user, I want my session state to persist when I accidentally close a tab, so that I can quickly rejoin without losing my place.

#### Acceptance Criteria

3.1. WHEN a user closes all tabs for a session THEN the System SHALL store the session code and participant ID in localStorage for 24 hours

3.2. WHEN a user visits the homepage within 24 hours of leaving a session THEN the System SHALL display a "Rejoin Session" prompt showing the session code

3.3. WHEN a user clicks "Rejoin Session" THEN the System SHALL redirect to the session page and automatically reconnect with the same participant identity

3.4. WHEN a user dismisses the "Rejoin Session" prompt THEN the System SHALL clear the stored session data from localStorage

3.5. WHEN serializing session state to localStorage THEN the System SHALL produce valid JSON containing session code, participant ID, display name, and timestamp

3.6. WHEN deserializing session state from localStorage THEN the System SHALL reconstruct the session context for rejoining

3.7. WHEN serializing and then deserializing session state THEN the System SHALL produce an equivalent session context (round-trip consistency)

### Requirement 4: Tab Coordination Protocol

**User Story:** As a developer, I want a reliable protocol for coordinating session state across tabs, so that the system handles edge cases gracefully.

#### Acceptance Criteria

4.1. WHEN a tab opens a session THEN the System SHALL check localStorage for an existing session lock before establishing a WebSocket connection

4.2. WHEN no session lock exists THEN the System SHALL acquire the lock and become the leader tab

4.3. WHEN a session lock exists and is less than 5 seconds old THEN the System SHALL become a follower tab and request state from the leader

4.4. WHEN a session lock exists but is more than 5 seconds old (stale) THEN the System SHALL acquire the lock and become the new leader

4.5. WHILE a tab is the leader THEN the System SHALL update the session lock timestamp every 2 seconds to indicate liveness

4.6. WHEN a follower tab does not receive a heartbeat from the leader for 5 seconds THEN the System SHALL attempt to acquire leadership

4.7. WHEN multiple tabs attempt to acquire leadership simultaneously THEN the System SHALL use a deterministic tie-breaker (lowest tab ID wins)

### Requirement 5: User Experience During Tab Sync

**User Story:** As a user, I want clear visual feedback about my session's synchronization status, so that I understand how my tabs are connected.

#### Acceptance Criteria

5.1. WHEN a tab is the leader THEN the System SHALL display a subtle indicator showing "Primary connection"

5.2. WHEN a tab is a follower THEN the System SHALL display a subtle indicator showing "Synced with another tab"

5.3. WHEN a follower tab becomes the leader THEN the System SHALL display a brief notification "Connection transferred to this tab"

5.4. WHEN a user performs an edit action in a follower tab THEN the System SHALL forward the action to the leader tab for WebSocket transmission

5.5. WHEN the leader tab processes an action from a follower THEN the System SHALL broadcast the result back to all tabs

