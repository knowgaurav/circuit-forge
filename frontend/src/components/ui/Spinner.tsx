'use client';

import clsx from 'clsx';

export interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
    return (
        <div
            className={clsx(
                'animate-spin rounded-full border-2 border-current border-t-transparent',
                {
                    'w-4 h-4': size === 'sm',
                    'w-6 h-6': size === 'md',
                    'w-8 h-8': size === 'lg',
                },
                className
            )}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
}
