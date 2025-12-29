/**
 * WebSocket client for real-time collaboration
 * Enhanced with leader/follower mode for cross-tab synchronization
 */

import type { ClientMessage, ServerMessage, Position, SyncAction } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/ws';

type MessageHandler = (message: ServerMessage) => void;
type ActionForwarder = (action: SyncAction) => void;
type ConnectionMode = 'leader' | 'follower';

interface WebSocketClientOptions {
    onMessage: MessageHandler;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onReconnecting?: () => void;
}

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private sessionCode: string = '';
    private participantId: string = '';
    private options: WebSocketClientOptions;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isIntentionalClose = false;
    private cursorThrottleTimeout: NodeJS.Timeout | null = null;
    private lastCursorPosition: Position | null = null;

    // Leader/follower mode support
    private mode: ConnectionMode = 'leader';
    private actionForwarder: ActionForwarder | null = null;
    private tabId: string = '';

    constructor(options: WebSocketClientOptions) {
        this.options = options;
        this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Set the connection mode (leader or follower)
     * In follower mode, actions are forwarded via BroadcastChannel instead of WebSocket
     */
    setMode(mode: ConnectionMode): void {
        this.mode = mode;
    }

    /**
     * Get the current connection mode
     */
    getMode(): ConnectionMode {
        return this.mode;
    }

    /**
     * Set the action forwarder for follower mode
     */
    setActionForwarder(forwarder: ActionForwarder): void {
        this.actionForwarder = forwarder;
    }

    /**
     * Get the tab ID for this client
     */
    getTabId(): string {
        return this.tabId;
    }

    connect(sessionCode: string, participantId: string): void {
        this.sessionCode = sessionCode;
        this.participantId = participantId;
        this.isIntentionalClose = false;
        this.reconnectAttempts = 0;
        this.createConnection();
    }

    private createConnection(): void {
        const url = `${WS_URL}/${this.sessionCode}/${this.participantId}`;

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.options.onConnect?.();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: ServerMessage = JSON.parse(event.data);
                    this.options.onMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                if (!this.isIntentionalClose) {
                    this.options.onDisconnect?.();
                    this.attemptReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.attemptReconnect();
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        this.options.onReconnecting?.();

        // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);

        this.reconnectTimeout = setTimeout(() => {
            this.createConnection();
        }, delay);
    }

    disconnect(): void {
        this.isIntentionalClose = true;

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.cursorThrottleTimeout) {
            clearTimeout(this.cursorThrottleTimeout);
            this.cursorThrottleTimeout = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    send(message: ClientMessage): void {
        // In follower mode, forward actions to leader via BroadcastChannel
        if (this.mode === 'follower' && this.actionForwarder) {
            const action: SyncAction = {
                type: 'action',
                actionType: message.type,
                payload: message.payload,
                sourceTabId: this.tabId,
                timestamp: Date.now(),
            };
            this.actionForwarder(action);
            return;
        }

        // In leader mode, send directly via WebSocket
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send a message directly via WebSocket (bypasses follower mode)
     * Used by leader to process forwarded actions
     */
    sendDirect(message: ClientMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    // Circuit operations
    addComponent(component: unknown): void {
        this.send({ type: 'circuit:component:add', payload: { component } } as ClientMessage);
    }

    moveComponent(componentId: string, position: Position): void {
        this.send({ type: 'circuit:component:move', payload: { componentId, position } });
    }

    deleteComponent(componentId: string): void {
        this.send({ type: 'circuit:component:delete', payload: { componentId } });
    }

    addWire(wire: unknown): void {
        this.send({ type: 'circuit:wire:add', payload: { wire } } as ClientMessage);
    }

    deleteWire(wireId: string): void {
        this.send({ type: 'circuit:wire:delete', payload: { wireId } });
    }

    addAnnotation(annotation: unknown): void {
        this.send({ type: 'circuit:annotation:add', payload: { annotation } } as ClientMessage);
    }

    deleteAnnotation(annotationId: string): void {
        this.send({ type: 'circuit:annotation:delete', payload: { annotationId } });
    }

    undo(): void {
        this.send({ type: 'circuit:undo', payload: {} });
    }

    redo(): void {
        this.send({ type: 'circuit:redo', payload: {} });
    }

    // Presence
    moveCursor(position: Position): void {
        // Throttle cursor updates to 50ms
        this.lastCursorPosition = position;

        if (!this.cursorThrottleTimeout) {
            this.cursorThrottleTimeout = setTimeout(() => {
                if (this.lastCursorPosition) {
                    this.send({ type: 'presence:cursor:move', payload: { position: this.lastCursorPosition } });
                }
                this.cursorThrottleTimeout = null;
            }, 50);
        }
    }

    changeSelection(componentIds: string[]): void {
        this.send({ type: 'presence:selection:change', payload: { componentIds } });
    }

    // Permissions
    requestEditAccess(): void {
        this.send({ type: 'permission:request:edit', payload: {} });
    }

    approveEditRequest(participantId: string): void {
        this.send({ type: 'permission:approve', payload: { participantId } });
    }

    denyEditRequest(participantId: string): void {
        this.send({ type: 'permission:deny', payload: { participantId } });
    }

    revokeEditPermission(participantId: string): void {
        this.send({ type: 'permission:revoke', payload: { participantId } });
    }

    kickParticipant(participantId: string): void {
        this.send({ type: 'permission:kick', payload: { participantId } });
    }

    // Simulation
    startSimulation(): void {
        this.send({ type: 'simulation:start', payload: {} });
    }

    stopSimulation(): void {
        this.send({ type: 'simulation:stop', payload: {} });
    }

    sendSimulationState(wireStates: Record<string, string>, pinStates: Record<string, Record<string, string>>, errors: Array<{ errorType: string; message: string; componentId?: string; pinId?: string }>): void {
        this.send({ type: 'simulation:state', payload: { wireStates, pinStates, errors } } as ClientMessage);
    }

    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}
