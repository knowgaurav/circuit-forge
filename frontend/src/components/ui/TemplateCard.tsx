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

export function TemplateCard({ id, name, difficulty, category, description, href }: TemplateCardProps) {
    const cardContent = (
        <div
            className="glass-card p-5 h-full transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
            data-testid={`template-card-${id}`}
        >
            <div className="flex items-center gap-2 mb-3">
                <span
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium ${difficultyColors[difficulty]}`}
                    data-testid="template-difficulty"
                >
                    {difficulty}
                </span>
                <span
                    className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium"
                    data-testid="template-category"
                >
                    {category}
                </span>
            </div>
            <h3
                className="font-bold text-lg text-foreground group-hover:text-primary transition-colors mb-2"
                data-testid="template-name"
            >
                {name}
            </h3>
            <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
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
