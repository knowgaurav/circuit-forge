'use client';

import clsx from 'clsx';

import type { ReactNode } from 'react';

export interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div
            className={clsx(
                'flex flex-col items-center justify-center px-4 py-12 text-center',
                className
            )}
        >
            {icon && <div className="mb-4 text-text-muted">{icon}</div>}
            <h3 className="mb-1 text-lg font-medium text-foreground">{title}</h3>
            {description && <p className="mb-4 max-w-sm text-sm text-text-muted">{description}</p>}
            {action && <div>{action}</div>}
        </div>
    );
}
