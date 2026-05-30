'use client';

import clsx from 'clsx';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type DifficultyVariant = 'tint' | 'solid' | 'outline';

export interface DifficultyBadgeProps {
    difficulty: Difficulty;
    size?: 'sm' | 'md';
    /**
     * tint    — soft color-tinted bg + color border/text (default)
     * solid   — solid difficulty-color bg + light text/bars/border
     * outline — light/surface bg + difficulty-color border/text/bars
     */
    variant?: DifficultyVariant;
    className?: string;
}

const config: Record<
    Difficulty,
    {
        label: string;
        level: number;
        // tint
        tint: string;
        // solid
        solidBg: string;
        // outline / text color
        color: string;
        bar: string;
    }
> = {
    beginner: {
        label: 'Beginner',
        level: 1,
        tint: 'border-success/30 bg-success/10 text-success',
        solidBg: 'bg-emerald-700 border-emerald-600',
        color: 'text-success border-success/60',
        bar: 'bg-success',
    },
    intermediate: {
        label: 'Intermediate',
        level: 2,
        tint: 'border-warning/30 bg-warning/10 text-warning',
        solidBg: 'bg-amber-700 border-amber-600',
        color: 'text-warning border-warning/60',
        bar: 'bg-warning',
    },
    advanced: {
        label: 'Advanced',
        level: 3,
        tint: 'border-error/30 bg-error/10 text-error',
        solidBg: 'bg-rose-800 border-rose-700',
        color: 'text-error border-error/60',
        bar: 'bg-error',
    },
};

/**
 * Difficulty shown as a signal-strength meter (1-3 bars) plus a label,
 * matching the circuit-instrument aesthetic.
 */
export function DifficultyBadge({
    difficulty,
    size = 'md',
    variant = 'solid',
    className,
}: DifficultyBadgeProps) {
    const c = config[difficulty];
    const isSm = size === 'sm';

    // Per-variant container + bar styling
    const container =
        variant === 'solid'
            ? clsx(c.solidBg, 'border text-white')
            : variant === 'outline'
              ? clsx('border bg-surface', c.color)
              : clsx('border', c.tint);

    // In solid mode bars are light; otherwise they use the difficulty color
    const filledBar = variant === 'solid' ? 'bg-white' : c.bar;
    const emptyBar = variant === 'solid' ? 'bg-white/30' : 'bg-current opacity-25';

    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1.5 rounded font-mono font-bold uppercase tracking-wider',
                isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]',
                container,
                className
            )}
            data-testid="template-difficulty"
            title={`Difficulty: ${c.label}`}
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
                            i <= c.level ? filledBar : emptyBar
                        )}
                    />
                ))}
            </span>
            {c.label}
        </span>
    );
}

export default DifficultyBadge;
