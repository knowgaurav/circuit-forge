'use client';

import { forwardRef } from 'react';

import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
    value: string;
    label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: SelectOption[];
    error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, label, options, error, id, ...props }, ref) => {
        const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={selectId}
                        className="mb-1 block text-sm font-medium text-foreground"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        id={selectId}
                        className={clsx(
                            'block w-full appearance-none rounded-md border shadow-sm transition-colors',
                            'focus:outline-none focus:ring-2 focus:ring-offset-0',
                            'disabled:cursor-not-allowed disabled:bg-surface-secondary',
                            'bg-surface px-3 py-2 pr-10 text-sm text-foreground',
                            error
                                ? 'border-error focus:border-error focus:ring-error'
                                : 'border-border focus:border-primary focus:ring-primary',
                            className
                        )}
                        aria-invalid={error ? 'true' : 'false'}
                        {...props}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                </div>
                {error && <p className="mt-1 text-sm text-error">{error}</p>}
            </div>
        );
    }
);

Select.displayName = 'Select';
