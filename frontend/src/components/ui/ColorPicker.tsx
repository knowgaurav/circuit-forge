'use client';

import { Check } from 'lucide-react';
import clsx from 'clsx';

// Annotation colors from requirements
const COLORS = [
    { name: 'Black', value: '#000000' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Purple', value: '#A855F7' },
    { name: 'Brown', value: '#92400E' },
    { name: 'White', value: '#FFFFFF' },
];

export interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
    return (
        <div className={clsx('flex flex-wrap gap-1', className)} role="radiogroup" aria-label="Color picker">
            {COLORS.map((color) => (
                <button
                    key={color.value}
                    className={clsx(
                        'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                        'flex items-center justify-center',
                        value === color.value ? 'border-gray-900' : 'border-gray-300'
                    )}
                    style={{ backgroundColor: color.value }}
                    onClick={() => onChange(color.value)}
                    aria-label={color.name}
                    aria-checked={value === color.value}
                    role="radio"
                >
                    {value === color.value && (
                        <Check
                            className={clsx(
                                'w-3 h-3',
                                color.value === '#FFFFFF' || color.value === '#FFD433'
                                    ? 'text-gray-900'
                                    : 'text-white'
                            )}
                        />
                    )}
                </button>
            ))}
        </div>
    );
}
