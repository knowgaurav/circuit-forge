'use client';

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon: ReactNode;
    'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ className, variant = 'ghost', size = 'md', icon, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={clsx(
                    'inline-flex items-center justify-center rounded-md transition-all duration-200',
                    'focus:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    {
                        // Variants
                        'hover:bg-primary/90 bg-primary text-primary-foreground shadow-sm hover:shadow':
                            variant === 'primary',
                        'border-border/50 border bg-surface-secondary text-foreground hover:bg-surface-elevated':
                            variant === 'secondary',
                        'bg-transparent text-text-secondary hover:bg-surface-secondary hover:text-foreground':
                            variant === 'ghost',
                        'hover:bg-error/90 hover:shadow-error/20 bg-error text-white shadow-sm':
                            variant === 'danger',
                        // Sizes
                        'p-1.5': size === 'sm',
                        'p-2.5': size === 'md',
                        'p-3.5': size === 'lg',
                    },
                    className
                )}
                disabled={disabled}
                aria-disabled={disabled}
                {...props}
            >
                {icon}
            </button>
        );
    }
);

IconButton.displayName = 'IconButton';
