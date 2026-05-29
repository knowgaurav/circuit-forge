/**
 * Vitest unit tests for the replay zustand store.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/replay', () => ({
    fetchEvents: vi.fn(),
}));

import { fetchEvents } from '@/services/replay';

import { useReplayStore } from './replayStore';

import type { CircuitEvent, CircuitState } from '@/types';

const fetchEventsMock = fetchEvents as unknown as ReturnType<typeof vi.fn>;

const SESSION_CODE = 'ABC123';

function emptyState(): CircuitState {
    return {
        sessionId: SESSION_CODE,
        version: 0,
        schemaVersion: '1.0.0',
        components: [],
        wires: [],
        annotations: [],
        updatedAt: '1970-01-01T00:00:00.000Z',
    };
}

function componentAddedEvent(seq: number, id: string): CircuitEvent {
    return {
        seq,
        sessionId: SESSION_CODE,
        actorId: 'actor-1',
        type: 'COMPONENT_ADDED',
        timestamp: '1970-01-01T00:00:00.000Z',
        payload: {
            component: {
                id,
                type: 'AND_2',
                label: id,
                position: { x: 0, y: 0 },
                rotation: 0,
                properties: {},
                pins: [],
            },
        },
    };
}

describe('useReplayStore', () => {
    beforeEach(() => {
        useReplayStore.getState().exitReplay();
        fetchEventsMock.mockReset();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('enterReplay → setSeq(50) → state matches expected snapshot', async () => {
        // First call: enterReplay loads totalEvents=100; we mock that path
        // and the subsequent setSeq(50) path.
        fetchEventsMock.mockImplementation(async (_code: string, _from: number, to: number) => {
            const events: CircuitEvent[] = [];
            for (let i = 1; i <= to; i++) {
                events.push(componentAddedEvent(i, `comp-${i}`));
            }
            return { events, snapshot: { seq: 0, state: emptyState() } };
        });

        await useReplayStore.getState().enterReplay(SESSION_CODE, 100);

        // After enterReplay we have state at seq=100.
        expect(useReplayStore.getState().sessionCode).toBe(SESSION_CODE);
        expect(useReplayStore.getState().totalEvents).toBe(100);
        expect(useReplayStore.getState().seq).toBe(100);
        expect(useReplayStore.getState().state?.components).toHaveLength(100);

        // Now scrub to seq=50.
        useReplayStore.getState().setSeq(50);
        expect(useReplayStore.getState().seq).toBe(50);

        // setSeq is debounced — flush the timer + the awaited fetch.
        await vi.advanceTimersByTimeAsync(150);
        await vi.runAllTimersAsync();

        const state = useReplayStore.getState().state;
        expect(state).not.toBeNull();
        expect(state?.components).toHaveLength(50);
        expect(state?.components[0]?.id).toBe('comp-1');
        expect(state?.components[49]?.id).toBe('comp-50');
        expect(state?.version).toBe(50);
        expect(useReplayStore.getState().loading).toBe(false);
    });

    it('setSeq debounces: rapid calls within 100 ms result in one fetch', async () => {
        // Seed with enterReplay (one fetch) then make several rapid setSeq calls.
        fetchEventsMock.mockResolvedValue({
            events: [],
            snapshot: { seq: 0, state: emptyState() },
        });

        await useReplayStore.getState().enterReplay(SESSION_CODE, 10);
        const fetchesAfterEnter = fetchEventsMock.mock.calls.length;
        expect(fetchesAfterEnter).toBe(1);

        const store = useReplayStore.getState();
        store.setSeq(1);
        store.setSeq(2);
        store.setSeq(3);
        store.setSeq(4);

        // Within the debounce window — no extra fetch yet.
        await vi.advanceTimersByTimeAsync(50);
        expect(fetchEventsMock.mock.calls.length).toBe(fetchesAfterEnter);

        // Crossing the 100 ms threshold triggers exactly one fetch.
        await vi.advanceTimersByTimeAsync(60);
        await vi.runAllTimersAsync();
        expect(fetchEventsMock.mock.calls.length).toBe(fetchesAfterEnter + 1);

        // The fetch used the *latest* seq, not the intermediate ones.
        const lastCall = fetchEventsMock.mock.calls[fetchEventsMock.mock.calls.length - 1];
        expect(lastCall?.[2]).toBe(4);
    });

    it('exitReplay clears state', async () => {
        fetchEventsMock.mockResolvedValue({
            events: [componentAddedEvent(1, 'c1')],
            snapshot: { seq: 0, state: emptyState() },
        });
        await useReplayStore.getState().enterReplay(SESSION_CODE, 1);
        expect(useReplayStore.getState().state).not.toBeNull();

        useReplayStore.getState().exitReplay();

        expect(useReplayStore.getState().sessionCode).toBeNull();
        expect(useReplayStore.getState().totalEvents).toBe(0);
        expect(useReplayStore.getState().seq).toBe(0);
        expect(useReplayStore.getState().state).toBeNull();
        expect(useReplayStore.getState().loading).toBe(false);
        expect(useReplayStore.getState().error).toBeNull();
    });
});
