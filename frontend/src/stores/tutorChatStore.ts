/**
 * Tutor Chat Store
 *
 * **Feature: in-course-ai-tutor**
 *
 * Holds per-step conversation history for the in-course tutor. Threads are
 * keyed by `${courseId}:${levelNumber}:${mode}` so switching tabs or levels
 * keeps conversations separate. A single `pending` flag gates input while a
 * turn is in flight. Nothing is persisted — the tutor conversation is
 * ephemeral to the session.
 */

import { create } from 'zustand';

import type { TutorMessage, TutorMode } from '@/types';

export function threadKey(courseId: string, levelNumber: number, mode: TutorMode): string {
    return `${courseId}:${levelNumber}:${mode}`;
}

interface TutorChatStore {
    threads: Record<string, TutorMessage[]>;
    pending: boolean;
    appendMessage: (key: string, msg: TutorMessage) => void;
    setPending: (value: boolean) => void;
    reset: (key: string) => void;
}

export const useTutorChatStore = create<TutorChatStore>((set) => ({
    threads: {},
    pending: false,

    appendMessage: (key, msg) =>
        set((state) => ({
            threads: {
                ...state.threads,
                [key]: [...(state.threads[key] ?? []), msg],
            },
        })),

    setPending: (value) => set({ pending: value }),

    reset: (key) =>
        set((state) => ({
            threads: { ...state.threads, [key]: [] },
        })),
}));
