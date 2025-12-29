/**
 * Property-based tests for WebSocketClient
 * 
 * **Feature: session-management, Property 11: Action Forwarding and Broadcasting**
 * **Validates: Requirements 5.4, 5.5**
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { WebSocketClient } from './websocket';
import type { SyncAction } from '@/types';

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
                            onMessage: () => { },
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
                        expect(forwardedActions[0].actionType).toBe(actionType);
                        expect(forwardedActions[0].type).toBe('action');
                        expect(typeof forwardedActions[0].timestamp).toBe('number');
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
                            onMessage: () => { },
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
                fc.property(
                    fc.uuid(),
                    (componentId) => {
                        const forwardedActions: SyncAction[] = [];
                        const forwarder = (action: SyncAction) => {
                            forwardedActions.push(action);
                        };

                        const client = new WebSocketClient({
                            onMessage: () => { },
                        });

                        client.setMode('follower');
                        client.setActionForwarder(forwarder);

                        const tabId = client.getTabId();

                        client.send({
                            type: 'circuit:component:delete',
                            payload: { componentId },
                        });

                        expect(forwardedActions.length).toBe(1);
                        expect(forwardedActions[0].sourceTabId).toBe(tabId);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    describe('Mode Management', () => {
        it('defaults to leader mode', () => {
            const client = new WebSocketClient({
                onMessage: () => { },
            });

            expect(client.getMode()).toBe('leader');
        });

        it('can switch between modes', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.constantFrom('leader', 'follower') as fc.Arbitrary<'leader' | 'follower'>, { minLength: 1, maxLength: 10 }),
                    (modes) => {
                        const client = new WebSocketClient({
                            onMessage: () => { },
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
            const clients = Array.from({ length: 10 }, () =>
                new WebSocketClient({ onMessage: () => { } })
            );

            const tabIds = clients.map(c => c.getTabId());
            const uniqueIds = new Set(tabIds);

            expect(uniqueIds.size).toBe(tabIds.length);
        });
    });
});
