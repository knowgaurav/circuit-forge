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
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    {
                        // Variants
                        'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow':
                            variant === 'primary',
                        'bg-surface-secondary text-foreground hover:bg-surface-elevated border border-border/50':
                            variant === 'secondary',
                        'bg-transparent text-text-secondary hover:text-foreground hover:bg-surface-secondary':
                            variant === 'ghost',
                        'bg-error text-white hover:bg-error/90 shadow-sm hover:shadow-error/20':
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
