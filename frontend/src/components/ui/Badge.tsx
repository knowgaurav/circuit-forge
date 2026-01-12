'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

export interface BadgeProps {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
    children: ReactNode;
    className?: string;
}

export function Badge({ variant = 'default', size = 'md', children, className }: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center rounded-full font-medium',
                {
                    // Variants
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200':
                        variant === 'default',
                    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':
                        variant === 'success',
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400':
                        variant === 'warning',
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400':
                        variant === 'danger',
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400':
                        variant === 'info',
                    // Sizes
                    'px-2 py-0.5 text-xs': size === 'sm',
                    'px-2.5 py-1 text-sm': size === 'md',
                },
                className
            )}
        >
            {children}
        </span>
    );
}
