/**
 * Property-based tests for SessionPersistence
 * 
 * **Feature: session-management, Property 6: Session Persistence Round-Trip**
 * **Validates: Requirements 3.5, 3.6, 3.7**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { SessionPersistence } from './sessionPersistence';
import type { PersistedSession } from '@/types';

describe('SessionPersistence', () => {
    let persistence: SessionPersistence;

    beforeEach(() => {
        localStorage.clear();
        persistence = new SessionPersistence();
    });

    // Arbitrary for generating valid session codes (6 uppercase alphanumeric)
    const sessionCodeArb = fc.array(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
        { minLength: 6, maxLength: 6 }
    ).map(arr => arr.join(''));

    // Arbitrary for generating valid participant IDs
    const participantIdArb = fc.uuid();

    // Arbitrary for generating valid display names (3-20 chars, alphanumeric + spaces)
    const displayNameArb = fc.array(
        fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '.split('')),
        { minLength: 3, maxLength: 20 }
    ).map(arr => arr.join('')).filter(s => s.trim().length >= 3); // Ensure not all spaces

    // Arbitrary for generating valid timestamps (within last 24 hours)
    const recentTimestampArb = fc.integer({
        min: Date.now() - 23 * 60 * 60 * 1000, // 23 hours ago
        max: Date.now()
    });

    // Arbitrary for generating valid PersistedSession objects
    const persistedSessionArb = fc.record({
        sessionCode: sessionCodeArb,
        participantId: participantIdArb,
        displayName: displayNameArb,
        savedAt: recentTimestampArb,
        schemaVersion: fc.constant('1.0.0'),
    });

    /**
     * **Feature: session-management, Property 6: Session Persistence Round-Trip**
     * **Validates: Requirements 3.5, 3.6, 3.7**
     * 
     * For any valid PersistedSession object, serializing to JSON and then 
     * deserializing SHALL produce an equivalent PersistedSession object.
     */
    it('Property 6: serializing and deserializing produces equivalent session', () => {
        fc.assert(
            fc.property(persistedSessionArb, (session) => {
                const serialized = SessionPersistence.serialize(session);
                const deserialized = SessionPersistence.deserialize(serialized);

                expect(deserialized.sessionCode).toBe(session.sessionCode);
                expect(deserialized.participantId).toBe(session.participantId);
                expect(deserialized.displayName).toBe(session.displayName);
                expect(deserialized.savedAt).toBe(session.savedAt);
                expect(deserialized.schemaVersion).toBe(session.schemaVersion);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Property: save then load produces equivalent session
     */
    it('save then load produces equivalent session', () => {
        fc.assert(
            fc.property(
                sessionCodeArb,
                participantIdArb,
                displayNameArb,
                (sessionCode, participantId, displayName) => {
                    // Save session
                    persistence.saveSession({ sessionCode, participantId, displayName });

                    // Load session
                    const loaded = persistence.loadSession();

                    expect(loaded).not.toBeNull();
                    expect(loaded!.sessionCode).toBe(sessionCode);
                    expect(loaded!.participantId).toBe(participantId);
                    expect(loaded!.displayName).toBe(displayName);
                    expect(loaded!.schemaVersion).toBe('1.0.0');
                    expect(typeof loaded!.savedAt).toBe('number');
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: clearSession removes the session
     */
    it('clearSession removes the session', () => {
        fc.assert(
            fc.property(
                sessionCodeArb,
                participantIdArb,
                displayNameArb,
                (sessionCode, participantId, displayName) => {
                    // Save session
                    persistence.saveSession({ sessionCode, participantId, displayName });

                    // Clear session
                    persistence.clearSession();

                    // Load should return null
                    const loaded = persistence.loadSession();
                    expect(loaded).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: expired sessions are invalid
     */
    it('sessions older than 24 hours are invalid', () => {
        const expiredTimestampArb = fc.integer({
            min: Date.now() - 48 * 60 * 60 * 1000, // 48 hours ago
            max: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        });

        fc.assert(
            fc.property(
                sessionCodeArb,
                participantIdArb,
                displayNameArb,
                expiredTimestampArb,
                (sessionCode, participantId, displayName, savedAt) => {
                    const expiredSession: PersistedSession = {
                        sessionCode,
                        participantId,
                        displayName,
                        savedAt,
                        schemaVersion: '1.0.0',
                    };

                    expect(persistence.isSessionValid(expiredSession)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: recent sessions are valid
     */
    it('sessions within 24 hours are valid', () => {
        fc.assert(
            fc.property(persistedSessionArb, (session) => {
                expect(persistence.isSessionValid(session)).toBe(true);
            }),
            { numRuns: 100 }
        );
    });

    /**
     * Property: sessions with missing fields are invalid
     */
    it('sessions with missing required fields are invalid', () => {
        const invalidSessions = [
            { sessionCode: '', participantId: 'abc', displayName: 'Test', savedAt: Date.now(), schemaVersion: '1.0.0' },
            { sessionCode: 'ABC123', participantId: '', displayName: 'Test', savedAt: Date.now(), schemaVersion: '1.0.0' },
            { sessionCode: 'ABC123', participantId: 'abc', displayName: '', savedAt: Date.now(), schemaVersion: '1.0.0' },
        ];

        invalidSessions.forEach((session) => {
            expect(persistence.isSessionValid(session as PersistedSession)).toBe(false);
        });
    });

    /**
     * Property: sessions with wrong schema version are invalid
     */
    it('sessions with wrong schema version are invalid', () => {
        fc.assert(
            fc.property(
                sessionCodeArb,
                participantIdArb,
                displayNameArb,
                recentTimestampArb,
                fc.string().filter(s => s !== '1.0.0'),
                (sessionCode, participantId, displayName, savedAt, wrongVersion) => {
                    const session: PersistedSession = {
                        sessionCode,
                        participantId,
                        displayName,
                        savedAt,
                        schemaVersion: wrongVersion,
                    };

                    expect(persistence.isSessionValid(session)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });
});
