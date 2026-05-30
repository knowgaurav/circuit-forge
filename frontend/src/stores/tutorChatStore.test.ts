/**
 * Vitest unit tests for the tutor chat zustand store.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { threadKey, useTutorChatStore } from './tutorChatStore';

describe('tutorChatStore', () => {
    beforeEach(() => {
        useTutorChatStore.setState({ threads: {}, pending: false });
    });

    it('keys threads by course, level, and mode', () => {
        const a = threadKey('c1', 1, 'theory');
        const b = threadKey('c1', 1, 'practical');
        expect(a).toBe('c1:1:theory');
        expect(b).toBe('c1:1:practical');
        expect(a).not.toBe(b);
    });

    it('keeps separate threads isolated', () => {
        const { appendMessage } = useTutorChatStore.getState();
        const theory = threadKey('c1', 1, 'theory');
        const practical = threadKey('c1', 1, 'practical');

        appendMessage(theory, { role: 'user', text: 'theory question' });
        appendMessage(practical, { role: 'user', text: 'practical question' });

        const { threads } = useTutorChatStore.getState();
        expect(threads[theory] ?? []).toHaveLength(1);
        expect(threads[practical] ?? []).toHaveLength(1);
        expect(threads[theory]?.[0]?.text).toBe('theory question');
        expect(threads[practical]?.[0]?.text).toBe('practical question');
    });

    it('appends messages in order within a thread', () => {
        const { appendMessage } = useTutorChatStore.getState();
        const key = threadKey('c1', 2, 'practical');

        appendMessage(key, { role: 'user', text: 'hi' });
        appendMessage(key, { role: 'assistant', text: 'hello' });

        const { threads } = useTutorChatStore.getState();
        expect(threads[key]?.map((m) => m.role)).toEqual(['user', 'assistant']);
    });

    it('toggles the pending flag', () => {
        const { setPending } = useTutorChatStore.getState();
        setPending(true);
        expect(useTutorChatStore.getState().pending).toBe(true);
        setPending(false);
        expect(useTutorChatStore.getState().pending).toBe(false);
    });

    it('resets a single thread', () => {
        const { appendMessage, reset } = useTutorChatStore.getState();
        const key = threadKey('c1', 1, 'theory');
        appendMessage(key, { role: 'user', text: 'x' });
        reset(key);
        expect(useTutorChatStore.getState().threads[key]).toEqual([]);
    });
});
