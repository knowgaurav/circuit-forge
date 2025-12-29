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
                    'inline-flex items-center justify-center rounded-md transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    {
                        // Variants
                        'bg-circuit-primary text-white hover:bg-blue-600 focus:ring-blue-500':
                            variant === 'primary',
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-500':
                            variant === 'secondary',
                        'bg-transparent text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500':
                            variant === 'ghost',
                        'bg-circuit-danger text-white hover:bg-red-600 focus:ring-red-500':
                            variant === 'danger',
                        // Sizes
                        'p-1': size === 'sm',
                        'p-2': size === 'md',
                        'p-3': size === 'lg',
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
