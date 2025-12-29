'use client';

import clsx from 'clsx';

export interface AvatarProps {
    name: string;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Avatar({ name, color, size = 'md', className }: AvatarProps) {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div
            className={clsx(
                'inline-flex items-center justify-center rounded-full font-medium text-white',
                {
                    'w-6 h-6 text-xs': size === 'sm',
                    'w-8 h-8 text-sm': size === 'md',
                    'w-10 h-10 text-base': size === 'lg',
                },
                className
            )}
            style={{ backgroundColor: color || '#6B7280' }}
            aria-label={name}
            title={name}
        >
            {initials}
        </div>
    );
}
