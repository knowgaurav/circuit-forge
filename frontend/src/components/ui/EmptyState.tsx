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
        <div className={clsx('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
            {icon && (
                <div className="mb-4 text-gray-400">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>
            )}
            {action && <div>{action}</div>}
        </div>
    );
}
