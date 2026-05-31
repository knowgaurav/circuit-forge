'use client';

import { useEffect, useState } from 'react';

import { activeSessionGuard } from '@/services/activeSessionGuard';

const HEARTBEAT_INTERVAL = 3000; // refresh the active-session slot every 3s

interface UseActiveSessionGuardReturn {
    /** True once the guard has decided whether this tab may enter the session. */
    isChecked: boolean;
    /** Code of a different session already active in this browser, if blocked. */
    blockedBy: string | null;
}

/**
 * Ensures the browser is only inside one session at a time across tabs.
 *
 * If a different session is already active elsewhere, this tab is blocked
 * (`blockedBy` is set). Otherwise it claims the slot and keeps it alive with a
 * heartbeat, releasing it on unmount.
 */
export function useActiveSessionGuard(sessionCode: string): UseActiveSessionGuardReturn {
    const [isChecked, setIsChecked] = useState(false);
    const [blockedBy, setBlockedBy] = useState<string | null>(null);

    useEffect(() => {
        const code = sessionCode.toUpperCase();
        const active = activeSessionGuard.getActiveSession();

        if (active && active !== code) {
            setBlockedBy(active);
            setIsChecked(true);
            return;
        }

        // Slot is free or already ours - claim it and keep it warm.
        activeSessionGuard.claim(code);
        setIsChecked(true);

        const interval = setInterval(() => {
            activeSessionGuard.claim(code);
        }, HEARTBEAT_INTERVAL);

        return () => {
            clearInterval(interval);
            activeSessionGuard.release(code);
        };
    }, [sessionCode]);

    return { isChecked, blockedBy };
}
