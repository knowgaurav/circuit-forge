'use client';

import { useEffect, useState, useCallback } from 'react';
import { sessionPersistence } from '@/services/sessionPersistence';
import type { PersistedSession } from '@/types';

interface UseSessionRecoveryReturn {
    pendingSession: PersistedSession | null;
    clearPendingSession: () => void;
    saveSession: (sessionCode: string, participantId: string, displayName: string) => void;
}

export function useSessionRecovery(): UseSessionRecoveryReturn {
    const [pendingSession, setPendingSession] = useState<PersistedSession | null>(null);

    useEffect(() => {
        // Check for pending session on mount
        const session = sessionPersistence.loadSession();
        if (session) {
            setPendingSession(session);
        }
    }, []);

    const clearPendingSession = useCallback(() => {
        sessionPersistence.clearSession();
        setPendingSession(null);
    }, []);

    const saveSession = useCallback((sessionCode: string, participantId: string, displayName: string) => {
        sessionPersistence.saveSession({
            sessionCode,
            participantId,
            displayName,
        });
    }, []);

    return {
        pendingSession,
        clearPendingSession,
        saveSession,
    };
}
