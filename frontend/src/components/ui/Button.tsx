'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', disabled, children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={clsx(
                    'inline-flex items-center justify-center font-medium rounded-md transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    {
                        // Variants
                        'bg-circuit-primary text-white hover:bg-blue-600 focus:ring-blue-500':
                            variant === 'primary',
                        'bg-gray-100 dark:bg-[#3d3d5c] text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#4d4d6c] focus:ring-gray-500':
                            variant === 'secondary',
                        'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#3d3d5c] focus:ring-gray-500':
                            variant === 'ghost',
                        'bg-circuit-danger text-white hover:bg-red-600 focus:ring-red-500':
                            variant === 'danger',
                        // Sizes
                        'px-2.5 py-1.5 text-xs': size === 'sm',
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
