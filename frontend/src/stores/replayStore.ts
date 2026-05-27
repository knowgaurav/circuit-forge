import { create } from 'zustand';

import type { CircuitEvent, CircuitState } from '@/types';
import { fetchEvents } from '@/services/replay';

const DEBOUNCE_MS = 100;

interface ReplayState {
    sessionCode: string | null;
    totalEvents: number;
    seq: number;
    state: CircuitState | null;
    loading: boolean;
    error: string | null;
}

interface ReplayActions {
    enterReplay: (code: string, totalEvents: number) => Promise<void>;
    exitReplay: () => void;
    setSeq: (n: number) => void;
}

type ReplayStore = ReplayState & ReplayActions;

const initialState: ReplayState = {
    sessionCode: null,
    totalEvents: 0,
    seq: 0,
    state: null,
    loading: false,
    error: null,
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let fetchToken = 0;

function applyEvent(state: CircuitState, event: CircuitEvent): CircuitState {
    switch (event.type) {
        case 'COMPONENT_ADDED':
            return {
                ...state,
                components: [...state.components, event.payload.component],
                version: event.seq,
            };
        case 'COMPONENT_MOVED':
            return {
                ...state,
                components: state.components.map((c) =>
                    c.id === event.payload.componentId
                        ? { ...c, position: event.payload.position }
                        : c
                ),
                version: event.seq,
            };
        case 'COMPONENT_DELETED':
            return {
                ...state,
                components: state.components.filter((c) => c.id !== event.payload.componentId),
                wires: state.wires.filter(
                    (w) =>
                        w.fromComponentId !== event.payload.componentId &&
                        w.toComponentId !== event.payload.componentId
                ),
                version: event.seq,
            };
        case 'WIRE_ADDED':
            return {
                ...state,
                wires: [...state.wires, event.payload.wire],
                version: event.seq,
            };
        case 'WIRE_DELETED':
            return {
                ...state,
                wires: state.wires.filter((w) => w.id !== event.payload.wireId),
                version: event.seq,
            };
        case 'ANNOTATION_ADDED':
            return {
                ...state,
                annotations: [...state.annotations, event.payload.annotation],
                version: event.seq,
            };
        case 'ANNOTATION_DELETED':
            return {
                ...state,
                annotations: state.annotations.filter(
                    (a) => a.id !== event.payload.annotationId
                ),
                version: event.seq,
            };
    }
}

async function loadStateAtSeq(
    code: string,
    seq: number
): Promise<{ state: CircuitState; events: CircuitEvent[] }> {
    // Ask the events endpoint for "from seq=0 to seq=n". The backend returns
    // the seq=0 empty snapshot plus events 1..n; we fold them client-side.
    // Snapshot acceleration on the server keeps replay correct for the
    // baseline; the client's apply function is the same shape as the
    // backend's _apply_event so the resulting state is byte-identical.
    const { snapshot, events } = await fetchEvents(code, 0, seq);
    const base = snapshot
        ? snapshot.state
        : ({
            sessionId: code,
            version: 0,
            schemaVersion: '1.0.0',
            components: [],
            wires: [],
            annotations: [],
            updatedAt: new Date(0).toISOString(),
        } satisfies CircuitState);
    let state = base;
    for (const event of events) {
        state = applyEvent(state, event);
    }
    return { state, events };
}

export const useReplayStore = create<ReplayStore>((set, get) => ({
    ...initialState,

    enterReplay: async (code, totalEvents) => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        set({
            sessionCode: code,
            totalEvents,
            seq: totalEvents,
            state: null,
            loading: true,
            error: null,
        });
        const token = ++fetchToken;
        try {
            const { state } = await loadStateAtSeq(code, totalEvents);
            if (token !== fetchToken) return;
            set({ state, loading: false });
        } catch (err) {
            if (token !== fetchToken) return;
            set({ error: err instanceof Error ? err.message : String(err), loading: false });
        }
    },

    exitReplay: () => {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
        }
        fetchToken++;
        set({ ...initialState });
    },

    setSeq: (n) => {
        set({ seq: n });
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            const { sessionCode, seq } = get();
            if (!sessionCode) return;
            const token = ++fetchToken;
            set({ loading: true, error: null });
            loadStateAtSeq(sessionCode, seq)
                .then(({ state }) => {
                    if (token !== fetchToken) return;
                    set({ state, loading: false });
                })
                .catch((err: unknown) => {
                    if (token !== fetchToken) return;
                    set({
                        error: err instanceof Error ? err.message : String(err),
                        loading: false,
                    });
                });
        }, DEBOUNCE_MS);
    },
}));
