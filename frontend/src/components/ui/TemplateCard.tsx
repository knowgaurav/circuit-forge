'use client';

import Link from 'next/link';

import { DifficultyBadge } from './DifficultyBadge';

export interface TemplateCardProps {
    id: string;
    name: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    category: string;
    description: string;
    href?: string;
}

export function TemplateCard({
    id,
    name,
    difficulty,
    category,
    description,
    href,
}: TemplateCardProps) {
    const cardContent = (
        <div
            className="hover:border-primary/50 group relative h-full cursor-pointer overflow-hidden rounded-xl border border-border bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow"
            data-testid={`template-card-${id}`}
        >
            <div className="mb-3 flex items-center gap-2">
                <DifficultyBadge difficulty={difficulty} />
                <span
                    className="border-primary/30 bg-primary/10 rounded border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-primary"
                    data-testid="template-category"
                >
                    {category}
                </span>
            </div>
            <h3
                className="mb-2 font-heading text-lg font-bold text-foreground transition-colors group-hover:text-primary"
                data-testid="template-name"
            >
                {name}
            </h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-text-secondary">
                {description}
            </p>
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block h-full">
                {cardContent}
            </Link>
        );
    }

    return cardContent;
}

export default TemplateCard;
