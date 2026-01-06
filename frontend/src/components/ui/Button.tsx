'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

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
                    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    {
                        // Variants
                        'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm focus:ring-primary':
                            variant === 'primary',
                        'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary':
                            variant === 'secondary',
                        'bg-transparent text-foreground hover:bg-surface-secondary hover:text-foreground focus:ring-border':
                            variant === 'ghost',
                        'bg-error text-error-foreground hover:bg-error/90 focus:ring-error':
                            variant === 'danger',
                        'bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5':
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
