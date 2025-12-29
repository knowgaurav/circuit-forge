import { create } from 'zustand';
import type { CircuitComponent, Wire, Annotation, CircuitState, Position } from '@/types';

export interface CircuitStore {
    // State
    sessionId: string | null;
    version: number;
    components: CircuitComponent[];
    wires: Wire[];
    annotations: Annotation[];

    // Actions
    setCircuitState: (state: CircuitState) => void;
    setComponents: (components: CircuitComponent[]) => void;
    setWires: (wires: Wire[]) => void;
    addComponent: (component: CircuitComponent) => void;
    moveComponent: (componentId: string, position: Position) => void;
    updateComponentLabel: (componentId: string, label: string) => void;
    updateComponentProperties: (componentId: string, properties: Record<string, unknown>) => void;
    toggleSwitchState: (componentId: string) => void;
    deleteComponent: (componentId: string) => void;
    addWire: (wire: Wire) => void;
    deleteWire: (wireId: string) => void;
    addAnnotation: (annotation: Annotation) => void;
    deleteAnnotation: (annotationId: string) => void;
    updateVersion: (version: number) => void;
    reset: () => void;
}

const initialState = {
    sessionId: null,
    version: 0,
    components: [],
    wires: [],
    annotations: [],
};

export const useCircuitStore = create<CircuitStore>((set) => ({
    ...initialState,

    setCircuitState: (state) =>
        set({
            sessionId: state.sessionId,
            version: state.version,
            components: state.components,
            wires: state.wires,
            annotations: state.annotations,
        }),

    setComponents: (components) => set({ components }),

    setWires: (wires) => set({ wires }),

    addComponent: (component) =>
        set((state) => ({
            components: [...state.components, component],
        })),

    moveComponent: (componentId, position) =>
        set((state) => ({
            components: state.components.map((c) =>
                c.id === componentId ? { ...c, position } : c
            ),
        })),

    updateComponentLabel: (componentId, label) =>
        set((state) => ({
            components: state.components.map((c) =>
                c.id === componentId ? { ...c, label } : c
            ),
        })),

    updateComponentProperties: (componentId, properties) =>
        set((state) => ({
            components: state.components.map((c) =>
                c.id === componentId
                    ? { ...c, properties: { ...c.properties, ...properties } }
                    : c
            ),
        })),

    toggleSwitchState: (componentId) =>
        set((state) => ({
            components: state.components.map((c) => {
                if (c.id === componentId && (c.type === 'SWITCH_TOGGLE' || c.type === 'SWITCH_PUSH')) {
                    const currentState = (c.properties as Record<string, unknown>)?.state === true;
                    return {
                        ...c,
                        properties: { ...c.properties, state: !currentState },
                    };
                }
                return c;
            }),
        })),

    deleteComponent: (componentId) =>
        set((state) => ({
            components: state.components.filter((c) => c.id !== componentId),
            // Also remove connected wires
            wires: state.wires.filter(
                (w) => w.fromComponentId !== componentId && w.toComponentId !== componentId
            ),
        })),

    addWire: (wire) =>
        set((state) => {
            // Check if a wire with the same connection already exists
            const isDuplicate = state.wires.some(
                (w) =>
                    w.fromComponentId === wire.fromComponentId &&
                    w.fromPinId === wire.fromPinId &&
                    w.toComponentId === wire.toComponentId &&
                    w.toPinId === wire.toPinId
            );
            // Also check if the target input pin already has a connection
            const inputAlreadyConnected = state.wires.some(
                (w) =>
                    w.toComponentId === wire.toComponentId &&
                    w.toPinId === wire.toPinId
            );
            if (isDuplicate || inputAlreadyConnected) {
                return state; // Don't add duplicate or conflicting wire
            }
            return { wires: [...state.wires, wire] };
        }),

    deleteWire: (wireId) =>
        set((state) => ({
            wires: state.wires.filter((w) => w.id !== wireId),
        })),

    addAnnotation: (annotation) =>
        set((state) => ({
            annotations: [...state.annotations, annotation],
        })),

    deleteAnnotation: (annotationId) =>
        set((state) => ({
            annotations: state.annotations.filter((a) => a.id !== annotationId),
        })),

    updateVersion: (version) => set({ version }),

    reset: () => set(initialState),
}));
