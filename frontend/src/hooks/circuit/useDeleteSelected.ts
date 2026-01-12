/**
 * @file useDeleteSelected.ts
 * @description Hook for deleting selected components
 * @module hooks/circuit
 */

import { useCallback } from 'react';
import { useCircuitStore, useUIStore } from '@/stores';

export interface UseDeleteSelectedReturn {
    hasSelection: boolean;
    selectedCount: number;
    deleteSelected: () => void;
}

/**
 * Hook for deleting selected components from the canvas
 */
export function useDeleteSelected(): UseDeleteSelectedReturn {
    const circuitStore = useCircuitStore();
    const uiStore = useUIStore();

    const deleteSelected = useCallback(() => {
        if (uiStore.selectedComponentIds.length === 0) return;
        uiStore.selectedComponentIds.forEach((id: string) => {
            circuitStore.deleteComponent(id);
        });
        uiStore.clearSelection();
    }, [circuitStore, uiStore]);

    return {
        hasSelection: uiStore.selectedComponentIds.length > 0,
        selectedCount: uiStore.selectedComponentIds.length,
        deleteSelected,
    };
}
