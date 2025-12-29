import { create } from 'zustand';
import type { StrokeWidth } from '@/types';

export type Tool = 'select' | 'pan' | 'draw' | 'erase' | 'wire';
export type Theme = 'light' | 'dark';

interface UIStore {
    // State
    selectedTool: Tool;
    selectedColor: string;
    strokeWidth: StrokeWidth;
    selectedComponentIds: string[];
    isPanning: boolean;
    zoom: number;
    panOffset: { x: number; y: number };
    showParticipantsPanel: boolean;
    showComponentPalette: boolean;
    theme: Theme;

    // Actions
    setSelectedTool: (tool: Tool) => void;
    setSelectedColor: (color: string) => void;
    setStrokeWidth: (width: StrokeWidth) => void;
    setSelectedComponentIds: (ids: string[]) => void;
    addSelectedComponentId: (id: string) => void;
    removeSelectedComponentId: (id: string) => void;
    clearSelection: () => void;
    setIsPanning: (isPanning: boolean) => void;
    setZoom: (zoom: number) => void;
    setPanOffset: (offset: { x: number; y: number }) => void;
    toggleParticipantsPanel: () => void;
    toggleComponentPalette: () => void;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    reset: () => void;
}

const getBaseInitialState = () => ({
    selectedTool: 'select' as Tool,
    selectedColor: '#000000',
    strokeWidth: 4 as StrokeWidth,
    selectedComponentIds: [] as string[],
    isPanning: false,
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    showParticipantsPanel: true,
    showComponentPalette: true,
});

const initialState = {
    ...getBaseInitialState(),
    theme: 'light' as Theme, // Will be set by ThemeProvider on mount
};

export const useUIStore = create<UIStore>((set) => ({
    ...initialState,

    setSelectedTool: (tool) => set({ selectedTool: tool }),

    setSelectedColor: (color) => set({ selectedColor: color }),

    setStrokeWidth: (width) => set({ strokeWidth: width }),

    setSelectedComponentIds: (ids) => set({ selectedComponentIds: ids }),

    addSelectedComponentId: (id) =>
        set((state) => ({
            selectedComponentIds: state.selectedComponentIds.includes(id)
                ? state.selectedComponentIds
                : [...state.selectedComponentIds, id],
        })),

    removeSelectedComponentId: (id) =>
        set((state) => ({
            selectedComponentIds: state.selectedComponentIds.filter((i) => i !== id),
        })),

    clearSelection: () => set({ selectedComponentIds: [] }),

    setIsPanning: (isPanning) => set({ isPanning }),

    setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),

    setPanOffset: (offset) => set({ panOffset: offset }),

    toggleParticipantsPanel: () =>
        set((state) => ({ showParticipantsPanel: !state.showParticipantsPanel })),

    toggleComponentPalette: () =>
        set((state) => ({ showComponentPalette: !state.showComponentPalette })),

    toggleTheme: () => {
        const state = useUIStore.getState();
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        console.log('toggleTheme called, switching from', state.theme, 'to', newTheme);
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', newTheme);
            const html = document.documentElement;
            console.log('Before toggle - html classes:', html.className);
            html.classList.remove('light', 'dark');
            html.classList.add(newTheme);
            console.log('After toggle - html classes:', html.className);
        }
        set({ theme: newTheme });
    },

    setTheme: (theme) => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', theme);
            const html = document.documentElement;
            html.classList.remove('light', 'dark');
            html.classList.add(theme);
        }
        set({ theme });
    },

    reset: () =>
        set((state) => ({
            ...getBaseInitialState(),
            theme: state.theme, // Preserve theme on reset
        })),
}));
