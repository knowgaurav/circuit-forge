'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const tooltipWidth = 200; // max-width estimate
            const tooltipHeight = 30; // estimate
            
            let x = rect.left + rect.width / 2;
            let y = rect.top;

            switch (position) {
                case 'top':
                    y = rect.top - tooltipHeight - 8;
                    break;
                case 'bottom':
                    y = rect.bottom + 8;
                    break;
                case 'left':
                    x = rect.left - tooltipWidth - 8;
                    y = rect.top + rect.height / 2;
                    break;
                case 'right':
                    x = rect.right + 8;
                    y = rect.top + rect.height / 2;
                    break;
            }

            setCoords({ x, y });
        }
    }, [isVisible, position]);

    return (
        <>
            <div
                ref={triggerRef}
                className="inline-block"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && typeof window !== 'undefined' && createPortal(
                <div
                    ref={tooltipRef}
                    className="fixed px-2 py-1.5 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none"
                    style={{
                        zIndex: 99999,
                        left: position === 'left' || position === 'right' ? coords.x : coords.x,
                        top: coords.y,
                        transform: position === 'top' || position === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)',
                    }}
                    role="tooltip"
                >
                    {content}
                </div>,
                document.body
            )}
        </>
    );
}
