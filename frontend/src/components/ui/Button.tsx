'use client';

import { forwardRef } from 'react';

import clsx from 'clsx';

import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glow';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={clsx(
                    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    {
                        // Variants
                        'hover:bg-primary/90 bg-primary text-primary-foreground shadow-sm focus:ring-primary':
                            variant === 'primary',
                        'hover:bg-secondary/80 bg-secondary text-secondary-foreground focus:ring-secondary':
                            variant === 'secondary',
                        'bg-transparent text-foreground hover:bg-surface-secondary hover:text-foreground focus:ring-border':
                            variant === 'ghost',
                        'hover:bg-error/90 bg-error text-error-foreground focus:ring-error':
                            variant === 'danger',
                        'shadow-glow hover:shadow-glow-lg bg-primary text-primary-foreground hover:-translate-y-0.5':
                            variant === 'glow',

                        // Sizes
                        'px-3 py-1.5 text-xs': size === 'sm',
                        'px-4 py-2 text-sm': size === 'md',
                        'px-6 py-3 text-base': size === 'lg',
                    },
                    className
                )}
                disabled={disabled}
                aria-disabled={disabled}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
