'use client';

import clsx from 'clsx';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface DifficultyBadgeProps {
    difficulty: Difficulty;
    size?: 'sm' | 'md';
    className?: string;
}

const config: Record<
    Difficulty,
    { label: string; level: number; text: string; bar: string; ring: string }
> = {
    beginner: {
        label: 'Beginner',
        level: 1,
        text: 'text-success',
        bar: 'bg-success',
        ring: 'border-success/30 bg-success/10',
    },
    intermediate: {
        label: 'Intermediate',
        level: 2,
        text: 'text-warning',
        bar: 'bg-warning',
        ring: 'border-warning/30 bg-warning/10',
    },
    advanced: {
        label: 'Advanced',
        level: 3,
        text: 'text-error',
        bar: 'bg-error',
        ring: 'border-error/30 bg-error/10',
    },
};

/**
 * Difficulty shown as a signal-strength meter (1-3 bars) plus a label,
 * matching the circuit-instrument aesthetic.
 */
export function DifficultyBadge({ difficulty, size = 'md', className }: DifficultyBadgeProps) {
    const { label, level, text, bar, ring } = config[difficulty];
    const isSm = size === 'sm';

    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 rounded border font-mono font-medium uppercase tracking-wider',
                isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]',
                ring,
                text,
                className
            )}
            data-testid="template-difficulty"
            title={`Difficulty: ${label}`}
        >
            {/* Signal-strength meter */}
            <span className="flex items-end gap-[2px]" aria-hidden="true">
                {[1, 2, 3].map((i) => (
                    <span
                        key={i}
                        className={clsx(
                            'w-[3px] rounded-[1px] transition-colors',
                            i === 1 && 'h-1.5',
                            i === 2 && 'h-2.5',
                            i === 3 && 'h-3.5',
                            i <= level ? bar : 'bg-current opacity-25'
                        )}
                    />
                ))}
            </span>
            {label}
        </span>
    );
}

export default DifficultyBadge;
