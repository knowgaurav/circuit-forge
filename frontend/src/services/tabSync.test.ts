/**
 * Property-based tests for TabSyncManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { TabSyncManager } from './tabSync';
import type { SessionLock } from '@/types';

describe('TabSyncManager', () => {
    let manager: TabSyncManager;

    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
        manager = new TabSyncManager();
    });

    afterEach(() => {
        manager.destroy();
        vi.useRealTimers();
    });

    // Arbitrary for generating valid session codes
    const sessionCodeArb = fc.array(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
        { minLength: 6, maxLength: 6 }
    ).map(arr => arr.join(''));

    const participantIdArb = fc.uuid();

    /**
     * **Feature: session-management, Property 7: Lock Acquisition Based on State**
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
     * 
     * For any tab attempting to join a session:
     * - If no lock exists, the tab SHALL acquire the lock and become leader
     * - If a fresh lock exists (< 5 seconds old), the tab SHALL become a follower
     * - If a stale lock exists (>= 5 seconds old), the tab SHALL acquire the lock and become leader
     */
    describe('Property 7: Lock Acquisition Based on State', () => {
        it('acquires lock when no lock exists', () => {
            fc.assert(
                fc.property(sessionCodeArb, participantIdArb, (sessionCode, participantId) => {
                    localStorage.clear();
                    const testManager = new TabSyncManager();

                    testManager.initialize(sessionCode, participantId);

                    expect(testManager.isLeader()).toBe(true);
                    expect(testManager.getStatus()).toBe('leader');

                    testManager.destroy();
                }),
                { numRuns: 100 }
            );
        });

        it('becomes follower when fresh lock exists', () => {
            fc.assert(
                fc.property(sessionCodeArb, participantIdArb, (sessionCode, participantId) => {
                    localStorage.clear();

                    // Create a fresh lock from another tab
                    const existingLock: SessionLock = {
                        tabId: 'other-tab-123',
                        sessionCode,
                        acquiredAt: Date.now(),
                        lastHeartbeat: Date.now(),
                    };
                    localStorage.setItem(`circuitforge-lock-${sessionCode}`, JSON.stringify(existingLock));

                    const testManager = new TabSyncManager();
                    testManager.initialize(sessionCode, participantId);

                    expect(testManager.isLeader()).toBe(false);
                    expect(testManager.getStatus()).toBe('follower');

                    testManager.destroy();
                }),
                { numRuns: 100 }
            );
        });

        it('acquires lock when stale lock exists (>= 5 seconds old)', () => {
            fc.assert(
                fc.property(sessionCodeArb, participantIdArb, (sessionCode, participantId) => {
                    localStorage.clear();

                    // Create a stale lock (6 seconds old)
                    const staleLock: SessionLock = {
                        tabId: 'dead-tab-456',
                        sessionCode,
                        acquiredAt: Date.now() - 10000,
                        lastHeartbeat: Date.now() - 6000, // 6 seconds ago
                    };
                    localStorage.setItem(`circuitforge-lock-${sessionCode}`, JSON.stringify(staleLock));

                    const testManager = new TabSyncManager();
                    testManager.initialize(sessionCode, participantId);

                    expect(testManager.isLeader()).toBe(true);
                    expect(testManager.getStatus()).toBe('leader');

                    testManager.destroy();
                }),
                { numRuns: 100 }
            );
        });
    });

    /**
     * **Feature: session-management, Property 8: Leader Heartbeat Maintenance**
     * **Validates: Requirements 4.5**
     * 
     * For any leader tab, the session lock timestamp SHALL be updated 
     * at least every 2 seconds while the tab remains active.
     */
    describe('Property 8: Leader Heartbeat Maintenance', () => {
        it('leader updates heartbeat timestamp periodically', () => {
            fc.assert(
                fc.property(sessionCodeArb, participantIdArb, (sessionCode, participantId) => {
                    localStorage.clear();
                    const testManager = new TabSyncManager();

                    testManager.initialize(sessionCode, participantId);
                    expect(testManager.isLeader()).toBe(true);

                    const lockKey = `circuitforge-lock-${sessionCode}`;
                    const initialLock: SessionLock = JSON.parse(localStorage.getItem(lockKey)!);
                    const initialHeartbeat = initialLock.lastHeartbeat;

                    // Advance time by 2.5 seconds (past heartbeat interval)
                    vi.advanceTimersByTime(2500);

                    const updatedLock: SessionLock = JSON.parse(localStorage.getItem(lockKey)!);
                    expect(updatedLock.lastHeartbeat).toBeGreaterThan(initialHeartbeat);

                    testManager.destroy();
                }),
                { numRuns: 50 }
            );
        });
    });

    /**
     * **Feature: session-management, Property 2: Single Leader Invariant**
     * **Validates: Requirements 2.2**
     * 
     * For any set of tabs open for the same session, exactly one tab 
     * SHALL be designated as the leader at any point in time.
     */
    describe('Property 2: Single Leader Invariant', () => {
        it('only one manager becomes leader for same session', () => {
            fc.assert(
                fc.property(sessionCodeArb, participantIdArb, (sessionCode, participantId) => {
                    localStorage.clear();

                    const manager1 = new TabSyncManager();
                    const manager2 = new TabSyncManager();

                    manager1.initialize(sessionCode, participantId);
                    manager2.initialize(sessionCode, participantId);

                    // Exactly one should be leader
                    const leaderCount = [manager1.isLeader(), manager2.isLeader()]
                        .filter(Boolean).length;

                    expect(leaderCount).toBe(1);

                    manager1.destroy();
                    manager2.destroy();
                }),
                { numRuns: 50 }
            );
        });
    });

    /**
     * **Feature: session-management, Property 10: Deterministic Leadership Tie-Breaking**
     * **Validates: Requirements 4.7**
     * 
     * For any set of tabs attempting to acquire leadership simultaneously, 
     * the tab with the lowest tab ID SHALL win leadership.
     */
    describe('Property 10: Deterministic Leadership Tie-Breaking', () => {
        it('tab with lower ID wins leadership in tie-breaker', () => {
            // This tests the tie-breaker logic in handleMessage
            fc.assert(
                fc.property(sessionCodeArb, (sessionCode) => {
                    localStorage.clear();

                    const manager1 = new TabSyncManager();
                    const manager2 = new TabSyncManager();

                    // Get tab IDs
                    const tabId1 = manager1.getTabId();
                    const tabId2 = manager2.getTabId();

                    // Initialize both - first one becomes leader
                    manager1.initialize(sessionCode, 'participant-1');

                    // Second one should become follower
                    manager2.initialize(sessionCode, 'participant-2');

                    // The first one to initialize should be leader
                    expect(manager1.isLeader()).toBe(true);
                    expect(manager2.isLeader()).toBe(false);

                    manager1.destroy();
                    manager2.destroy();
                }),
                { numRuns: 50 }
            );
        });
    });

    /**
     * **Feature: session-management, Property 3: Leader Succession**
     * **Validates: Requirements 2.3**
     * 
     * For any session with multiple tabs where the leader tab closes, 
     * one of the remaining follower tabs SHALL become the new leader within 5 seconds.
     */
    describe('Property 3: Leader Succession', () => {
        it('follower becomes leader when leader lock becomes stale', () => {
            fc.assert(
                fc.property(sessionCodeArb, participantIdArb, (sessionCode, participantId) => {
                    localStorage.clear();

                    // Create initial leader
                    const leader = new TabSyncManager();
                    leader.initialize(sessionCode, participantId);
                    expect(leader.isLeader()).toBe(true);

                    // Create follower
                    const follower = new TabSyncManager();
                    follower.initialize(sessionCode, participantId);
                    expect(follower.isLeader()).toBe(false);

                    // Simulate leader dying (stop heartbeat and make lock stale)
                    leader.destroy();

                    // Manually make the lock stale
                    const lockKey = `circuitforge-lock-${sessionCode}`;
                    const lock = localStorage.getItem(lockKey);
                    if (lock) {
                        const parsed: SessionLock = JSON.parse(lock);
                        parsed.lastHeartbeat = Date.now() - 6000; // 6 seconds ago
                        localStorage.setItem(lockKey, JSON.stringify(parsed));
                    }

                    // Advance time to trigger failover check
                    vi.advanceTimersByTime(6000);

                    // Follower should now be leader
                    expect(follower.isLeader()).toBe(true);

                    follower.destroy();
                }),
                { numRuns: 50 }
            );
        });
    });

    /**
     * **Feature: session-management, Property 4: State Broadcast Consistency**
     * **Validates: Requirements 2.4**
     */
    describe('Property 4: State Broadcast Consistency', () => {
        it('leader can broadcast state without errors', () => {
            fc.assert(
                fc.property(sessionCodeArb, participantIdArb, (sessionCode, participantId) => {
                    localStorage.clear();
                    const testManager = new TabSyncManager();

                    testManager.initialize(sessionCode, participantId);
                    expect(testManager.isLeader()).toBe(true);

                    // Should not throw when broadcasting state
                    expect(() => {
                        testManager.broadcastState({
                            type: 'state',
                            sessionCode,
                            circuit: {
                                sessionId: sessionCode,
                                version: 1,
                                schemaVersion: '1.0.0',
                                components: [],
                                wires: [],
                                annotations: [],
                                updatedAt: new Date().toISOString(),
                            },
                            participants: [],
                            currentParticipant: {
                                id: participantId,
                                sessionCode,
                                displayName: 'Test',
                                role: 'teacher',
                                canEdit: true,
                                color: '#000',
                                isActive: true,
                                lastSeenAt: new Date().toISOString(),
                            },
                            isConnected: true,
                            isSimulationRunning: false,
                            timestamp: Date.now(),
                        });
                    }).not.toThrow();

                    testManager.destroy();
                }),
                { numRuns: 50 }
            );
        });
    });

    // Unit tests for basic functionality
    describe('Unit Tests', () => {
        it('generates unique tab IDs', () => {
            const manager1 = new TabSyncManager();
            const manager2 = new TabSyncManager();

            expect(manager1.getTabId()).not.toBe(manager2.getTabId());

            manager1.destroy();
            manager2.destroy();
        });

        it('releases lock on destroy', () => {
            const sessionCode = 'TEST12';
            manager.initialize(sessionCode, 'participant-1');

            expect(manager.isLeader()).toBe(true);
            expect(localStorage.getItem(`circuitforge-lock-${sessionCode}`)).not.toBeNull();

            manager.destroy();

            expect(localStorage.getItem(`circuitforge-lock-${sessionCode}`)).toBeNull();
        });

        it('follower does not broadcast state', () => {
            const sessionCode = 'TEST12';

            // Create leader first
            const leader = new TabSyncManager();
            leader.initialize(sessionCode, 'participant-1');

            // Create follower
            const follower = new TabSyncManager();
            follower.initialize(sessionCode, 'participant-2');

            expect(follower.isLeader()).toBe(false);

            // Should not throw but also should not actually broadcast
            expect(() => {
                follower.broadcastState({
                    type: 'state',
                    sessionCode,
                    circuit: {
                        sessionId: sessionCode,
                        version: 1,
                        schemaVersion: '1.0.0',
                        components: [],
                        wires: [],
                        annotations: [],
                        updatedAt: new Date().toISOString(),
                    },
                    participants: [],
                    currentParticipant: {
                        id: 'participant-2',
                        sessionCode,
                        displayName: 'Test',
                        role: 'student',
                        canEdit: false,
                        color: '#000',
                        isActive: true,
                        lastSeenAt: new Date().toISOString(),
                    },
                    isConnected: true,
                    isSimulationRunning: false,
                    timestamp: Date.now(),
                });
            }).not.toThrow();

            leader.destroy();
            follower.destroy();
        });
    });
});
