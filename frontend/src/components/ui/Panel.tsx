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
                'rounded-lg border border-border bg-surface shadow-glass-sm',
                className
            )}
        >
            {(title || actions) && (
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    {title && (
                        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-text-secondary">
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
