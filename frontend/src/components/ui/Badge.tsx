'use client';

import clsx from 'clsx';

import type { ReactNode } from 'react';

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
                'inline-flex items-center rounded border font-mono font-medium uppercase tracking-wider',
                {
                    // Variants
                    'border-border bg-surface-secondary text-text-secondary': variant === 'default',
                    'border-success/30 bg-success/10 text-success': variant === 'success',
                    'border-warning/30 bg-warning/10 text-warning': variant === 'warning',
                    'border-error/30 bg-error/10 text-error': variant === 'danger',
                    'border-primary/30 bg-primary/10 text-primary': variant === 'info',
                    // Sizes
                    'px-1.5 py-0.5 text-[10px]': size === 'sm',
                    'px-2 py-0.5 text-xs': size === 'md',
                },
                className
            )}
        >
            {children}
        </span>
    );
}
