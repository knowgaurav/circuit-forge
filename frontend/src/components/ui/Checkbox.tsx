'use client';

import { forwardRef } from 'react';

import clsx from 'clsx';
import { Check } from 'lucide-react';

import type { InputHTMLAttributes } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, id, checked, ...props }, ref) => {
        const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <label
                htmlFor={checkboxId}
                className={clsx('inline-flex cursor-pointer items-center gap-2', className)}
            >
                <div className="relative">
                    <input
                        ref={ref}
                        id={checkboxId}
                        type="checkbox"
                        checked={checked}
                        className="peer sr-only"
                        {...props}
                    />
                    <div
                        className={clsx(
                            'h-4 w-4 rounded border transition-colors',
                            'peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2',
                            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                            checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                        )}
                    >
                        {checked && (
                            <Check className="absolute left-0.5 top-0.5 h-3 w-3 text-white" />
                        )}
                    </div>
                </div>
                {label && <span className="text-sm text-gray-700">{label}</span>}
            </label>
        );
    }
);

Checkbox.displayName = 'Checkbox';
