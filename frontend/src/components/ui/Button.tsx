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
                    'group/btn relative inline-flex items-center justify-center rounded-md font-medium tracking-tight transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    {
                        // Variants
                        'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover focus:ring-primary':
                            variant === 'primary',
                        'border border-border bg-secondary text-secondary-foreground hover:border-border-strong hover:bg-surface-tertiary focus:ring-border':
                            variant === 'secondary',
                        'bg-transparent text-text-secondary hover:bg-surface-secondary hover:text-foreground focus:ring-border':
                            variant === 'ghost',
                        'hover:bg-error/90 bg-error text-error-foreground focus:ring-error':
                            variant === 'danger',
                        'bg-primary font-semibold text-primary-foreground shadow-glow hover:-translate-y-0.5 hover:shadow-glow-lg focus:ring-primary':
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
