/**
 * CircuitForge Shared Type Definitions
 * Generated from JSON Schema definitions
 */

// ============================================================================
// Position and Basic Types
// ============================================================================

export interface Position {
    x: number;
    y: number;
}

export type Rotation = 0 | 90 | 180 | 270;

export type StrokeWidth = 2 | 4 | 8;

export type PinType = 'input' | 'output';

// ============================================================================
// Component Types
// ============================================================================

export type ComponentType =
    // Logic Gates (Basic)
    | 'AND_2' | 'AND_3' | 'AND_4' | 'OR_2' | 'OR_3' | 'OR_4'
    | 'NOT' | 'NAND_2' | 'NAND_3' | 'NOR_2' | 'NOR_3' | 'XOR_2' | 'XNOR_2' | 'BUFFER'
    // Flip-Flops
    | 'SR_LATCH' | 'D_FLIPFLOP' | 'JK_FLIPFLOP' | 'T_FLIPFLOP'
    // Combinational
    | 'MUX_2TO1' | 'MUX_4TO1' | 'DEMUX_1TO2' | 'DECODER_2TO4' | 'ADDER_4BIT' | 'COMPARATOR_4BIT' | 'BCD_TO_7SEG'
    // Sequential
    | 'COUNTER_4BIT' | 'SHIFT_REGISTER_8BIT' | 'TRAFFIC_LIGHT_CTRL'
    // Input Devices
    | 'SWITCH_TOGGLE' | 'SWITCH_PUSH' | 'DIP_SWITCH_4' | 'CLOCK' | 'CONST_HIGH' | 'CONST_LOW' | 'NUMERIC_INPUT'
    // Output Devices
    | 'LED_RED' | 'LED_GREEN' | 'LED_YELLOW' | 'LED_BLUE' | 'LED_RGB' | 'DISPLAY_7SEG' | 'DISPLAY_LCD' | 'BUZZER'
    | 'MOTOR_DC' | 'MOTOR_SERVO' | 'MOTOR_STEPPER'
    // Passive Components
    | 'RESISTOR' | 'CAPACITOR' | 'INDUCTOR' | 'DIODE' | 'ZENER' | 'TRANSISTOR_NPN' | 'TRANSISTOR_PNP'
    // Sensors
    | 'SENSOR_LIGHT' | 'SENSOR_TEMP' | 'SENSOR_PROXIMITY' | 'SENSOR_ULTRASONIC' | 'POTENTIOMETER'
    // Power
    | 'VCC_5V' | 'VCC_3V3' | 'GROUND' | 'BATTERY'
    // Connectors
    | 'JUNCTION' | 'BUS_4BIT' | 'BUS_8BIT' | 'PIN_INPUT' | 'PIN_OUTPUT' | 'PROBE';

// ============================================================================
// Circuit Components
// ============================================================================

export interface Pin {
    id: string;
    name: string;
    type: PinType;
    position: Position;
}

export interface CircuitComponent {
    id: string;
    type: ComponentType;
    label: string;  // User-editable label for identification (e.g., "AND1", "LED2")
    position: Position;
    rotation: Rotation;
    properties: Record<string, unknown>;
    pins: Pin[];
}

export interface Wire {
    id: string;
    fromComponentId: string;
    fromPinId: string;
    toComponentId: string;
    toPinId: string;
    waypoints: Position[];
}

// ============================================================================
// Annotations
// ============================================================================

export interface StrokeData {
    points: Position[];
    color: string;
    width: StrokeWidth;
}

export interface TextData {
    content: string;
    position: Position;
    fontSize: number;
}

export type AnnotationType = 'stroke' | 'text';

export interface Annotation {
    id: string;
    type: AnnotationType;
    userId: string;
    data: StrokeData | TextData;
}

// ============================================================================
// Circuit State
// ============================================================================

export const SCHEMA_VERSION = '1.0.0';

export interface CircuitState {
    sessionId: string;
    version: number;
    schemaVersion: string;
    components: CircuitComponent[];
    wires: Wire[];
    annotations: Annotation[];
    updatedAt: string;
}

// ============================================================================
// Session and Participants
// ============================================================================

export type Role = 'teacher' | 'student';

export type EditRequestStatus = 'pending' | 'approved' | 'denied';

export interface Session {
    code: string;
    createdAt: string;
    lastActivityAt: string;
    creatorParticipantId: string;
}

export interface Participant {
    id: string;
    sessionCode: string;
    displayName: string;
    role: Role;
    canEdit: boolean;
    color: string;
    isActive: boolean;
    lastSeenAt: string;
}

export interface EditRequest {
    participantId: string;
    displayName: string;
    requestedAt: string;
    status: EditRequestStatus;
}

// ============================================================================
// Events (Event Sourcing)
// ============================================================================

export type CircuitEventType =
    | 'COMPONENT_ADDED'
    | 'COMPONENT_MOVED'
    | 'COMPONENT_DELETED'
    | 'WIRE_ADDED'
    | 'WIRE_DELETED'
    | 'ANNOTATION_ADDED'
    | 'ANNOTATION_DELETED';

export interface BaseEvent {
    sessionCode: string;
    version: number;
    type: CircuitEventType;
    userId: string;
    timestamp: string;
}

export interface ComponentAddedEvent extends BaseEvent {
    type: 'COMPONENT_ADDED';
    payload: { component: CircuitComponent };
}

export interface ComponentMovedEvent extends BaseEvent {
    type: 'COMPONENT_MOVED';
    payload: { componentId: string; position: Position };
}

export interface ComponentDeletedEvent extends BaseEvent {
    type: 'COMPONENT_DELETED';
    payload: { componentId: string };
}

export interface WireAddedEvent extends BaseEvent {
    type: 'WIRE_ADDED';
    payload: { wire: Wire };
}

export interface WireDeletedEvent extends BaseEvent {
    type: 'WIRE_DELETED';
    payload: { wireId: string };
}

export interface AnnotationAddedEvent extends BaseEvent {
    type: 'ANNOTATION_ADDED';
    payload: { annotation: Annotation };
}

export interface AnnotationDeletedEvent extends BaseEvent {
    type: 'ANNOTATION_DELETED';
    payload: { annotationId: string };
}

export type CircuitEvent =
    | ComponentAddedEvent
    | ComponentMovedEvent
    | ComponentDeletedEvent
    | WireAddedEvent
    | WireDeletedEvent
    | AnnotationAddedEvent
    | AnnotationDeletedEvent;

// ============================================================================
// WebSocket Messages
// ============================================================================

// Client -> Server
export type ClientMessageType =
    | 'circuit:component:add'
    | 'circuit:component:move'
    | 'circuit:component:delete'
    | 'circuit:wire:add'
    | 'circuit:wire:delete'
    | 'circuit:annotation:add'
    | 'circuit:annotation:delete'
    | 'circuit:undo'
    | 'circuit:redo'
    | 'presence:cursor:move'
    | 'presence:selection:change'
    | 'permission:request:edit'
    | 'permission:approve'
    | 'permission:deny'
    | 'permission:revoke'
    | 'permission:kick'
    | 'simulation:start'
    | 'simulation:stop'
    | 'simulation:toggle'
    | 'simulation:clock:tick'
    | 'simulation:step'
    | 'simulation:state';

export type ClientMessage =
    | { type: 'circuit:component:add'; payload: { component: CircuitComponent } }
    | { type: 'circuit:component:move'; payload: { componentId: string; position: Position } }
    | { type: 'circuit:component:delete'; payload: { componentId: string } }
    | { type: 'circuit:wire:add'; payload: { wire: Wire } }
    | { type: 'circuit:wire:delete'; payload: { wireId: string } }
    | { type: 'circuit:annotation:add'; payload: { annotation: Annotation } }
    | { type: 'circuit:annotation:delete'; payload: { annotationId: string } }
    | { type: 'circuit:undo'; payload: Record<string, never> }
    | { type: 'circuit:redo'; payload: Record<string, never> }
    | { type: 'presence:cursor:move'; payload: { position: Position } }
    | { type: 'presence:selection:change'; payload: { componentIds: string[] } }
    | { type: 'permission:request:edit'; payload: Record<string, never> }
    | { type: 'permission:approve'; payload: { participantId: string } }
    | { type: 'permission:deny'; payload: { participantId: string } }
    | { type: 'permission:revoke'; payload: { participantId: string } }
    | { type: 'permission:kick'; payload: { participantId: string } }
    | { type: 'simulation:start'; payload: Record<string, never> }
    | { type: 'simulation:stop'; payload: Record<string, never> }
    | { type: 'simulation:toggle'; payload: { componentId: string } }
    | { type: 'simulation:clock:tick'; payload: { componentId: string } }
    | { type: 'simulation:step'; payload: Record<string, never> }
    | { type: 'simulation:state'; payload: { wireStates: Record<string, string>; pinStates: Record<string, Record<string, string>>; errors: Array<{ errorType: string; message: string; componentId?: string; pinId?: string }> } };

// Server -> Client
export type ServerMessageType =
    | 'sync:state'
    | 'circuit:component:added'
    | 'circuit:component:moved'
    | 'circuit:component:deleted'
    | 'circuit:wire:added'
    | 'circuit:wire:deleted'
    | 'circuit:annotation:added'
    | 'circuit:annotation:deleted'
    | 'circuit:state:updated'
    | 'presence:cursor:moved'
    | 'presence:selection:changed'
    | 'presence:participant:joined'
    | 'presence:participant:left'
    | 'presence:participant:kicked'
    | 'permission:request:sent'
    | 'permission:request:received'
    | 'permission:granted'
    | 'permission:denied'
    | 'permission:revoked'
    | 'session:kicked'
    | 'simulation:started'
    | 'simulation:stopped'
    | 'simulation:state:updated'
    | 'error';

export type ServerMessage =
    | { type: 'sync:state'; payload: { circuit: CircuitState; participants: Participant[] } }
    | { type: 'circuit:component:added'; payload: { component: CircuitComponent; userId: string } }
    | { type: 'circuit:component:moved'; payload: { componentId: string; position: Position; userId: string } }
    | { type: 'circuit:component:deleted'; payload: { componentId: string; userId: string } }
    | { type: 'circuit:wire:added'; payload: { wire: Wire; userId: string } }
    | { type: 'circuit:wire:deleted'; payload: { wireId: string; userId: string } }
    | { type: 'circuit:annotation:added'; payload: { annotation: Annotation; userId: string } }
    | { type: 'circuit:annotation:deleted'; payload: { annotationId: string; userId: string } }
    | { type: 'circuit:state:updated'; payload: { version: number } }
    | { type: 'presence:cursor:moved'; payload: { participantId: string; position: Position } }
    | { type: 'presence:selection:changed'; payload: { participantId: string; componentIds: string[] } }
    | { type: 'presence:participant:joined'; payload: { participant: Participant } }
    | { type: 'presence:participant:left'; payload: { participantId: string } }
    | { type: 'presence:participant:kicked'; payload: { participantId: string; displayName: string } }
    | { type: 'permission:request:sent'; payload: { participantId: string; status: string } }
    | { type: 'permission:request:received'; payload: { participantId: string; displayName: string } }
    | { type: 'permission:granted'; payload: { participantId: string } }
    | { type: 'permission:denied'; payload: { participantId: string } }
    | { type: 'permission:revoked'; payload: { participantId: string } }
    | { type: 'session:kicked'; payload: { participantId: string } }
    | { type: 'simulation:started'; payload: { startedBy: string } }
    | { type: 'simulation:stopped'; payload: { stoppedBy: string } }
    | { type: 'simulation:state:updated'; payload: { isRunning: boolean; wireStates: Record<string, string>; pinStates: Record<string, Record<string, string>>; errors: Array<{ errorType: string; message: string; componentId?: string; pinId?: string }> } }
    | { type: 'error'; payload: { code: string; message: string } };

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiError {
    error: {
        code: string;
        message: string;
        requestId?: string;
    };
}

export interface CreateSessionResponse {
    code: string;
}

export interface JoinSessionRequest {
    displayName: string;
    participantId?: string;
}

export interface JoinSessionResponse {
    participant: Participant;
}


// ============================================================================
// Session Management - Cross-Tab Synchronization Types
// ============================================================================

/**
 * State broadcast between tabs via BroadcastChannel
 */
export interface SyncState {
    type: 'state';
    sessionCode: string;
    circuit: CircuitState;
    participants: Participant[];
    currentParticipant: Participant;
    isConnected: boolean;
    isSimulationRunning: boolean;
    timestamp: number;
}

/**
 * Actions forwarded from follower tabs to leader
 */
export interface SyncAction {
    type: 'action';
    actionType: string; // e.g., 'circuit:component:add'
    payload: unknown;
    sourceTabId: string;
    timestamp: number;
}

/**
 * Stored in localStorage for leader election
 */
export interface SessionLock {
    tabId: string;
    sessionCode: string;
    acquiredAt: number;
    lastHeartbeat: number;
}

/**
 * Union type for all BroadcastChannel messages
 */
export type BroadcastMessage =
    | { type: 'leader:announce'; tabId: string; timestamp: number }
    | { type: 'leader:heartbeat'; tabId: string; timestamp: number }
    | { type: 'state:sync'; state: SyncState }
    | { type: 'state:request'; tabId: string }
    | { type: 'action:forward'; action: SyncAction }
    | { type: 'action:result'; action: SyncAction; success: boolean };

/**
 * Session data persisted to localStorage for recovery
 */
export interface PersistedSession {
    sessionCode: string;
    participantId: string;
    displayName: string;
    savedAt: number; // timestamp
    schemaVersion: string;
}

/**
 * Options for session close guard
 */
export interface CloseGuardOptions {
    isTeacher: boolean;
    studentCount: number;
    onLeaveConfirmed: () => void;
    onLeaveCancelled: () => void;
}

/**
 * Tab sync connection status
 */
export type TabSyncStatus = 'leader' | 'follower' | 'disconnected';


// ============================================================================
// Course Types (LLM Course Generator)
// ============================================================================

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type GenerationState =
    | 'not_queued'
    | 'queued_priority'
    | 'queued_background'
    | 'generating'
    | 'generated'
    | 'failed';

export type LevelStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface LevelOutline {
    levelNumber: number;
    title: string;
    description: string;
}

export interface CoursePlan {
    id: string;
    topic: string;
    title: string;
    description: string;
    difficulty: Difficulty;
    estimatedHours: number;
    levels: LevelOutline[];
    createdAt: string;
    creatorParticipantId?: string;
}

export interface KeyTerm {
    term: string;
    definition: string;
}

export interface TheorySection {
    objectives: string[];
    conceptExplanation: string;
    realWorldExamples: string[];
    keyTerms: KeyTerm[];
}

export interface ComponentSpec {
    type: string;
    count: number;
    properties?: Record<string, unknown>;
}

export interface BuildStep {
    stepNumber: number;
    instruction: string;
    hint?: string;
}

export interface RequiredComponent {
    type: string;
    minCount: number;
}

export interface RequiredConnection {
    from: string;
    to: string;
}

export interface ValidationCriteria {
    requiredComponents: RequiredComponent[];
    requiredConnections: RequiredConnection[];
}

// Circuit Blueprint Types (for LLM-generated circuits)
export interface BlueprintComponent {
    type: string;
    label: string;
    position: Position;
    properties?: Record<string, unknown>;
}

export interface BlueprintWire {
    from: string;  // e.g., "AND1:Y" (label:pinName)
    to: string;    // e.g., "LED1:A"
}

export interface CircuitBlueprint {
    components: BlueprintComponent[];
    wires: BlueprintWire[];
}

export interface PracticalSection {
    componentsNeeded: ComponentSpec[];
    steps: BuildStep[];
    expectedBehavior: string;
    validationCriteria: ValidationCriteria;
    commonMistakes: string[];
    circuitBlueprint?: CircuitBlueprint;
}

export interface LevelContent {
    id: string;
    coursePlanId: string;
    levelNumber: number;
    generationState: GenerationState;
    celeryTaskId?: string;
    theory?: TheorySection;
    practical?: PracticalSection;
    generatedAt?: string;
    tokenUsage?: number;
    errorMessage?: string;
}

export interface CourseEnrollment {
    id: string;
    participantId: string;
    coursePlanId: string;
    currentLevel: number;
    startedAt: string;
    lastActivityAt: string;
}

export interface LevelProgress {
    id: string;
    enrollmentId: string;
    levelNumber: number;
    status: LevelStatus;
    circuitSnapshot?: CircuitState;
    timeSpentSeconds: number;
    validationAttempts: number;
    completedAt?: string;
}

export interface TopicSuggestion {
    topic: string;
    title: string;
    description: string;
    difficulty: Difficulty;
    estimatedLevels: number;
    category: string;
}

export interface ValidationResult {
    isValid: boolean;
    missingComponents: string[];
    missingConnections: string[];
    feedback: string;
}

export interface MyCourseItem {
    enrollment: CourseEnrollment;
    coursePlan: CoursePlan;
    completedLevels: number;
    totalLevels: number;
}
