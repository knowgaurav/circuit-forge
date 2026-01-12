'use client';

import Link from 'next/link';

export interface TemplateCardProps {
    id: string;
    name: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    category: string;
    description: string;
    href?: string;
}

const difficultyColors = {
    beginner: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    intermediate: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    advanced: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

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
            className="glass-card group h-full cursor-pointer p-5 transition-all duration-300 hover:scale-[1.02]"
            data-testid={`template-card-${id}`}
        >
            <div className="mb-3 flex items-center gap-2">
                <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${difficultyColors[difficulty]}`}
                    data-testid="template-difficulty"
                >
                    {difficulty}
                </span>
                <span
                    className="bg-primary/10 border-primary/20 rounded-full border px-2.5 py-1 text-xs font-medium text-primary"
                    data-testid="template-category"
                >
                    {category}
                </span>
            </div>
            <h3
                className="mb-2 text-lg font-bold text-foreground transition-colors group-hover:text-primary"
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
