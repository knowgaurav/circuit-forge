/**
 * SessionPersistence Service
 * Handles localStorage operations for session recovery
 */

import type { PersistedSession } from '@/types';

const STORAGE_KEY = 'circuitforge-session';
const SCHEMA_VERSION = '1.0.0';
const SESSION_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours

export class SessionPersistence {
    /**
     * Save session data to localStorage for recovery
     */
    saveSession(data: Omit<PersistedSession, 'savedAt' | 'schemaVersion'>): void {
        const persistedSession: PersistedSession = {
            ...data,
            savedAt: Date.now(),
            schemaVersion: SCHEMA_VERSION,
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedSession));
        } catch (error) {
            console.error('Failed to save session to localStorage:', error);
        }
    }

    /**
     * Load saved session from localStorage
     * Returns null if no session exists or if it's invalid/expired
     */
    loadSession(): PersistedSession | null {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return null;
            }

            const data = JSON.parse(stored) as PersistedSession;

            if (!this.isSessionValid(data)) {
                this.clearSession();
                return null;
            }

            return data;
        } catch (error) {
            console.error('Failed to load session from localStorage:', error);
            this.clearSession();
            return null;
        }
    }

    /**
     * Clear saved session from localStorage
     */
    clearSession(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear session from localStorage:', error);
        }
    }

    /**
     * Check if a persisted session is still valid (within 24 hours)
     */
    isSessionValid(data: PersistedSession): boolean {
        // Check required fields
        if (!data.sessionCode || !data.participantId || !data.displayName) {
            return false;
        }

        // Check schema version compatibility
        if (data.schemaVersion !== SCHEMA_VERSION) {
            return false;
        }

        // Check if session is within 24-hour validity window
        const age = Date.now() - data.savedAt;
        if (age > SESSION_VALIDITY_MS) {
            return false;
        }

        return true;
    }

    /**
     * Serialize session data to JSON string
     */
    static serialize(data: PersistedSession): string {
        return JSON.stringify(data);
    }

    /**
     * Deserialize JSON string to session data
     */
    static deserialize(json: string): PersistedSession {
        return JSON.parse(json) as PersistedSession;
    }
}

// Export singleton instance
export const sessionPersistence = new SessionPersistence();
