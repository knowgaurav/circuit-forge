'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import clsx from 'clsx';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, label, id, checked, ...props }, ref) => {
        const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <label
                htmlFor={checkboxId}
                className={clsx('inline-flex items-center gap-2 cursor-pointer', className)}
            >
                <div className="relative">
                    <input
                        ref={ref}
                        id={checkboxId}
                        type="checkbox"
                        checked={checked}
                        className="sr-only peer"
                        {...props}
                    />
                    <div
                        className={clsx(
                            'w-4 h-4 rounded border transition-colors',
                            'peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2',
                            'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                            checked
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-white border-gray-300'
                        )}
                    >
                        {checked && (
                            <Check className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
                        )}
                    </div>
                </div>
                {label && <span className="text-sm text-gray-700">{label}</span>}
            </label>
        );
    }
);

Checkbox.displayName = 'Checkbox';
