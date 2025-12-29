'use client';

import { useState, ReactNode } from 'react';
import clsx from 'clsx';

export interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div
            className="relative inline-block"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    className={clsx(
                        'absolute px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg',
                        'whitespace-nowrap pointer-events-none',
                        'transition-opacity duration-150',
                        {
                            'bottom-full left-1/2 -translate-x-1/2 mb-2': position === 'top',
                            'top-full left-1/2 -translate-x-1/2 mt-2': position === 'bottom',
                            'right-full top-1/2 -translate-y-1/2 mr-2': position === 'left',
                            'left-full top-1/2 -translate-y-1/2 ml-2': position === 'right',
                        }
                    )}
                    style={{ zIndex: 9999 }}
                    role="tooltip"
                >
                    {content}
                    {/* Arrow */}
                    <div
                        className={clsx('absolute w-2 h-2 bg-gray-900 rotate-45', {
                            'top-full left-1/2 -translate-x-1/2 -mt-1': position === 'top',
                            'bottom-full left-1/2 -translate-x-1/2 -mb-1': position === 'bottom',
                            'left-full top-1/2 -translate-y-1/2 -ml-1': position === 'left',
                            'right-full top-1/2 -translate-y-1/2 -mr-1': position === 'right',
                        })}
                    />
                </div>
            )}
        </div>
    );
}
