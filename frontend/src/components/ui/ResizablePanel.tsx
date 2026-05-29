'use client';

import { useState, useRef, useCallback } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { ReactNode } from 'react';

interface ResizablePanelProps {
    children: ReactNode;
    side: 'left' | 'right';
    defaultWidth?: number;
    minWidth?: number;
    maxWidth?: number;
    title?: string;
    collapsible?: boolean;
}

export function ResizablePanel({
    children,
    side,
    defaultWidth = 256,
    minWidth = 180,
    maxWidth = 400,
    title,
    collapsible = true,
}: ResizablePanelProps) {
    const [width, setWidth] = useState(defaultWidth);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsResizing(true);

            const startX = e.clientX;
            const startWidth = width;

            const handleMouseMove = (e: MouseEvent) => {
                const delta = side === 'left' ? e.clientX - startX : startX - e.clientX;
                const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + delta));
                setWidth(newWidth);
            };

            const handleMouseUp = () => {
                setIsResizing(false);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [width, side, minWidth, maxWidth]
    );

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    if (isCollapsed) {
        return (
            <div className={`flex flex-col bg-white ${side === 'left' ? 'border-r' : 'border-l'}`}>
                <button
                    onClick={toggleCollapse}
                    className="p-2 transition-colors hover:bg-gray-100"
                    title={`Expand ${title || 'panel'}`}
                >
                    {side === 'left' ? (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                    ) : (
                        <ChevronLeft className="h-4 w-4 text-gray-500" />
                    )}
                </button>
            </div>
        );
    }

    return (
        <div
            ref={panelRef}
            className={`relative flex flex-col bg-white ${side === 'left' ? 'border-r' : 'border-l'}`}
            style={{ width: `${width}px` }}
        >
            {/* Header with collapse button */}
            {(title || collapsible) && (
                <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
                    {title && <span className="text-sm font-semibold text-gray-700">{title}</span>}
                    {collapsible && (
                        <button
                            onClick={toggleCollapse}
                            className="rounded p-1 transition-colors hover:bg-gray-200"
                            title={`Collapse ${title || 'panel'}`}
                        >
                            {side === 'left' ? (
                                <ChevronLeft className="h-4 w-4 text-gray-500" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">{children}</div>

            {/* Resize handle */}
            <div
                className={`absolute bottom-0 top-0 w-1 cursor-col-resize transition-colors hover:bg-blue-400 ${
                    isResizing ? 'bg-blue-500' : 'bg-transparent'
                } ${side === 'left' ? 'right-0' : 'left-0'}`}
                onMouseDown={handleMouseDown}
            />
        </div>
    );
}
