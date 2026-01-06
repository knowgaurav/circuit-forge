'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-foreground mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={clsx(
                        'block w-full rounded-lg border shadow-sm transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-offset-background',
                        'disabled:bg-surface-secondary disabled:cursor-not-allowed disabled:text-text-muted',
                        'px-4 py-2.5 text-sm',
                        'bg-surface text-foreground placeholder:text-text-muted',
                        error
                            ? 'border-error focus:border-error focus:ring-error'
                            : 'border-border focus:border-primary focus:ring-primary',
                        className
                    )}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    {...props}
                />
                {error && (
                    <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
