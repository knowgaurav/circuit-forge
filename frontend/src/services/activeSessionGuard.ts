/**
 * ActiveSessionGuard Service
 *
 * Enforces that a single browser is only inside one session at a time across
 * tabs. Backed by one localStorage key with a heartbeat so a crashed/closed tab
 * naturally frees the slot once its record goes stale.
 *
 * Joining the SAME session in multiple tabs stays allowed (handled by
 * TabSyncManager); this guard only blocks joining a DIFFERENT session.
 */

const ACTIVE_KEY = 'circuitforge-active-session';
const ACTIVE_TIMEOUT = 6000; // record is stale after 6s without a heartbeat

interface ActiveSessionRecord {
    sessionCode: string;
    lastHeartbeat: number;
}

function read(): ActiveSessionRecord | null {
    try {
        const raw = localStorage.getItem(ACTIVE_KEY);
        if (!raw) return null;
        const record = JSON.parse(raw) as ActiveSessionRecord;
        if (Date.now() - record.lastHeartbeat > ACTIVE_TIMEOUT) return null;
        return record;
    } catch {
        return null;
    }
}

function write(sessionCode: string): void {
    try {
        localStorage.setItem(
            ACTIVE_KEY,
            JSON.stringify({ sessionCode, lastHeartbeat: Date.now() } satisfies ActiveSessionRecord)
        );
    } catch {
        // localStorage unavailable - guard simply does nothing
    }
}

export const activeSessionGuard = {
    /** The session code currently active in this browser, or null if none/stale. */
    getActiveSession(): string | null {
        return read()?.sessionCode ?? null;
    },

    /** Claim the active-session slot for the given code (also refreshes heartbeat). */
    claim(sessionCode: string): void {
        write(sessionCode.toUpperCase());
    },

    /** Release the slot if it is still owned by this code. */
    release(sessionCode: string): void {
        const record = read();
        if (record && record.sessionCode === sessionCode.toUpperCase()) {
            try {
                localStorage.removeItem(ACTIVE_KEY);
            } catch {
                // ignore
            }
        }
    },
};
