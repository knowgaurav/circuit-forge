/**
 * @file useCircuitExport.ts
 * @description Hook for circuit export/import functionality
 * @module hooks/circuit
 */

import { useCallback } from 'react';
import { useCircuitStore } from '@/stores';
import { exportAsPng, exportAsJson, importFromJson } from '@/services/export';
import type { CircuitState } from '@/types';

export interface UseCircuitExportOptions {
    fileNamePrefix?: string;
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
}

export interface UseCircuitExportReturn {
    exportPng: () => Promise<void>;
    exportJson: () => void;
    importJson: (file: File) => Promise<void>;
    handleImportChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

/**
 * Hook for exporting and importing circuit data as PNG or JSON
 */
export function useCircuitExport(options: UseCircuitExportOptions = {}): UseCircuitExportReturn {
    const { fileNamePrefix = 'circuit', onSuccess, onError } = options;
    const circuitStore = useCircuitStore();

    const exportPng = useCallback(async () => {
        try {
            await exportAsPng(
                circuitStore.components,
                circuitStore.wires,
                circuitStore.annotations,
                `${fileNamePrefix}.png`
            );
            onSuccess?.('Circuit exported as PNG');
        } catch {
            onError?.('Failed to export PNG');
        }
    }, [circuitStore.components, circuitStore.wires, circuitStore.annotations, fileNamePrefix, onSuccess, onError]);

    const exportJson = useCallback(() => {
        try {
            const state: CircuitState = {
                sessionId: fileNamePrefix,
                version: circuitStore.version,
                schemaVersion: '1.0.0',
                components: circuitStore.components,
                wires: circuitStore.wires,
                annotations: circuitStore.annotations,
                updatedAt: new Date().toISOString(),
            };
            exportAsJson(state, `${fileNamePrefix}.json`);
            onSuccess?.('Circuit exported as JSON');
        } catch {
            onError?.('Failed to export JSON');
        }
    }, [circuitStore, fileNamePrefix, onSuccess, onError]);

    const importJson = useCallback(async (file: File) => {
        try {
            const circuitState = await importFromJson(file);
            circuitStore.setCircuitState(circuitState);
            onSuccess?.('Circuit imported successfully');
        } catch (error) {
            onError?.(error instanceof Error ? error.message : 'Failed to import circuit');
        }
    }, [circuitStore, onSuccess, onError]);

    const handleImportChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await importJson(file);
        e.target.value = '';
    }, [importJson]);

    return {
        exportPng,
        exportJson,
        importJson,
        handleImportChange,
    };
}
