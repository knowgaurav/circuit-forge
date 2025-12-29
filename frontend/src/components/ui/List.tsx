'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

export interface ListItemProps {
    children: ReactNode;
    onClick?: () => void;
    selected?: boolean;
    className?: string;
}

export function ListItem({ children, onClick, selected, className }: ListItemProps) {
    const Component = onClick ? 'button' : 'div';

    return (
        <Component
            className={clsx(
                'w-full px-4 py-2 text-left transition-colors',
                onClick && 'hover:bg-gray-50 cursor-pointer',
                selected && 'bg-blue-50',
                className
            )}
            onClick={onClick}
        >
            {children}
        </Component>
    );
}

export interface ListProps {
    children: ReactNode;
    className?: string;
}

export function List({ children, className }: ListProps) {
    return (
        <div
            className={clsx(
                'bg-white rounded-lg border border-gray-200 divide-y divide-gray-200 overflow-hidden',
                className
            )}
            role="list"
        >
            {children}
        </div>
    );
}
