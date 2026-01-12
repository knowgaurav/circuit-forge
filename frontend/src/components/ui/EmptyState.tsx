'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

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
            {icon && <div className="mb-4 text-gray-400">{icon}</div>}
            <h3 className="mb-1 text-lg font-medium text-gray-900">{title}</h3>
            {description && <p className="mb-4 max-w-sm text-sm text-gray-500">{description}</p>}
            {action && <div>{action}</div>}
        </div>
    );
}
