/**
 * @file useKeyboardShortcuts.ts
 * @description Hook for circuit editor keyboard shortcuts
 * @module hooks/circuit
 */

import { useEffect, useCallback } from 'react';

import { useUIStore } from '@/stores';

export interface KeyboardShortcutHandlers {
    onUndo?: () => void;
    onRedo?: () => void;
    onDelete?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetZoom?: () => void;
}

/**
 * Hook for handling keyboard shortcuts in the circuit editor
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
    const { onUndo, onRedo, onDelete, onZoomIn, onZoomOut, onResetZoom } = handlers;
    const uiStore = useUIStore();

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Skip if typing in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault();
                        if (e.shiftKey) {
                            onRedo?.();
                        } else {
                            onUndo?.();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        onRedo?.();
                        break;
                    case '=':
                    case '+':
                        e.preventDefault();
                        onZoomIn?.();
                        break;
                    case '-':
                        e.preventDefault();
                        onZoomOut?.();
                        break;
                    case '0':
                        e.preventDefault();
                        onResetZoom?.();
                        break;
                }
            } else {
                switch (e.key) {
                    case 'Delete':
                    case 'Backspace':
                        onDelete?.();
                        break;
                    case 'Escape':
                        uiStore.clearSelection();
                        uiStore.setSelectedTool('select');
                        break;
                    case 'v':
                    case 'V':
                        uiStore.setSelectedTool('select');
                        break;
                    case 'h':
                    case 'H':
                        uiStore.setSelectedTool('pan');
                        break;
                    case 'd':
                    case 'D':
                        uiStore.setSelectedTool('draw');
                        break;
                    case 'e':
                    case 'E':
                        uiStore.setSelectedTool('erase');
                        break;
                    case 'w':
                    case 'W':
                        uiStore.setSelectedTool('wire');
                        break;
                }
            }
        },
        [onUndo, onRedo, onDelete, onZoomIn, onZoomOut, onResetZoom, uiStore]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
