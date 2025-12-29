'use client';

import { useEffect, useRef, useCallback } from 'react';
import { SessionCloseGuard } from '@/services/sessionCloseGuard';

interface UseCloseGuardOptions {
    isActive: boolean;
    isTeacher: boolean;
    studentCount: number;
    onLeaveConfirmed: () => void;
    onLeaveCancelled: () => void;
}

interface UseCloseGuardReturn {
    handleLeaveRequest: () => { shouldShowModal: boolean; studentCount: number };
    confirmLeave: () => void;
    cancelLeave: () => void;
}

export function useCloseGuard({
    isActive,
    isTeacher,
    studentCount,
    onLeaveConfirmed,
    onLeaveCancelled,
}: UseCloseGuardOptions): UseCloseGuardReturn {
    const guardRef = useRef<SessionCloseGuard | null>(null);

    useEffect(() => {
        if (!guardRef.current) {
            guardRef.current = new SessionCloseGuard();
        }

        const guard = guardRef.current;

        if (isActive) {
            guard.enable({
                isTeacher,
                studentCount,
                onLeaveConfirmed,
                onLeaveCancelled,
            });
        } else {
            guard.disable();
        }

        return () => {
            guard.disable();
        };
    }, [isActive, isTeacher, studentCount, onLeaveConfirmed, onLeaveCancelled]);

    // Update student count when it changes
    useEffect(() => {
        guardRef.current?.updateStudentCount(studentCount);
    }, [studentCount]);

    const handleLeaveRequest = useCallback(() => {
        return guardRef.current?.handleLeaveRequest() ?? { shouldShowModal: false, studentCount: 0 };
    }, []);

    const confirmLeave = useCallback(() => {
        guardRef.current?.confirmLeave();
    }, []);

    const cancelLeave = useCallback(() => {
        guardRef.current?.cancelLeave();
    }, []);

    return {
        handleLeaveRequest,
        confirmLeave,
        cancelLeave,
    };
}
