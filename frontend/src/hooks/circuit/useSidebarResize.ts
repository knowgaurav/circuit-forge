/**
 * @file useSidebarResize.ts
 * @description Hook for resizable sidebar functionality
 * @module hooks/circuit
 */

import { useState, useCallback, useEffect } from 'react';

export interface UseSidebarResizeOptions {
    initialWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    side?: 'left' | 'right';
}

export interface UseSidebarResizeReturn {
    width: number;
    isResizing: boolean;
    handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Hook for managing resizable sidebar width
 */
export function useSidebarResize(options: UseSidebarResizeOptions = {}): UseSidebarResizeReturn {
    const {
        initialWidth = 256,
        minWidth = 200,
        maxWidth = 400,
        side = 'left',
    } = options;

    const [width, setWidth] = useState(initialWidth);
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        // Calculate width based on which side the sidebar is on
        let newWidth: number;
        if (side === 'left') {
            // For left sidebar, width = mouse position - toolbar width (48px)
            newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX - 48));
        } else {
            // For right sidebar, width = window width - mouse position
            newWidth = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - e.clientX));
        }
        setWidth(newWidth);
    }, [isResizing, minWidth, maxWidth, side]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
    }, []);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
        return undefined;
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return {
        width,
        isResizing,
        handleMouseDown,
    };
}
