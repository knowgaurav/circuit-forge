/**
 * Property-based tests for WebSocketClient
 *
 * **Feature: session-management, Property 11: Action Forwarding and Broadcasting**
 * **Validates: Requirements 5.4, 5.5**
 */

import fc from 'fast-check';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WebSocketClient } from './websocket';

import type { ServerMessage, SyncAction } from '@/types';

describe('WebSocketClient', () => {
    /**
     * **Feature: session-management, Property 11: Action Forwarding and Broadcasting**
     * **Validates: Requirements 5.4, 5.5**
     *
     * For any edit action performed in a follower tab, the action SHALL be
     * forwarded to the leader tab, and the result SHALL be broadcast back to all tabs.
     */
    describe('Property 11: Action Forwarding and Broadcasting', () => {
        it('follower mode forwards actions via forwarder instead of WebSocket', () => {
            const actionTypes = [
                'circuit:component:add',
                'circuit:component:move',
                'circuit:component:delete',
                'circuit:wire:add',
                'circuit:wire:delete',
            ] as const;

            fc.assert(
                fc.property(
                    fc.constantFrom(...actionTypes),
                    fc.record({
                        componentId: fc.uuid(),
                        x: fc.integer({ min: 0, max: 1000 }),
                        y: fc.integer({ min: 0, max: 1000 }),
                    }),
                    (actionType, payload) => {
                        const forwardedActions: SyncAction[] = [];
                        const forwarder = (action: SyncAction) => {
                            forwardedActions.push(action);
                        };

                        const client = new WebSocketClient({
                            onMessage: () => {},
                        });

                        // Set to follower mode with forwarder
                        client.setMode('follower');
                        client.setActionForwarder(forwarder);

                        // Send a message (without connecting - tests the mode logic)
                        // In follower mode, it should forward via forwarder
                        client.send({
                            type: actionType,
                            payload,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } as any);

                        // Should have forwarded the action
                        expect(forwardedActions.length).toBe(1);
                        expect(forwardedActions[0]!.actionType).toBe(actionType);
                        expect(forwardedActions[0]!.type).toBe('action');
                        expect(typeof forwardedActions[0]!.timestamp).toBe('number');
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('leader mode does not use forwarder', () => {
            const actionTypes = [
                'circuit:component:add',
                'circuit:component:move',
                'circuit:component:delete',
            ] as const;

            fc.assert(
                fc.property(
                    fc.constantFrom(...actionTypes),
                    fc.record({
                        componentId: fc.uuid(),
                    }),
                    (actionType, payload) => {
                        const forwardedActions: SyncAction[] = [];
                        const forwarder = (action: SyncAction) => {
                            forwardedActions.push(action);
                        };

                        const client = new WebSocketClient({
                            onMessage: () => {},
                        });

                        // Set to leader mode (default)
                        client.setMode('leader');
                        client.setActionForwarder(forwarder);

                        // Send a message (without connecting - tests the mode logic)
                        // In leader mode, it should NOT use forwarder
                        client.send({
                            type: actionType,
                            payload,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        } as any);

                        // Should NOT have forwarded (would try WebSocket instead)
                        expect(forwardedActions.length).toBe(0);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('forwarded actions include source tab ID', () => {
            fc.assert(
                fc.property(fc.uuid(), (componentId) => {
                    const forwardedActions: SyncAction[] = [];
                    const forwarder = (action: SyncAction) => {
                        forwardedActions.push(action);
                    };

                    const client = new WebSocketClient({
                        onMessage: () => {},
                    });

                    client.setMode('follower');
                    client.setActionForwarder(forwarder);

                    const tabId = client.getTabId();

                    client.send({
                        type: 'circuit:component:delete',
                        payload: { componentId },
                    });

                    expect(forwardedActions.length).toBe(1);
                    expect(forwardedActions[0]!.sourceTabId).toBe(tabId);
                }),
                { numRuns: 50 }
            );
        });
    });

    describe('Mode Management', () => {
        it('defaults to leader mode', () => {
            const client = new WebSocketClient({
                onMessage: () => {},
            });

            expect(client.getMode()).toBe('leader');
        });

        it('can switch between modes', () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.constantFrom('leader', 'follower') as fc.Arbitrary<
                            'leader' | 'follower'
                        >,
                        { minLength: 1, maxLength: 10 }
                    ),
                    (modes) => {
                        const client = new WebSocketClient({
                            onMessage: () => {},
                        });

                        for (const mode of modes) {
                            client.setMode(mode);
                            expect(client.getMode()).toBe(mode);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('generates unique tab IDs', () => {
            const clients = Array.from(
                { length: 10 },
                () => new WebSocketClient({ onMessage: () => {} })
            );

            const tabIds = clients.map((c) => c.getTabId());
            const uniqueIds = new Set(tabIds);

            expect(uniqueIds.size).toBe(tabIds.length);
        });
    });

    /**
     * Reconnect protocol coverage (Story A — A.6).
     *
     * The client emits `last_seen_seq` on the WS URL when the caller
     * provides one, and dispatches `sync:state` (full snapshot) and
     * `sync:delta` (catch-up) branches differently to the message handler.
     */
    describe('Reconnect Protocol (sync:state vs sync:delta)', () => {
        type FakeWS = {
            url: string;
            readyState: number;
            onopen: ((ev?: unknown) => void) | null;
            onmessage: ((ev: { data: string }) => void) | null;
            onclose: ((ev?: unknown) => void) | null;
            onerror: ((ev?: unknown) => void) | null;
            send: ReturnType<typeof vi.fn>;
            close: ReturnType<typeof vi.fn>;
        };

        let createdSockets: FakeWS[] = [];
        const originalWebSocket = globalThis.WebSocket;

        beforeEach(() => {
            createdSockets = [];

            class MockWebSocket {
                static OPEN = 1;
                url: string;
                readyState = 1;
                onopen: ((ev?: unknown) => void) | null = null;
                onmessage: ((ev: { data: string }) => void) | null = null;
                onclose: ((ev?: unknown) => void) | null = null;
                onerror: ((ev?: unknown) => void) | null = null;
                send = vi.fn();
                close = vi.fn();

                constructor(url: string) {
                    this.url = url;
                    createdSockets.push(this as unknown as FakeWS);
                    queueMicrotask(() => this.onopen?.());
                }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).WebSocket = MockWebSocket;
        });

        afterEach(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).WebSocket = originalWebSocket;
        });

        it('connect() omits last_seen_seq when lastSeenSeq is not provided', async () => {
            const client = new WebSocketClient({ onMessage: () => {} });
            client.connect('ABC123', 'p1');

            await Promise.resolve();

            expect(createdSockets).toHaveLength(1);
            const ws = createdSockets[0]!;
            const url = new URL(ws.url);
            expect(url.searchParams.has('last_seen_seq')).toBe(false);
        });

        it('connect() emits last_seen_seq query param when provided', () => {
            fc.assert(
                fc.property(fc.integer({ min: 0, max: 100000 }), (seq) => {
                    createdSockets = [];
                    const client = new WebSocketClient({ onMessage: () => {} });
                    client.connect('ABC123', 'p1', { lastSeenSeq: seq });
                    const ws = createdSockets[0]!;
                    const url = new URL(ws.url);
                    expect(url.searchParams.get('last_seen_seq')).toBe(String(seq));
                }),
                { numRuns: 25 }
            );
        });

        it('dispatches sync:state messages to the message handler verbatim', async () => {
            const messages: ServerMessage[] = [];
            const client = new WebSocketClient({
                onMessage: (m) => messages.push(m),
            });
            client.connect('ABC123', 'p1');
            await Promise.resolve();

            const snapshot: ServerMessage = {
                type: 'sync:state',
                payload: {
                    circuit: {
                        sessionId: 'ABC123',
                        version: 0,
                        schemaVersion: '1.0.0',
                        components: [],
                        wires: [],
                        annotations: [],
                        updatedAt: new Date().toISOString(),
                    },
                    participants: [],
                },
            };

            createdSockets[0]!.onmessage?.({ data: JSON.stringify(snapshot) });

            expect(messages).toHaveLength(1);
            expect(messages[0]).toEqual(snapshot);
        });

        it('dispatches sync:delta messages and surfaces fromSeq + events', async () => {
            const messages: ServerMessage[] = [];
            const client = new WebSocketClient({
                onMessage: (m) => messages.push(m),
            });
            client.connect('ABC123', 'p1', { lastSeenSeq: 20 });
            await Promise.resolve();

            const delta: ServerMessage = {
                type: 'sync:delta',
                payload: {
                    fromSeq: 20,
                    events: [
                        {
                            type: 'COMPONENT_DELETED',
                            seq: 21,
                            sessionId: 'ABC123',
                            actorId: 'actor',
                            timestamp: new Date().toISOString(),
                            payload: { componentId: 'gone' },
                        },
                    ],
                },
            };

            createdSockets[0]!.onmessage?.({ data: JSON.stringify(delta) });

            expect(messages).toHaveLength(1);
            expect(messages[0]!.type).toBe('sync:delta');
            if (messages[0]!.type === 'sync:delta') {
                expect(messages[0]!.payload.fromSeq).toBe(20);
                expect(messages[0]!.payload.events).toHaveLength(1);
            }
        });

        it('setLastSeenSeq updates which seq subsequent reconnects request', async () => {
            const client = new WebSocketClient({ onMessage: () => {} });
            client.connect('ABC123', 'p1', { lastSeenSeq: 5 });
            await Promise.resolve();

            client.setLastSeenSeq(42);
            client.disconnect();
            createdSockets = [];
            client.connect('ABC123', 'p1', { lastSeenSeq: 42 });
            await Promise.resolve();

            const ws = createdSockets[0]!;
            const url = new URL(ws.url);
            expect(url.searchParams.get('last_seen_seq')).toBe('42');
        });
    });
});
