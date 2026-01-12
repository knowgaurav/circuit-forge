/**
 * @file useZoomControls.ts
 * @description Hook for canvas zoom controls
 * @module hooks/circuit
 */

import { useCallback, useState } from 'react';
import { useUIStore } from '@/stores';

const DEFAULT_ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400];

export interface UseZoomControlsOptions {
    presets?: number[];
}

export interface UseZoomControlsReturn {
    zoom: number;
    zoomPercent: number;
    presets: number[];
    showDropdown: boolean;
    setShowDropdown: (show: boolean) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    setZoomPreset: (percent: number) => void;
    resetZoom: () => void;
}

/**
 * Hook for managing canvas zoom controls
 */
export function useZoomControls(options: UseZoomControlsOptions = {}): UseZoomControlsReturn {
    const { presets = DEFAULT_ZOOM_PRESETS } = options;
    const uiStore = useUIStore();
    const [showDropdown, setShowDropdown] = useState(false);

    const zoomIn = useCallback(() => {
        const currentPercent = Math.round(uiStore.zoom * 100);
        const nextPreset = presets.find((p) => p > currentPercent);
        if (nextPreset) uiStore.setZoom(nextPreset / 100);
    }, [uiStore, presets]);

    const zoomOut = useCallback(() => {
        const currentPercent = Math.round(uiStore.zoom * 100);
        const prevPreset = [...presets].reverse().find((p) => p < currentPercent);
        if (prevPreset) uiStore.setZoom(prevPreset / 100);
    }, [uiStore, presets]);

    const setZoomPreset = useCallback((percent: number) => {
        uiStore.setZoom(percent / 100);
        setShowDropdown(false);
    }, [uiStore]);

    const resetZoom = useCallback(() => {
        uiStore.setZoom(1);
    }, [uiStore]);

    return {
        zoom: uiStore.zoom,
        zoomPercent: Math.round(uiStore.zoom * 100),
        presets,
        showDropdown,
        setShowDropdown,
        zoomIn,
        zoomOut,
        setZoomPreset,
        resetZoom,
    };
}
