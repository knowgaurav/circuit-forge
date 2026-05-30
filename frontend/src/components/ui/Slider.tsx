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
                            <label
                                htmlFor={sliderId}
                                className="text-sm font-medium text-foreground"
                            >
                                {label}
                            </label>
                        )}
                        {showValue && (
                            <span className="font-mono text-sm text-text-muted">{value}</span>
                        )}
                    </div>
                )}
                <input
                    ref={ref}
                    id={sliderId}
                    type="range"
                    value={value}
                    className={clsx(
                        'h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-tertiary',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
                        '[&::-webkit-slider-thumb]:appearance-none',
                        '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                        '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary',
                        '[&::-webkit-slider-thumb]:cursor-pointer',
                        '[&::-webkit-slider-thumb]:hover:bg-primary-hover',
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);

Slider.displayName = 'Slider';
