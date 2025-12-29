'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

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
                'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm',
                className
            )}
        >
            {(title || actions) && (
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    {title && (
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
                    )}
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className="p-4">{children}</div>
        </div>
    );
}
