'use client';

import { forwardRef } from 'react';

import clsx from 'clsx';

import type { InputHTMLAttributes } from 'react';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    label?: string;
    showValue?: boolean;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
    ({ className, label, showValue = true, value, id, ...props }, ref) => {
        const sliderId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {(label || showValue) && (
                    <div className="mb-1 flex items-center justify-between">
                        {label && (
                            <label htmlFor={sliderId} className="text-sm font-medium text-gray-700">
                                {label}
                            </label>
                        )}
                        {showValue && <span className="text-sm text-gray-500">{value}</span>}
                    </div>
                )}
                <input
                    ref={ref}
                    id={sliderId}
                    type="range"
                    value={value}
                    className={clsx(
                        'h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                        '[&::-webkit-slider-thumb]:appearance-none',
                        '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                        '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500',
                        '[&::-webkit-slider-thumb]:cursor-pointer',
                        '[&::-webkit-slider-thumb]:hover:bg-blue-600',
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

Slider.displayName = 'Slider';
