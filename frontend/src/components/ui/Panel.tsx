'use client';

import clsx from 'clsx';

import type { ReactNode } from 'react';

export interface PanelProps {
    title?: ReactNode;
    children: ReactNode;
    className?: string;
    actions?: ReactNode;
}

export function Panel({ title, children, className, actions }: PanelProps) {
    return (
        <div
            className={clsx(
                'rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
                className
            )}
        >
            {(title || actions) && (
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                    {title && (
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                    )}
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className="p-4">{children}</div>
        </div>
    );
}
