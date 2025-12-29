import { create } from 'zustand';
import type { Session, Participant, EditRequest, Position } from '@/types';

interface RemoteCursor {
    participantId: string;
    position: Position;
    color: string;
    displayName: string;
}

interface SessionStore {
    // State
    session: Session | null;
    participants: Participant[];
    currentParticipant: Participant | null;
    editRequests: EditRequest[];
    remoteCursors: Map<string, RemoteCursor>;
    remoteSelections: Map<string, string[]>;
    isConnected: boolean;
    isReconnecting: boolean;

    // Actions
    setSession: (session: Session) => void;
    setParticipants: (participants: Participant[]) => void;
    setCurrentParticipant: (participant: Participant) => void;
    addParticipant: (participant: Participant) => void;
    removeParticipant: (participantId: string) => void;
    updateParticipantEditStatus: (participantId: string, canEdit: boolean) => void;
    addEditRequest: (request: EditRequest) => void;
    removeEditRequest: (participantId: string) => void;
    updateRemoteCursor: (participantId: string, position: Position) => void;
    removeRemoteCursor: (participantId: string) => void;
    updateRemoteSelection: (participantId: string, componentIds: string[]) => void;
    setConnectionStatus: (isConnected: boolean, isReconnecting?: boolean) => void;
    reset: () => void;
}

const initialState = {
    session: null,
    participants: [],
    currentParticipant: null,
    editRequests: [],
    remoteCursors: new Map<string, RemoteCursor>(),
    remoteSelections: new Map<string, string[]>(),
    isConnected: false,
    isReconnecting: false,
};

export const useSessionStore = create<SessionStore>((set) => ({
    ...initialState,

    setSession: (session) => set({ session }),

    setParticipants: (participants) => set({ participants }),

    setCurrentParticipant: (participant) => set({ currentParticipant: participant }),

    addParticipant: (participant) =>
        set((state) => ({
            participants: [...state.participants.filter(p => p.id !== participant.id), participant],
        })),

    removeParticipant: (participantId) =>
        set((state) => {
            const newCursors = new Map(state.remoteCursors);
            newCursors.delete(participantId);
            const newSelections = new Map(state.remoteSelections);
            newSelections.delete(participantId);
            return {
                participants: state.participants.filter((p) => p.id !== participantId),
                remoteCursors: newCursors,
                remoteSelections: newSelections,
            };
        }),

    updateParticipantEditStatus: (participantId, canEdit) =>
        set((state) => ({
            participants: state.participants.map((p) =>
                p.id === participantId ? { ...p, canEdit } : p
            ),
            currentParticipant:
                state.currentParticipant?.id === participantId
                    ? { ...state.currentParticipant, canEdit }
                    : state.currentParticipant,
        })),

    addEditRequest: (request) =>
        set((state) => ({
            editRequests: [...state.editRequests.filter(r => r.participantId !== request.participantId), request],
        })),

    removeEditRequest: (participantId) =>
        set((state) => ({
            editRequests: state.editRequests.filter((r) => r.participantId !== participantId),
        })),

    updateRemoteCursor: (participantId, position) =>
        set((state) => {
            const participant = state.participants.find((p) => p.id === participantId);
            if (!participant) return state;

            const newCursors = new Map(state.remoteCursors);
            newCursors.set(participantId, {
                participantId,
                position,
                color: participant.color,
                displayName: participant.displayName,
            });
            return { remoteCursors: newCursors };
        }),

    removeRemoteCursor: (participantId) =>
        set((state) => {
            const newCursors = new Map(state.remoteCursors);
            newCursors.delete(participantId);
            return { remoteCursors: newCursors };
        }),

    updateRemoteSelection: (participantId, componentIds) =>
        set((state) => {
            const newSelections = new Map(state.remoteSelections);
            if (componentIds.length === 0) {
                newSelections.delete(participantId);
            } else {
                newSelections.set(participantId, componentIds);
            }
            return { remoteSelections: newSelections };
        }),

    setConnectionStatus: (isConnected, isReconnecting = false) =>
        set({ isConnected, isReconnecting }),

    reset: () => set(initialState),
}));
