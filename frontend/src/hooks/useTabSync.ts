'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { TabSyncManager } from '@/services/tabSync';
import type { SyncState, TabSyncStatus } from '@/types';

interface UseTabSyncOptions {
    sessionCode: string;
    participantId: string;
    onStateReceived?: (state: SyncState) => void;
    onStatusChange?: (status: TabSyncStatus) => void;
}

interface UseTabSyncReturn {
    isLeader: boolean;
    status: TabSyncStatus;
    tabId: string;
    broadcastState: (state: SyncState) => void;
    forwardAction: (action: { type: string; payload: unknown }) => void;
}

export function useTabSync({
    sessionCode,
    participantId,
    onStateReceived,
    onStatusChange,
}: UseTabSyncOptions): UseTabSyncReturn {
    const [isLeader, setIsLeader] = useState(false);
    const [status, setStatus] = useState<TabSyncStatus>('disconnected');
    const managerRef = useRef<TabSyncManager | null>(null);

    useEffect(() => {
        if (!sessionCode || !participantId) return;

        const manager = new TabSyncManager();
        managerRef.current = manager;

        manager.onStatusChange((newStatus) => {
            setStatus(newStatus);
            setIsLeader(newStatus === 'leader');
            onStatusChange?.(newStatus);
        });

        manager.onStateReceived((state) => {
            onStateReceived?.(state);
        });

        manager.initialize(sessionCode, participantId);

        return () => {
            manager.destroy();
            managerRef.current = null;
        };
    }, [sessionCode, participantId]);

    const broadcastState = useCallback((state: SyncState) => {
        managerRef.current?.broadcastState(state);
    }, []);

    const forwardAction = useCallback((action: { type: string; payload: unknown }) => {
        if (!managerRef.current) return;

        managerRef.current.forwardAction({
            type: 'action',
            actionType: action.type,
            payload: action.payload,
            sourceTabId: managerRef.current.getTabId(),
            timestamp: Date.now(),
        });
    }, []);

    return {
        isLeader,
        status,
        tabId: managerRef.current?.getTabId() ?? '',
        broadcastState,
        forwardAction,
    };
}
